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
      return response.status(413).json({ ok: false, message: 'Submission is too large.' });
    }

    if (String(body.website || '').trim()) {
      return response.status(201).json({
        ok: true,
        paymentUrl: body.paymentUrl || '#',
        message: 'Order submitted. Redirecting to the payment page.'
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
      message: 'Order submitted. Redirecting to the payment page.'
    });
  } catch (error) {
    if (error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED') {
      return response.status(503).json({
        ok: false,
        message: 'The order channel is not configured. Please contact support directly.'
      });
    }

    if (error instanceof SyntaxError) {
      return response.status(400).json({ ok: false, message: 'Submission data has an invalid format.' });
    }

    console.error('Failed to process order:', { message: error.message });
    return response.status(502).json({
      ok: false,
      message: 'Submission failed. Please try again later or contact support directly.'
    });
  }
};
