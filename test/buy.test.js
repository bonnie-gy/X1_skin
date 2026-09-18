'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

function createPage(result) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        textContent: '',
        hidden: id === 'paymentView',
        addEventListener() {},
        reportValidity() { return true; },
        querySelector(selector) { return element(`${id}/${selector}`); },
        classList: { toggle(name, hidden) { element(id).hidden = hidden; } }
      });
    }
    return elements.get(id);
  }
  let payload;
  const context = vm.createContext({
    document: { getElementById: element },
    window: { addEventListener() {} },
    FormData: class {
      get(name) { return { name: 'Test', quantity: '2', email: 'test@example.com' }[name] || ''; }
    },
    fetch: async (url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true, json: async () => result };
    }
  });
  vm.runInContext(fs.readFileSync(require.resolve('../frontend/buy.js'), 'utf8'), context);
  vm.runInContext("products = [{ id: 'x1-skin', presale: { deposit: 'RMB 0.01' } }];", context);
  return { context, element, payload: () => payload };
}

test('payment view uses the API amount instead of the browser catalog price', async () => {
  const page = createPage({ ok: true, id: 'X1-ORDER-test', totalAmountCents: 100000, currency: 'CNY' });
  await vm.runInContext('submitPreorder({ preventDefault() {} })', page.context);
  assert.equal(page.element('paymentAmount').textContent, 'RMB 1,000');
  assert.equal(page.element('paymentView').hidden, false);
  assert.equal(page.payload().productId, 'x1-skin');
  for (const key of ['productPrice', 'productDeposit', 'paymentUrl', 'productName']) {
    assert.equal(page.payload()[key], undefined);
  }
});

test('payment view stays hidden when order confirmation is incomplete or invalid', async () => {
  for (const result of [
    { ok: true },
    { ok: true, id: 'test', currency: 'CNY', totalAmountCents: -1 },
    { ok: true, id: 'test', currency: 'CNY', totalAmountCents: '100000' },
    { ok: true, id: 'test', currency: 'USD', totalAmountCents: 100000 }
  ]) {
    const page = createPage(result);
    await vm.runInContext('submitPreorder({ preventDefault() {} })', page.context);
    assert.equal(page.element('paymentView').hidden, true);
    assert.match(page.element('preorderError').textContent, /before paying/);
  }
});
