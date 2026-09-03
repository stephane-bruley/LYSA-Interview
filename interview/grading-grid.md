# Grading grid

> Not to be given to the candidate.

What we measure is not "did they finish". With Claude Code, almost everyone
finishes. What we measure is **what they do before they reach for the AI**, and
**what they do with what it hands back**.

Three signals that cut across all three tickets:

- **Do they run the application?** Or do they only read the code.
- **Their prompts.** "fix the bug" against a prompt that states the symptom,
  the business rule and the constraint. This is the best predictor for the job.
- **Do they re-read the diff?** Or do they accept it and move on.

---

## 1 · Feature — Archive inactive customers

**The trap:** the word **inactive** is defined nowhere. Not in the ticket, not
in the schema, not in the code. There is no column, no rule, no precedent.

Further silences in the ticket: what happens to a customer with an `open`
order? (Red River Logistics has one, 250 days old.) Can archiving be undone?
What does the operator see if part of the selection fails?

**The signal lands in the first five minutes.**

| | |
| --- | --- |
| **Excellent** | They ask before writing anything, and propose a definition to confirm: "no order in the last 12 months and no open order — is that right?" |
| **Good** | They implement, but they write their assumption down and raise it with you unprompted at the end. |
| **Weak** | They let Claude Code pick a definition, ship it, and cannot tell you which rule was applied. |
| **Reject** | They archive the selected ids with no inactivity check at all. The central word of the ticket was ignored. |

**Answer if asked** — but note who asked: "inactive means no order in the last
12 months. A customer with an open order must not be archived."

**Also watch:** "in bulk" means N updates. A loop with one `await` per customer
passes; a single `update ... where id = any($1)` is the right answer. Ask them
what happens if customer 3 of 10 fails.

---

## 2 · Bugfix — Wrong total on SO-1043

**The cause:** in `src/pricing.js`, VAT is computed on `afterVolume`, that is
**before** the contract discount, while rule 3 written at the top of the file
says VAT applies last, on the discounted total.

```js
const vat = afterVolume * VAT_RATE;              // wrong
const total = afterVolume - contractDiscount + vat;
```

```js
const taxable = afterVolume - contractDiscount;  // correct
const vat = taxable * VAT_RATE;
const total = taxable + vat;
```

The gap is exactly `afterVolume × 8 % × contract_rate`.

**The pattern to discover:** only the orders of customers with a contract
discount are wrong. 8 orders out of 14 are correct — which is why Finance says
"the others seemed fine". A candidate who compares several orders finds the
pattern *before* opening the code, and then knows exactly what to look for.

| | |
| --- | --- |
| **Excellent** | Reproduces, isolates the pattern (contract discount > 0), reads rule 3 in the file, fixes it, and writes a test they check red before / green after. |
| **Good** | Finds the cause by reading the code, fixes it correctly, tests it. |
| **Weak** | Asks Claude Code to "fix the pricing bug" and accepts the first patch without having reproduced anything. |
| **Reject** | Fixes the symptom (touches `Math.round`, or adjusts `total` without touching `vat`), or changes the expected number instead of the code. |

**The question that settles it, asked at the end:** *"if you revert your fix,
does your test go red?"* A test written with `contractDiscountRate: 0` passes
either way and proves nothing. Have them do it in front of you, it takes thirty
seconds.

**Also check** that the 5 existing tests in `pricing.test.js` are still green
after their fix — they are, all of them use a contract rate of 0.

---

## 3 · Feature — Export orders as CSV

**The trap:** the customer **`Nguyen Trading, Ltd`** contains a comma. A naive
implementation doing `values.join(',')` produces a CSV shifted by one column —
and that only shows if you open the file, or if you test with that customer.
They have 3 orders in the demo data, so the bug is immediately visible to
anyone who checks their own work.

The ticket says "the file opens correctly in Excel" without saying how: quotes
have to be escaped, and a UTF-8 BOM is needed for Vietnamese characters to
display.

| | |
| --- | --- |
| **Excellent** | Escapes correctly, tests with a name containing a comma, reuses `orderTotal` instead of recomputing, and opens the file to check. |
| **Good** | Escapes correctly, but their test only uses a simple name. |
| **Weak** | `join(',')`, a passing test, an invisible bug. The file is broken for 3 orders out of 14. |
| **Reject** | Recomputes the total in the export instead of calling `orderTotal` — two sources of truth for the same figure, and the bug from ticket 2 becomes invisible in the export. |

**Ask for this:** *"export Nguyen Trading, Ltd for me and open the file."*

---

## After the three tickets

Twenty minutes of review with them. One instruction: **"walk me through your
diff and tell me what you would push to production without hesitating, and what
you have doubts about."**

A candidate with no doubts about code they did not write is the profile that
costs you money. A candidate who tells you "this part I took as-is from Claude
and I am not sure I understand why it works" is being honest, and can be
trained.
