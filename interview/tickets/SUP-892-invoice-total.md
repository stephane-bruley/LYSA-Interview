# SUP-892 — Wrong total on order SO-1043

**Reporter:** Finance, through support · **Priority:** high

Finance checked order **SO-1043** against their spreadsheet before sending the
invoice.

- The application shows **1,862,000 ₫**
- Their spreadsheet says **1,846,800 ₫**

That is **15,200 ₫ too much**, and the customer would have been overcharged.

They add: *"We looked at a few other orders and those seemed fine, so we are not
sure what is going on."*

The test suite is green.

## What we expect from you

1. Reproduce the problem.
2. Find the cause.
3. Fix it.
4. Add a test that would have caught it — and make sure it fails before your
   fix and passes after.

The pricing rules agreed with Finance are written at the top of
`src/pricing.js`.
