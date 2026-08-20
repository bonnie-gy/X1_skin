'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const contactHandler = require('../api/contact');
const { buildInquiryEmail, deliverInquiryByResend } = require('../backend/resend');

const validInquiry = {
  name: '测试用户',
  company: '测试公司',
  email: 'user@example.com',
  topic: '产品与 SDK',
  message: '希望进一步了解产品合作方案。'
};

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
}

function withEmailEnv(t, values) {
  const keys = ['RESEND_API_KEY', 'CONTACT_EMAIL', 'CONTACT_FROM_EMAIL'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  t.after(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
}

test('builds escaped Resend email content', () => {
  const email = buildInquiryEmail({
    ...validInquiry,
    id: 'X1-test',
    createdAt: '2026-08-20T04:00:00.000Z',
    message: '<script>alert(1)</script>'
  });

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});

test('requires complete Resend configuration', async () => {
  await assert.rejects(
    deliverInquiryByResend({ ...validInquiry, id: 'X1-test', createdAt: new Date().toISOString() }, {}),
    error => error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED'
  );
});

test('Vercel contact API returns 503 instead of false success without email configuration', async t => {
  withEmailEnv(t, {});
  const response = createResponse();
  await contactHandler({ method: 'POST', body: validInquiry }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.ok, false);
});

test('Vercel contact API returns success only after Resend accepts the email', async t => {
  withEmailEnv(t, {
    RESEND_API_KEY: 'test-key',
    CONTACT_EMAIL: 'recipient@example.com',
    CONTACT_FROM_EMAIL: 'X1 Website <contact@example.com>'
  });
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    assert.equal(JSON.parse(init.body).reply_to, validInquiry.email);
    return Response.json({ id: 'email-id' });
  };

  const response = createResponse();
  await contactHandler({ method: 'POST', body: validInquiry }, response);

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.ok, true);
  assert.match(response.body.id, /^X1-/);
});
