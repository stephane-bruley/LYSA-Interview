drop table if exists order_lines;
drop table if exists orders;
drop table if exists products;
drop table if exists customers;

create table customers (
  id serial primary key,
  name text not null,
  email text not null unique,
  -- contract discount negotiated with the customer, in percent (0 to 20)
  contract_discount_rate numeric(5, 2) not null default 0
    check (contract_discount_rate >= 0 and contract_discount_rate <= 20),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table products (
  id serial primary key,
  sku text not null unique,
  name text not null,
  -- all amounts are in dong (VND), which has no minor unit: integers only
  unit_price integer not null check (unit_price > 0)
);

create table orders (
  id serial primary key,
  reference text not null unique,
  customer_id integer not null references customers (id),
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

create table order_lines (
  id serial primary key,
  order_id integer not null references orders (id) on delete cascade,
  product_id integer not null references products (id),
  quantity integer not null check (quantity > 0),
  -- price is copied onto the line: a later price change must not rewrite history
  unit_price integer not null check (unit_price > 0)
);

create index on orders (customer_id);
create index on order_lines (order_id);
