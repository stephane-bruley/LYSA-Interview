/* LYSA Orders — front-end. Plain JavaScript, no framework, no build step. */

const $ = (id) => document.getElementById(id);

const money = new Intl.NumberFormat('vi-VN');
const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

const formatMoney = (amount) => `${money.format(amount)} ₫`;
const formatDate = (value) => (value ? day.format(new Date(value)) : '—');

const state = { customers: [], orders: [], selectedCustomer: null, selectedOrder: null };

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(payload?.error || `${method} ${path} failed`);
  return payload;
}

const cell = (text, className) => {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = text;
  return td;
};

// ------------------------------------------------------------- customers

async function loadCustomers() {
  const params = new URLSearchParams({
    search: $('search').value,
    includeArchived: String($('show-archived').checked),
  });

  state.customers = await api('GET', `/api/customers?${params}`);

  const body = $('customer-rows');
  body.textContent = '';

  if (state.customers.length === 0) {
    const row = document.createElement('tr');
    const empty = cell('No customer matches.', 'muted');
    empty.colSpan = 5;
    row.append(empty);
    body.append(row);
    return;
  }

  for (const customer of state.customers) {
    const row = document.createElement('tr');
    if (customer.archived) row.classList.add('archived');
    if (customer.id === state.selectedCustomer?.id) row.classList.add('selected');

    row.append(
      cell(customer.name),
      cell(customer.email),
      cell(`${customer.contractDiscountRate} %`, 'num'),
      cell(String(customer.orderCount), 'num'),
      cell(formatDate(customer.lastOrderAt))
    );

    row.addEventListener('click', () => openCustomer(customer));
    body.append(row);
  }
}

function openCustomer(customer) {
  state.selectedCustomer = customer;

  const form = $('customer-fields');
  form.name.value = customer?.name || '';
  form.email.value = customer?.email || '';
  form.contractDiscountRate.value = customer?.contractDiscountRate ?? 0;
  form.archived.checked = Boolean(customer?.archived);

  $('customer-form-title').textContent = customer ? customer.name : 'New customer';
  $('delete-customer').hidden = !customer;
  $('customer-error').hidden = true;
  $('customer-form').hidden = false;

  loadCustomers();
}

function closeCustomerForm() {
  state.selectedCustomer = null;
  $('customer-form').hidden = true;
  loadCustomers();
}

$('customer-fields').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;

  const payload = {
    name: form.name.value,
    email: form.email.value,
    contractDiscountRate: Number(form.contractDiscountRate.value || 0),
    archived: form.archived.checked,
  };

  try {
    if (state.selectedCustomer) {
      await api('PUT', `/api/customers/${state.selectedCustomer.id}`, payload);
    } else {
      await api('POST', '/api/customers', payload);
    }
    closeCustomerForm();
  } catch (err) {
    $('customer-error').hidden = false;
    $('customer-error').textContent = err.message;
  }
});

$('delete-customer').addEventListener('click', async () => {
  if (!confirm(`Delete ${state.selectedCustomer.name}?`)) return;

  try {
    await api('DELETE', `/api/customers/${state.selectedCustomer.id}`);
    closeCustomerForm();
  } catch (err) {
    $('customer-error').hidden = false;
    $('customer-error').textContent = err.message;
  }
});

$('close-form').addEventListener('click', closeCustomerForm);
$('new-customer').addEventListener('click', () => openCustomer(null));
$('show-archived').addEventListener('change', loadCustomers);

let searchTimer;
$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadCustomers, 250);
});

// ---------------------------------------------------------------- orders

async function loadOrders() {
  state.orders = await api('GET', '/api/orders');

  const body = $('order-rows');
  body.textContent = '';

  for (const order of state.orders) {
    const row = document.createElement('tr');
    if (order.id === state.selectedOrder?.id) row.classList.add('selected');

    const status = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status ${order.status}`;
    badge.textContent = order.status;
    status.append(badge);

    row.append(
      cell(order.reference),
      cell(order.customerName),
      cell(formatDate(order.createdAt)),
      status,
      cell(formatMoney(order.totals.total), 'num')
    );

    row.addEventListener('click', () => openOrder(order.id));
    body.append(row);
  }
}

async function openOrder(id) {
  const order = await api('GET', `/api/orders/${id}`);
  state.selectedOrder = order;

  const panel = $('order-detail');
  panel.textContent = '';
  panel.hidden = false;

  const title = document.createElement('h2');
  title.textContent = order.reference;
  panel.append(title);

  const who = document.createElement('p');
  who.className = 'muted';
  who.textContent = `${order.customerName} · ${formatDate(order.createdAt)} · contract ${order.contractDiscountRate} %`;
  panel.append(who);

  const lines = document.createElement('table');
  lines.className = 'lines';
  lines.innerHTML =
    '<thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit</th></tr></thead>';

  const linesBody = document.createElement('tbody');
  for (const line of order.lines) {
    const row = document.createElement('tr');
    row.append(cell(line.name), cell(String(line.quantity), 'num'), cell(formatMoney(line.unitPrice), 'num'));
    linesBody.append(row);
  }
  lines.append(linesBody);
  panel.append(lines);

  const totals = document.createElement('table');
  totals.className = 'totals';
  const rows = [
    ['Subtotal', order.totals.subtotal, ''],
    ['Volume discount', -order.totals.volumeDiscount, 'discount'],
    ['Contract discount', -order.totals.contractDiscount, 'discount'],
    ['VAT 8 %', order.totals.vat, ''],
    ['Total', order.totals.total, 'grand'],
  ];

  for (const [label, amount, className] of rows) {
    const row = document.createElement('tr');
    if (className) row.className = className;
    row.append(cell(label), cell(formatMoney(amount)));
    totals.append(row);
  }
  panel.append(totals);

  loadOrders();
}

// ------------------------------------------------------------------ tabs

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((other) => other.classList.remove('active'));
    tab.classList.add('active');

    $('view-customers').hidden = tab.dataset.view !== 'customers';
    $('view-orders').hidden = tab.dataset.view !== 'orders';

    if (tab.dataset.view === 'orders') loadOrders();
    else loadCustomers();
  });
}

loadCustomers();
