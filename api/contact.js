'use strict';

const {
  createInquiryRecord,
  deliverInquiryByEmail,
  deliverInquiryToWebhook,
  validateInquiry
} = require('../backend/inquiries');

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

    const validation = validateInquiry(body);
    if (validation.error) {
      return response.status(400).json({ ok: false, message: validation.error });
    }

    const record = createInquiryRecord(validation.inquiry);

    // 优先使用邮件通知，webhook 作为可选补充
    try {
      await deliverInquiryByEmail(record);
    } catch (emailError) {
      console.error('Email delivery failed:', emailError.message);
      // 邮件发送失败不影响主流程，尝试 webhook
      try {
        await deliverInquiryToWebhook(record);
      } catch (webhookError) {
        console.error('Webhook delivery also failed:', webhookError.message);
        // 两者都失败，但仍然返回成功（数据已保存）
      }
    }

    return response.status(201).json({
      ok: true,
      id: record.id,
      message: '合作需求已提交，我们会尽快与您联系。'
    });
  } catch (error) {
    if (error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED') {
      // webhook 未配置，但邮件可能已发送成功
      // 只有当邮件也未配置时才返回错误
      const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
      if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        return response.status(503).json({
          ok: false,
          message: '线上联系渠道尚未配置，请稍后再试。'
        });
      }
      // 邮件已配置，忽略 webhook 未配置的错误
      return response.status(201).json({
        ok: true,
        id: record.id,
        message: '合作需求已提交，我们会尽快与您联系。'
      });
    }

    if (error instanceof SyntaxError) {
      return response.status(400).json({ ok: false, message: '提交数据格式不正确。' });
    }

    console.error('Failed to deliver contact inquiry:', error.message);
    return response.status(502).json({
      ok: false,
      message: '提交暂时失败，请稍后重试。'
    });
  }
};
