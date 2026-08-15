'use strict';

const fs = require('fs');
const path = require('path');

const INQUIRY_FILE = path.join(__dirname, 'data', 'inquiries.ndjson');

function validateInquiry(input) {
  const inquiry = {
    name: String(input.name || '').trim(),
    company: String(input.company || '').trim(),
    email: String(input.email || '').trim(),
    topic: String(input.topic || '').trim(),
    message: String(input.message || '').trim()
  };

  if (!inquiry.name || !inquiry.email || !inquiry.message) {
    return { error: '请完整填写姓名、邮箱和需求说明。' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return { error: '请输入有效的联系邮箱。' };
  }
  if (
    [inquiry.name, inquiry.company, inquiry.email, inquiry.topic].some(value => value.length > 120)
    || inquiry.message.length > 4000
  ) {
    return { error: '提交内容过长，请精简后重试。' };
  }

  return { inquiry };
}

function createInquiryRecord(inquiry) {
  return {
    id: `X1-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...inquiry
  };
}

async function saveInquiryLocally(record) {
  await fs.promises.mkdir(path.dirname(INQUIRY_FILE), { recursive: true });
  await fs.promises.appendFile(INQUIRY_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

async function deliverInquiryToWebhook(record) {
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  if (!webhookUrl) {
    const error = new Error('CONTACT_WEBHOOK_URL is not configured');
    error.code = 'CONTACT_DELIVERY_NOT_CONFIGURED';
    throw error;
  }

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'x1-website-contact/1.0'
  };
  if (process.env.CONTACT_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.CONTACT_WEBHOOK_TOKEN}`;
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event: 'x1.contact.created', inquiry: record }),
    signal: AbortSignal.timeout(8000)
  });

  if (!webhookResponse.ok) {
    throw new Error(`Contact webhook returned ${webhookResponse.status}`);
  }
}

module.exports = {
  createInquiryRecord,
  deliverInquiryToWebhook,
  saveInquiryLocally,
  validateInquiry
};
