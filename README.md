# LYSA Orders

A small back-office for B2B orders: customers, orders, and the pricing rules
agreed with Finance.

- **Server** — Node.js, Express, PostgreSQL
- **Client** — plain HTML and JavaScript, no framework, no build step
- **Tests** — the Node built-in test runner, nothing to configure

## Getting started

You need Node 22 or later and Docker.

```bash
npm install
npm run db:up      # starts PostgreSQL in a container, on port 5433
npm run db:reset   # creates the schema and loads the demo data
npm start          # http://localhost:4000
```

```bash
npm test           # unit tests + API tests (the database must be running)
npm run dev        # same as start, restarts on file change
```

If you already run PostgreSQL yourself, skip `db:up` and point the application
at your own database:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/mydb npm start
```

Copy `.env.example` to `.env` to make that permanent.

## What the application does

**Customers** — a searchable grid, a form to create, update and delete a
customer. A customer with orders cannot be deleted, only archived. Archived
customers are hidden from the default list.

**Orders** — a grid of orders with their totals, and a detail panel showing the
lines and the breakdown of the calculation.

**Pricing** — the interesting part, in [`src/pricing.js`](src/pricing.js):

1. Volume discount, per line: 5 % from 10 units, 10 % from 50, 15 % from 100.
2. The customer's contract discount applies after the volume discount.
3. VAT 8 % is applied last, on the discounted total.
4. Amounts are in dong and rounded to the dong.

## Layout

```
src/
  server.js        starts the HTTP server
  app.js           builds the Express application
  db.js            the PostgreSQL pool
  pricing.js       the pricing rules
  routes/
    customers.js   /api/customers
    orders.js      /api/orders
public/            the client: index.html, app.js, styles.css
db/
  schema.sql       tables
  seed.sql         demo data
  reset.js         npm run db:reset
test/              node --test
```

## API

| | |
| --- | --- |
| `GET /api/customers?search=&includeArchived=` | list, archived hidden by default |
| `GET /api/customers/:id` | one customer, with its order count |
| `POST /api/customers` | create |
| `PUT /api/customers/:id` | update, fields are optional |
| `DELETE /api/customers/:id` | refused with a 409 if the customer has orders |
| `GET /api/orders?customerId=` | list, totals included |
| `GET /api/orders/:id` | one order, with its lines and its totals |
| `GET /api/products` | the catalogue |

Amounts are integers, in dong. Rates are percentages: `contractDiscountRate: 10`
means 10 %.
