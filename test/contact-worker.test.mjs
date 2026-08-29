import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { buildEmail, validateInquiry } from '../worker/index.mjs';

const validInquiry = {
  name: '测试用户',
  company: '测试公司',
  email: 'user@example.com',
  topic: '产品与 SDK',
  message: '希望进一步了解产品合作方案。'
};

function request(body, method = 'POST') {
  return new Request('https://example.com/api/contact', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined
  });
}

test('validates contact inquiry fields', () => {
  assert.deepEqual(validateInquiry(validInquiry), { inquiry: validInquiry });
  assert.match(validateInquiry({ ...validInquiry, email: 'invalid' }).error, /valid contact email/);
  assert.match(validateInquiry({ ...validInquiry, message: 'Too short' }).error, /at least 10 characters/);
});

test('escapes user content in the email HTML', () => {
  const email = buildEmail({
    ...validInquiry,
    id: 'X1-test',
    createdAt: '2026-08-20T04:00:00.000Z',
    message: '<script>alert(1)</script>'
  });

  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});

test('returns 503 instead of false success when email is not configured', async () => {
  const response = await worker.fetch(request(validInquiry), {});
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
});

test('returns success only after the email provider accepts the message', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    const payload = JSON.parse(init.body);
    assert.equal(payload.reply_to, validInquiry.email);
    return Response.json({ id: 'email-id' });
  };

  const response = await worker.fetch(request(validInquiry), {
    RESEND_API_KEY: 'test-key',
    CONTACT_EMAIL: 'recipient@example.com',
    CONTACT_FROM_EMAIL: 'X1 Website <contact@example.com>'
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.match(body.id, /^X1-/);
});

test('serves health and content APIs inside the Worker', async () => {
  const health = await worker.fetch(new Request('https://example.com/api/health'), {});
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'x1-skin-worker');

  const content = await worker.fetch(new Request('https://example.com/api/content'), {});
  assert.equal(content.status, 200);
  assert.ok(Object.keys(await content.json()).length > 0);
});
