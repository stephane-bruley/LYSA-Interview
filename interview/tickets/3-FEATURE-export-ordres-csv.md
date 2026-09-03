# 3 · Feature — Export a customer's orders as CSV

**Reporter:** Operations · **Priority:** medium

Operations regularly have to send a customer's order history to that customer's
accountant. Today they copy the screen by hand.

Add an **Export CSV** button on the customer form. It downloads the orders of
that customer as a CSV file.

## Columns, in this order

```
reference, date, status, customer, total
```

- `date`: `YYYY-MM-DD`
- `total`: the total the application displays, in dong, with no thousands
  separator and no currency symbol
- one header row, then one row per order, most recent first

## Acceptance

- The file opens correctly in Excel.
- Exporting a customer with no order produces a file with only the header row.

## Definition of done

**Write the tests together with the implementation.** A pull request without
tests will not be reviewed.
