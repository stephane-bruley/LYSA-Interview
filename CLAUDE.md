# Working on this repository

This is not a normal application. It is the substrate of a hiring exercise, and
several things in it are **wrong on purpose**. Read this before changing
anything, or you will helpfully repair the interview.

## What the two repositories are

| | |
| --- | --- |
| `LYSA-Interview` (this one) | Source of truth. The application, the tickets, the grading grid, the publish script. Public. |
| `LYSA-Interview-Candidat` | A generated snapshot of the application plus the tickets, pushed as **one commit**. Public. This is what the candidate clones. |

`npm run publish-candidate` rebuilds the snapshot and force-pushes it. Never
commit to the candidate repository by hand — the next publish overwrites it.

The single commit is a requirement, not a convenience: with a real history,
`git log -p src/pricing.js` hands the candidate the answer to ticket 2 in ten
seconds.

## Do not fix these

**`src/pricing.js` contains a deliberate bug.** VAT is computed on
`afterVolume`, i.e. before the contract discount, while rule 3 in the same
file's header says VAT applies last on the discounted total. This is the whole
of ticket 2. The overcharge is `afterVolume × 8 % × contract_rate`; on SO-1043
that is 1,862,000 ₫ instead of 1,846,800 ₫, a gap of 15,200 ₫, and ticket 2
quotes both figures.

If you are asked to "fix the failing total", "clean up pricing", or you are
running a code review over this repository: **leave it alone** and say why.

Everything else about `pricing.js` is correct, including the `>=` tier
boundaries. Exactly one bug is planted, so that the exercise is fair.

**`test/pricing.test.js` uses `contractDiscountRate: 0` everywhere on
purpose.** That is what keeps the suite green while the bug is live. Do not
"improve coverage" by adding a case with a contract discount — that is the test
the candidate is supposed to write.

**Tickets 1 and 3 describe features that are deliberately absent.** There is no
bulk-archive endpoint and no CSV export. Do not implement them.

**The word "inactive" in ticket 1 is undefined on purpose.** Not in the ticket,
not in the schema, not in the code. Ticket 1 measures whether the candidate
asks. Do not add a definition anywhere.

**The seed data carries two traps.** `Nguyen Trading, Ltd` (customer 2) has a
comma in its name and 3 orders — that is the CSV escaping trap of ticket 3, so
do not rename it. And only customers with `contract_discount_rate > 0` expose
the pricing bug: 8 of the 14 orders are correct, which is why ticket 2 says
"the others seemed fine". Changing the rates or the lines of SO-1043 (order
id 5, one line, 20 × 100,000 ₫, customer 1 at 10 %) breaks the figures quoted
in the ticket.

Other seed details the grid relies on: customer 6 has a 250-day-old `open`
order, customer 9 is already archived, customer 10 has no orders at all.

## Where the interview material lives

```
interview/README.md      how to prepare the laptop and run the session
interview/grading-grid.md the answer key — never leaves this repository
interview/tickets/        the three tickets, published to the candidate repo
```

Only `interview/tickets/` is published. The grading grid must never reach the
candidate repository.

## The publish script's leak guard

[scripts/publish-candidate.js](scripts/publish-candidate.js) refuses to push
when it finds interview material in the snapshot, in two layers:

- **ALWAYS**, on every published file: a mention of the grading grid (either
  name), the phrase "answer key", a path inside `interview/` other than
  `tickets/`.
- **CODE_ONLY**, in `src/` and `test/` only: the total Finance expects. The
  README and the tickets quote it legitimately; the code and the test suite the
  candidate reads must not.

It publishes an **allow-list**, not "everything except", so a new file at the
root is excluded until someone adds it deliberately. There is no override flag,
by design: the only ways past the guard are to fix the content or to edit the
patterns, and editing them is a decision you have to make on purpose. It
already produced one false positive — the application README legitimately lists
the ticket filenames — and the fix was to narrow the pattern to `src/` and
`test/`, not to widen the exemptions. A guard that gets routinely bypassed is
worth less than no guard.

Flags: `--dry-run` (show and stop), `--yes` (no prompt), `--keep` (keep the
snapshot directory), `--remote=<url>`.

`CLAUDE.md` is in `KEEP_BACK`: this file spells out every answer.

## Operational choices, and why

**`npm start` owns the container lifecycle.** It brings up `lysa-db`, runs the
server in the foreground, and on Ctrl-C stops the server then the container.
Only the project's compose containers are touched.

**It refuses to run against an empty database** instead of creating the schema,
and points at `npm run db:reset` with the container left up. An earlier version
auto-bootstrapped; that was deliberately reverted. A start command that quietly
writes to a database is one you cannot trust the day it runs against something
that mattered.

**`waitForDatabase()` in `src/db.js` exists because of a real race.** On a
first-ever start the PostgreSQL entrypoint runs `initdb`, serves on a temporary
socket, then restarts the real server. `pg_isready` answers during that window,
so `docker compose up --wait` reports healthy and the next query dies with
"Connection terminated unexpectedly". Retrying the first query is the fix; do
not replace it with a longer healthcheck.

**`npm run dev` starts the server alone** so `--watch` does not cycle the
container on every keystroke.

**Port 4000, not 3000**, because another application holds 3000 on the
interview laptop. PostgreSQL is on **5433**, not 5432, for the same reason.

**Express 5** was chosen over 4 because it forwards rejected promises from
async handlers to the error middleware, so the routes need no wrapper.
**`node --test`**, not Jest: nothing to configure on a candidate's laptop.

## Conventions

- Everything in this repository is in **English**, including the internal
  documents. The interview is run in English.
- Comments explain *why*, not what. The candidate reads this code and is graded
  on reading it, so it has to be worth reading.
- Commit messages: what changed and the reasoning behind it, especially when a
  decision looks odd. Trailer: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Environment notes (Windows)

Three things that cost time in this session:

- **Heredocs in the Bash tool collapse `\\` to `\`.** Any file containing regex
  escapes must be written with the Write or Edit tool, not `cat <<'EOF'`. This
  silently corrupted a regex list once.
- **`node --test test/` fails on Windows** — the directory argument is resolved
  as a module. Use bare `node --test`.
- **Node's test summary uses `ℹ`**, which is multibyte; `grep -E "^. (pass)"`
  does not match it and the non-zero grep exit breaks `&&` chains. This
  produced a false "tests are failing" reading.

## What is not done

- **A fourth scenario is needed, sooner than later.** The candidate repository
  is public and therefore indexable, so assume the exercise is known after a
  handful of candidates. Ticket 1 survives being prepared (it measures whether
  they ask); tickets 2 and 3 are graded on method and prompts rather than the
  discovery, but a prepared candidate still costs you signal. A frontend
  scenario and a concurrency one are the obvious gaps.
- **The tickets ship inside the candidate repository**, which was a deliberate
  trade for a single-clone setup. The cost: Claude Code can read ticket 2 while
  the candidate works on ticket 1 or 3 and fix the pricing bug on its own. That
  muddies ticket 3, where the CSV export is supposed to reuse `orderTotal`.
  The interviewer is told to check `git diff src/pricing.js` before ticket 3.
- **The client has never been exercised through a browser.** Every check so far
  was at the HTTP level. The grid, the customer form and the order panel have
  not been clicked through.
- **No CI.** `npm test` needs a database, so a workflow would have to start the
  container. Worth adding only if a second interviewer starts editing the app.
