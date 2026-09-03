-- Demo data. Amounts are in dong (VND).

insert into customers (id, name, email, contract_discount_rate, archived) values
  (1,  'Hanoi Steel JSC',        'contact@hanoisteel.vn',     10.00, false),
  (2,  'Nguyen Trading, Ltd',    'sales@nguyentrading.vn',     0.00, false),
  (3,  'Mekong Industrial',      'info@mekong-ind.vn',         5.00, false),
  (4,  'Da Nang Marine Supply',  'orders@dnmarine.vn',         0.00, false),
  (5,  'Saigon Precision Co',    'contact@sgprecision.vn',    15.00, false),
  (6,  'Red River Logistics',    'hello@redriverlog.vn',       0.00, false),
  (7,  'Hai Phong Fabrication',  'contact@hpfab.vn',           0.00, false),
  (8,  'Bac Ninh Electronics',   'purchasing@bnelec.vn',       7.50, false),
  (9,  'Can Tho Agri Machines',  'info@cantho-agri.vn',        0.00, true),
  (10, 'Vinh Long Metalworks',   'contact@vlmetal.vn',         0.00, false);

insert into products (id, sku, name, unit_price) values
  (1, 'PRD-001', 'Steel bracket',            100000),
  (2, 'PRD-002', 'Aluminium rail',            45000),
  (3, 'PRD-003', 'Rubber gasket',             12000),
  (4, 'PRD-004', 'Hex bolt M8, box of 100',   85000),
  (5, 'PRD-005', 'Control unit',            2400000),
  (6, 'PRD-006', 'Cable harness',            320000),
  (7, 'PRD-007', 'Steel plate 4mm',          560000),
  (8, 'PRD-008', 'Safety switch',            175000);

insert into orders (id, reference, customer_id, status, created_at) values
  (1,  'SO-1039', 4, 'paid',      now() - interval '400 days'),
  (2,  'SO-1040', 2, 'paid',      now() - interval '320 days'),
  (3,  'SO-1041', 7, 'cancelled', now() - interval '300 days'),
  (4,  'SO-1042', 3, 'paid',      now() - interval '210 days'),
  (5,  'SO-1043', 1, 'open',      now() - interval '12 days'),
  (6,  'SO-1044', 2, 'paid',      now() - interval '95 days'),
  (7,  'SO-1045', 6, 'open',      now() - interval '250 days'),
  (8,  'SO-1046', 5, 'paid',      now() - interval '60 days'),
  (9,  'SO-1047', 4, 'draft',     now() - interval '40 days'),
  (10, 'SO-1048', 8, 'paid',      now() - interval '33 days'),
  (11, 'SO-1049', 1, 'paid',      now() - interval '25 days'),
  (12, 'SO-1050', 3, 'open',      now() - interval '18 days'),
  (13, 'SO-1051', 5, 'draft',     now() - interval '6 days'),
  (14, 'SO-1052', 2, 'open',      now() - interval '2 days');

insert into order_lines (order_id, product_id, quantity, unit_price) values
  (1,  3, 120,   12000),
  (1,  8,  10,  175000),
  (2,  2,  60,   45000),
  (3,  4,   5,   85000),
  (4,  6,  15,  320000),
  (4,  3, 200,   12000),
  (5,  1,  20,  100000),
  (6,  7,   8,  560000),
  (6,  8,  50,  175000),
  (7,  5,   2, 2400000),
  (8,  1, 100,  100000),
  (8,  3, 250,   12000),
  (9,  2,  12,   45000),
  (10, 6,  30,  320000),
  (11, 4,  75,   85000),
  (12, 8,   9,  175000),
  (12, 3,  40,   12000),
  (13, 5,   1, 2400000),
  (14, 1,  55,  100000),
  (14, 2, 110,   45000);

select setval('customers_id_seq', (select max(id) from customers));
select setval('products_id_seq', (select max(id) from products));
select setval('orders_id_seq', (select max(id) from orders));
select setval('order_lines_id_seq', (select max(id) from order_lines));
