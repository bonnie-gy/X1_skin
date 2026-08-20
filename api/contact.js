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
      return response.status(413).json({ ok: false, message: '提交内容过大。' });
    }

    if (String(body.website || '').trim()) {
      return response.status(201).json({
        ok: true,
        message: '合作需求已发送，我们会尽快与您联系。'
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
      message: '合作需求已发送，我们会尽快与您联系。'
    });
  } catch (error) {
    if (error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED') {
      return response.status(503).json({
        ok: false,
        message: '线上联系渠道尚未配置，请发送邮件至 hatchyoung@outlook.com。'
      });
    }

    if (error instanceof SyntaxError) {
      return response.status(400).json({ ok: false, message: '提交数据格式不正确。' });
    }

    console.error('Failed to deliver contact inquiry:', { message: error.message });
    return response.status(502).json({
      ok: false,
      message: '发送暂时失败，请稍后重试或直接发送邮件至 hatchyoung@outlook.com。'
    });
  }
};
