/**
 * Publishes the candidate snapshot to a second GitHub repository.
 *
 *   npm run publish-candidate -- --dry-run    # show what would be published
 *   npm run publish-candidate                 # asks for confirmation
 *   npm run publish-candidate -- --yes        # no prompt (CI, scripting)
 *
 * The snapshot is rebuilt from scratch every time and pushed as a SINGLE
 * commit, force-overwriting the candidate repository. That is deliberate:
 *
 *   - `git log -p src/pricing.js` in a real history would hand the candidate
 *     the answer to SUP-892 in ten seconds. One commit, nothing to read.
 *   - Nothing depends on the candidate repository's history, so rewriting it
 *     costs nothing and cannot be half-done.
 *
 * What gets published is an explicit allow-list, not "everything except".
 * The failure mode of this script is leaking the answer key, so a new file is
 * excluded until someone deliberately adds it below.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Everything the candidate needs to run the application, and nothing else. */
const PUBLISH = [
  'src',
  'public',
  'db',
  'test',
  'package.json',
  'package-lock.json',
  'docker-compose.yml',
  '.env.example',
  '.gitignore',
  'README.md',
];

/** Known to stay behind. Anything outside both lists is reported, not guessed. */
const KEEP_BACK = ['interview', 'scripts', 'node_modules', '.git', '.env', 'data'];

/**
 * Last line of defence. If any of these ever reaches the snapshot, something
 * from the interview material has been copied into the application by mistake.
 */
const LEAKS = [
  { pattern: /interview\//i, what: 'a path inside interview/' },
  { pattern: /grille[- ]de[- ]correction/i, what: 'the correction grid' },
  { pattern: /\b(SUP-892|OPS-214|OPS-231)\b/, what: 'a ticket reference' },
  { pattern: /1[\s,.]?846[\s,.]?800/, what: 'the expected total of SUP-892' },
  { pattern: /answer key|corrig[ée]/i, what: 'an answer key' },
];

// ------------------------------------------------------------------- args

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name) =>
  args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);

const dryRun = has('--dry-run');
const assumeYes = has('--yes');
const keepSnapshot = has('--keep');

const git = (cwd, ...cmd) =>
  execFileSync('git', cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function resolveRemote() {
  const explicit = valueOf('--remote') || process.env.CANDIDATE_REPO;
  if (explicit) return explicit;

  const origin = git(root, 'remote', 'get-url', 'origin');
  const owner = origin.match(/[:/]([^/]+)\/[^/]+?(\.git)?$/)?.[1];
  if (!owner) throw new Error(`cannot derive the owner from origin: ${origin}`);

  return `https://github.com/${owner}/LYSA-Interview-Candidat.git`;
}

// ---------------------------------------------------------------- helpers

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found;
}

function reportUnknownEntries() {
  const known = new Set([...PUBLISH, ...KEEP_BACK]);
  const unknown = readdirSync(root).filter((entry) => !known.has(entry));

  if (unknown.length > 0) {
    console.log('\n  Not published, because they are in neither list:');
    unknown.forEach((entry) => console.log(`    ${entry}`));
    console.log('  Add them to PUBLISH or KEEP_BACK in scripts/publish-candidate.js.');
  }
}

function scanForLeaks(snapshot) {
  const offenders = [];

  for (const file of walk(snapshot)) {
    if (file.includes(`${sep}.git${sep}`)) continue;

    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue; // binary, not our problem
    }

    for (const { pattern, what } of LEAKS) {
      if (pattern.test(content)) {
        offenders.push(`${relative(snapshot, file)} — ${what}`);
      }
    }
  }

  return offenders;
}

async function confirm(remote, fileCount) {
  if (assumeYes) return true;

  if (!process.stdin.isTTY) {
    console.error('\n  Not a terminal: re-run with --yes to publish without a prompt.\n');
    return false;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\n  This force-overwrites ${remote}\n  with ${fileCount} files as a single commit.\n\n  Type PUBLISH to continue: `
  );
  rl.close();

  return answer.trim() === 'PUBLISH';
}

// ------------------------------------------------------------------- main

const remote = resolveRemote();
const snapshot = mkdtempSync(join(tmpdir(), 'lysa-candidate-'));
let published = false;

try {
  const missing = PUBLISH.filter((entry) => !existsSync(join(root, entry)));
  if (missing.length) {
    throw new Error(`missing from the repository: ${missing.join(', ')}`);
  }

  for (const entry of PUBLISH) {
    cpSync(join(root, entry), join(snapshot, entry), { recursive: true });
  }

  const files = walk(snapshot);
  const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);

  console.log(`\n  Snapshot   ${files.length} files, ${Math.round(bytes / 1024)} KB`);
  console.log(`  Target     ${remote}`);
  console.log(`  Branch     main, single commit, force-pushed`);
  console.log('\n  Published:');
  PUBLISH.forEach((entry) => console.log(`    ${entry}`));

  reportUnknownEntries();

  const leaks = scanForLeaks(snapshot);
  if (leaks.length > 0) {
    console.error('\n  REFUSING TO PUBLISH — interview material found in the snapshot:');
    leaks.forEach((leak) => console.error(`    ${leak}`));
    console.error('');
    process.exitCode = 1;
  } else if (dryRun) {
    console.log('\n  Leak scan clean. Dry run, nothing pushed.\n');
  } else if (await confirm(remote, files.length)) {
    git(snapshot, 'init', '--initial-branch=main', '--quiet');
    git(snapshot, 'add', '.');
    git(snapshot, '-c', 'user.name=LYSA', '-c', 'user.email=hr@lysa.vn', 'commit', '--quiet', '-m', 'Initial commit');
    git(snapshot, 'remote', 'add', 'origin', remote);
    git(snapshot, 'push', '--force', '--quiet', 'origin', 'main');

    published = true;
    console.log(`\n  Published to ${remote}\n`);
  } else {
    console.log('\n  Cancelled, nothing pushed.\n');
  }
} catch (err) {
  console.error(`\n  Publication failed: ${err.message}`);
  if (err.stderr) console.error(String(err.stderr).trim());
  console.error('');
  process.exitCode = 1;
} finally {
  if (keepSnapshot || (!published && process.exitCode === 1)) {
    console.log(`  Snapshot kept at ${snapshot}\n`);
  } else {
    rmSync(snapshot, { recursive: true, force: true });
  }
}
