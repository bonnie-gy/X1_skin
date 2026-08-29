'use strict';

const {
  createInquiryRecord,
  validateInquiry
} = require('../backend/inquiries');
const { deliverInquiryByResend } = require('../backend/resend');

const MAX_BODY_SIZE = 64 * 1024;

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

module.exports = async function contactHandler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const body = parseBody(request.body);
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_SIZE) {
      return response.status(413).json({ ok: false, message: 'Submission is too large.' });
    }

    if (String(body.website || '').trim()) {
      return response.status(201).json({
        ok: true,
        message: 'Your partnership inquiry has been sent. We will contact you soon.'
      });
    }

    const validation = validateInquiry(body);
    if (validation.error) {
      return response.status(400).json({ ok: false, message: validation.error });
    }

    const record = createInquiryRecord(validation.inquiry);
    await deliverInquiryByResend(record);

    return response.status(201).json({
      ok: true,
      id: record.id,
      message: 'Your partnership inquiry has been sent. We will contact you soon.'
    });
  } catch (error) {
    if (error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED') {
      return response.status(503).json({
        ok: false,
        message: 'The online contact channel is not configured. Please email hatchyoung@outlook.com.'
      });
    }

    if (error instanceof SyntaxError) {
      return response.status(400).json({ ok: false, message: 'Submission data has an invalid format.' });
    }

    console.error('Failed to deliver contact inquiry:', { message: error.message });
    return response.status(502).json({
      ok: false,
      message: 'Sending failed temporarily. Please try again later or email hatchyoung@outlook.com.'
    });
  }
};
