import assert from 'node:assert/strict';
import test from 'node:test';
import orders from '../backend/orders.js';
import ordersHandler from '../api/orders.js';
import worker from '../worker/index.mjs';
import content from '../backend/content.json' with { type: 'json' };

const validOrder = {
  name: 'Test Customer',
  phone: '13800138000',
  email: 'customer@example.com',
  address: 'Test shipping address',
  productId: 'x1-skin',
  quantity: 2
};

const tamperedOrder = {
  ...validOrder,
  productName: 'Attacker product',
  productPrice: 'RMB 0.01',
  productDeposit: 'RMB 0.01',
  totalAmountCents: 1,
  currency: 'USD',
  paymentUrl: 'https://attacker.invalid/pay'
};

function responseMock() {
  return {
    statusCode: 200,
    setHeader() {},
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
}

function orderRequest(body) {
  return new Request('https://example.com/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

test('server catalog overrides all client price and payment fields', () => {
  const validated = orders.validateOrder(tamperedOrder);
  assert.equal(validated.error, undefined);
  assert.equal(validated.product.name, 'X1 Skin reservation deposit');
  assert.equal(validated.product.unitAmountCents, 50000);
  assert.equal(validated.product.paymentUrl, undefined);
  const record = orders.createOrderRecord(validated);
  assert.equal(record.totalAmountCents, 100000);
  assert.equal(record.totalAmount, 'RMB 1000.00');
  assert.equal(record.currency, 'CNY');
  assert.equal(record.status, 'pending_payment');
});

test('rejects unknown products and products only available for inquiry or waitlist', () => {
  for (const productId of [undefined, '', 'unknown', 'x1-vest', 'x1-studio']) {
    assert.match(orders.validateOrder({ ...validOrder, productId }).error, /not available/);
  }
});

test('requires a whole quantity between 1 and 99 without parseInt truncation', () => {
  for (const quantity of [0, -1, 100, 1.5, '2units', '1.5', true, null, [], {}, '']) {
    assert.match(orders.validateOrder({ ...validOrder, quantity }).error, /quantity/);
  }
  for (const quantity of [1, 99, '2']) {
    const validated = orders.validateOrder({ ...validOrder, quantity });
    assert.equal(validated.error, undefined);
    assert.equal(orders.createOrderRecord(validated).totalAmountCents, 50000 * Number(quantity));
  }
});

test('rejects malformed input and missing customer details', () => {
  for (const body of [null, [], 'invalid', 1, {}]) {
    assert.ok(orders.validateOrder(body).error);
  }
  assert.ok(orders.validateOrder({ ...validOrder, email: 'invalid' }).error);
  assert.ok(orders.validateOrder({ ...validOrder, phone: 'invalid' }).error);
});

test('catalog deposit label matches the integer-cent price', () => {
  const product = content.products.find(product => product.id === 'x1-skin');
  assert.equal(Number(product.presale.deposit.replace(/[^\d.]/g, '')) * 100, product.presale.depositCents);
});

test('Vercel returns only the server-calculated payable amount', async context => {
  const smtpHost = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  context.after(() => {
    if (smtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = smtpHost;
  });
  const response = responseMock();
  await ordersHandler({ method: 'POST', body: tamperedOrder }, response);
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.totalAmountCents, 100000);
  assert.equal(response.body.currency, 'CNY');
  assert.equal(response.body.paymentUrl, undefined);
  assert.match(response.body.id, /^X1-ORDER-/);
});

test('Vercel rejects invalid products and malformed quantities', async () => {
  for (const body of [{ ...validOrder, productId: 'x1-vest' }, { ...validOrder, quantity: '2evil' }, null]) {
    const response = responseMock();
    await ordersHandler({ method: 'POST', body }, response);
    assert.equal(response.statusCode, 400);
  }
});

test('Worker stores and returns server pricing, not the forged request', async context => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ id: 'mock-email' });
  let savedRecord;
  const response = await worker.fetch(orderRequest(tamperedOrder), {
    ORDERS_STORE: { async put(id, value) { savedRecord = JSON.parse(value); } }
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.totalAmountCents, 100000);
  assert.equal(body.currency, 'CNY');
  assert.equal(body.paymentUrl, undefined);
  assert.equal(savedRecord.product.unitAmountCents, 50000);
  assert.equal(savedRecord.totalAmountCents, 100000);
  assert.equal(savedRecord.product.paymentUrl, undefined);
  assert.equal(savedRecord.status, 'pending_payment');
});

test('Worker rejects invalid orders before storing or notifying', async () => {
  for (const body of [{ ...validOrder, productId: 'x1-studio' }, { ...validOrder, quantity: '2evil' }, null]) {
    const response = await worker.fetch(orderRequest(body), {});
    assert.equal(response.status, 400);
  }
});

test('honeypot responses do not echo attacker payment links or issue payable orders', async () => {
  const body = { ...tamperedOrder, website: 'spam' };
  const response = responseMock();
  await ordersHandler({ method: 'POST', body }, response);
  const workerResponse = await worker.fetch(orderRequest(body), {});
  for (const result of [response.body, await workerResponse.json()]) {
    assert.equal(result.paymentUrl, undefined);
    assert.equal(result.id, undefined);
    assert.equal(result.totalAmountCents, undefined);
  }
});
