'use strict';

const {
  createOrderRecord,
  validateOrder,
  deliverOrderByEmail
} = require('../backend/orders');

const MAX_BODY_SIZE = 64 * 1024;

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

module.exports = async function ordersHandler(request, response) {
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
        paymentUrl: body.paymentUrl || '#',
        message: '订单已提交，即将跳转到支付页面。'
      });
    }

    const validation = validateOrder(body);
    if (validation.error) {
      return response.status(400).json({ ok: false, message: validation.error });
    }

    const record = createOrderRecord(validation);
    await deliverOrderByEmail(record);

    return response.status(201).json({
      ok: true,
      id: record.id,
      paymentUrl: record.product.paymentUrl,
      message: '订单已提交，即将跳转到支付页面。'
    });
  } catch (error) {
    if (error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED') {
      return response.status(503).json({
        ok: false,
        message: '下单渠道尚未配置，请直接联系客服。'
      });
    }

    if (error instanceof SyntaxError) {
      return response.status(400).json({ ok: false, message: '提交数据格式不正确。' });
    }

    console.error('Failed to process order:', { message: error.message });
    return response.status(502).json({
      ok: false,
      message: '提交失败，请稍后重试或直接联系客服。'
    });
  }
};
