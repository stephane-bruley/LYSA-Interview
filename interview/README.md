# Preparing and running the interview

> Internal directory. **It must not end up on the candidate's laptop.**

## Publishing the candidate repository

The candidate never clones this repository. They clone
`LYSA-Interview-Candidat`, which is a **regenerated snapshot** of the
application alone, pushed as **a single commit**.

That single commit is not a convenience, it is a condition for the exercise to
work: with a real history, `git log -p src/pricing.js` hands over the answer to
ticket 2 in ten seconds.

The remote repository already exists, and it is **public** — the candidate
works on the recruiter's laptop, so there is no access to grant and none to
revoke. The public repository is there to re-provision the laptop, not for the
candidate.

Every time the application changes:

```bash
npm run publish-candidate -- --dry-run   # what would go out, pushing nothing
npm run publish-candidate                # asks for PUBLISH before overwriting
```

The script publishes an explicit allow-list (`src`, `public`, `db`, `test`, the
tickets and the configuration files) and refuses to push if it finds any trace
of the internal material in the snapshot — a mention of the grading grid, or
the total Finance expects appearing inside `src/` or `test/`. Any file added at
the root of the repository stays excluded until someone deliberately adds it to
the list.

A different target: `npm run publish-candidate -- --remote=<url>`, or the
`CANDIDATE_REPO` variable.

**Assume the exercise is already known.** The repository being public, it is
indexable: a candidate searching for the company name can land on
`src/pricing.js` and prepare ticket 2 in advance. That is why there are three
scenarios on three different grounds, and why a fourth will be needed — sooner
than in six months.

The signal survives preparation largely intact: ticket 1 cannot be prepared
(what we observe is whether they ask the question), and on tickets 2 and 3 what
we look at is the method and the prompts, not the discovery. But if a candidate
arrives knowing exactly where the bug is without ever having started the
application, you will see it — ask them to reproduce it in front of you.

## Preparing the laptop, the day before

Fifteen minutes of failed setup on the day teaches you nothing about the
candidate and eats your slot. Everything must already be running when they sit
down.

Clone the **candidate repository**, never this one:

```bash
git clone https://github.com/stephane-bruley/LYSA-Interview-Candidat.git lysa-orders
cd lysa-orders
npm install
npm run db:init   # container, schema, demo data — once
npm start         # http://localhost:4000
```

`npm start` brings up the container and holds the terminal; Ctrl-C stops both
the server and the container. Leave it running. In a second terminal:

```bash
npm test          # 12 tests, all green
```

On an empty database `npm start` refuses and points at `npm run db:reset`,
which is why `db:init` comes first. Nothing writes to the database behind your
back.

Remove the remote, so they can neither push to you nor trace their way back to
the original:

```bash
git remote remove origin
```

Open VS Code on the directory, check that Claude Code answers, leave the
application running in one window with the browser open. Turn off screen
sharing of your own notes.

The three tickets are **already in the clone**, under `tickets/`, numbered in
the order they should work through them:

```
tickets/1-FEATURE-archive-inactive-customers.md
tickets/2-BUGFIX-invoice-total.md
tickets/3-FEATURE-export-orders-csv.md
```

Nothing to copy. The candidate repository's README points at them and asks them
not to open the next one until you say so — say it out loud as well, the
time-box only means something while they do not yet know what is coming.

**What this changes during the session.** With the tickets in the repository,
Claude Code can read ticket 2 while they work on 1 or 3 and fix the invoicing
bug on its own, without the candidate having asked. That costs nothing on
ticket 1, but on **ticket 3** it muddies the reading: the CSV export is
supposed to reuse `orderTotal`, and if the calculation has already been
rewritten by then you can no longer tell whether the candidate reused the right
function. Two habits: look at `git diff src/pricing.js` before starting ticket
3, and if the file has moved without them telling you, ask what they changed
there and why. The answer is informative either way.

## Running order, about 2 hours

| | Time | |
| --- | --- | --- |
| Getting oriented | 10 min | They start the app, open the code, find their way. Let them explore alone. |
| **1** · Archiving feature | 15 min | The signal lands in the first five minutes. |
| **2** · Invoicing bugfix | 40 min | The longest. Cut it at 40 minutes whatever happens. |
| **3** · CSV export feature | 45 min | The one that best tests the testing instinct. |
| Review | 20 min | Their diff, their doubts. This is where you take notes. |

If you only have 1 h 15: **ticket 2 alone plus the review**. It covers the
most. If you need to cut: ticket 1 fits in 10 minutes and can be folded into
the opening of ticket 3.

## The three rules during the session

**Time-box without negotiating.** With Claude Code, the gap between a good
candidate and a weak one does not show up as "finished / not finished", it
shows up in the first half hour. A candidate who has not reproduced the ticket
2 bug in 20 minutes has already told you everything. Cut and move on.

**Never say how many problems there are.** Otherwise they count instead of
reading.

**Stay silent at the start of each ticket.** The first two minutes of silence
teach you more than any question. If they get stuck, unblock one notch at a
time — the hints are in the grid.

Interview in English: it is the working language, and stating a problem
precisely in writing is part of the job.

## What we measure

Not speed, not the number of tickets finished. Three things:

1. **What they do before reaching for the AI** — reproduce, read the spec, ask
   a question when the ticket is vague.
2. **Their prompts** — the daily gesture of the job, observed in real
   conditions rather than by proxy.
3. **What they do with the result** — do they re-read the diff, can they say
   what they are unsure about.

The detailed grid, ticket by ticket, with the exact causes and the questions
that settle it: [grading-grid.md](grading-grid.md).

## Resetting between two candidates

With `npm start` stopped:

```bash
git checkout . && git clean -fd   # their code, gone
npm run db:reset                  # their data, gone — needs the container up
```

`db:reset` needs the database running, so either leave `npm start` up in
another terminal, or `npm run db:up` first and `npm run db:down` after.
