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
 *     the answer to the bugfix ticket in ten seconds. One commit, nothing to
 *     read.
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

/**
 * Everything the candidate needs, and nothing else. An entry is either a name
 * copied as-is, or { from, to } when the path differs in the snapshot.
 */
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
  // The three tickets ship with the clone, at the root, so the candidate reads
  // them in order without anything being copied by hand.
  { from: join('interview', 'tickets'), to: 'tickets' },
];

/** Known to stay behind. Anything outside both lists is reported, not guessed. */
const KEEP_BACK = ['interview', 'scripts', 'node_modules', '.git', '.claude', '.env', 'data'];

/** Where the published tickets live in the snapshot. */
const TICKETS = 'tickets';

/**
 * Last line of defence, in two layers.
 *
 * ALWAYS applies to every published file: the correction grid must never
 * travel, wherever it is quoted from.
 *
 * APP_ONLY applies to everything except the tickets. The tickets legitimately
 * carry the figure Finance reported and are named after the exercise — that is
 * the point of them. The same strings inside the application would mean the
 * interview material has bled into the code, which is what this catches.
 */
const ALWAYS = [
  { pattern: /grille[- ]de[- ]correction/i, what: 'the correction grid' },
  { pattern: /answer key|corrig[ée]/i, what: 'an answer key' },
  { pattern: /interview\/(?!tickets)/i, what: 'a path inside interview/' },
];

const APP_ONLY = [
  { pattern: /\d-(FEATURE|BUGFIX)-/, what: 'a ticket filename' },
  { pattern: /1[\s,.]?846[\s,.]?800/, what: 'the expected total of ticket 2' },
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

const sourceOf = (entry) => (typeof entry === 'string' ? entry : entry.from);
const targetOf = (entry) => (typeof entry === 'string' ? entry : entry.to);

function reportUnknownEntries() {
  // Compared on top-level names: an entry reaching into a subdirectory, such
  // as interview/tickets, leaves its parent in KEEP_BACK.
  const known = new Set([...PUBLISH.map((e) => sourceOf(e).split(sep)[0]), ...KEEP_BACK]);
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

    const where = relative(snapshot, file);
    const isTicket = where.split(sep)[0] === TICKETS;
    const patterns = isTicket ? ALWAYS : [...ALWAYS, ...APP_ONLY];

    for (const { pattern, what } of patterns) {
      if (pattern.test(content)) {
        offenders.push(`${where} — ${what}`);
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
  const missing = PUBLISH.map(sourceOf).filter((from) => !existsSync(join(root, from)));
  if (missing.length) {
    throw new Error(`missing from the repository: ${missing.join(', ')}`);
  }

  for (const entry of PUBLISH) {
    cpSync(join(root, sourceOf(entry)), join(snapshot, targetOf(entry)), { recursive: true });
  }

  const files = walk(snapshot);
  const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);

  console.log(`\n  Snapshot   ${files.length} files, ${Math.round(bytes / 1024)} KB`);
  console.log(`  Target     ${remote}`);
  console.log(`  Branch     main, single commit, force-pushed`);
  console.log('\n  Published:');
  PUBLISH.forEach((entry) =>
    console.log(
      typeof entry === 'string' ? `    ${entry}` : `    ${entry.to}  (from ${entry.from})`
    )
  );

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
