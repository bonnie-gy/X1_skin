import content from '../backend/content.json' with { type: 'json' };

const MAX_BODY_SIZE = 64 * 1024;
const EMAIL_API_URL = 'https://api.resend.com/emails';

const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function validateInquiry(input) {
  const inquiry = {
    name: String(input.name || '').trim(),
    company: String(input.company || '').trim(),
    email: String(input.email || '').trim(),
    topic: String(input.topic || '').trim(),
    message: String(input.message || '').trim()
  };

  if (!inquiry.name || !inquiry.email || !inquiry.message) {
    return { error: 'Please provide your name, email, and project needs.' };
  }
  if (inquiry.name.length < 2) {
    return { error: 'Please enter a valid name (at least 2 characters).' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return { error: 'Please enter a valid contact email.' };
  }
  if (inquiry.message.length < 10) {
    return { error: 'Project needs must be at least 10 characters.' };
  }
  if (
    [inquiry.name, inquiry.company, inquiry.email, inquiry.topic].some(value => value.length > 120)
    || inquiry.message.length > 4000
  ) {
    return { error: 'Submission is too long. Please shorten it and try again.' };
  }

  return { inquiry };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function createInquiryRecord(inquiry) {
  return {
    id: `X1-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...inquiry
  };
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai'
  }).format(new Date(isoString));
}

function buildEmail(record) {
  const safe = {
    id: escapeHtml(record.id),
    name: escapeHtml(record.name),
    company: escapeHtml(record.company || '未填写'),
    email: escapeHtml(record.email),
    topic: escapeHtml(record.topic || '未指定'),
    message: escapeHtml(record.message),
    createdAt: escapeHtml(formatDate(record.createdAt))
  };
  const subjectTopic = (record.topic || '未指定方向').replace(/[\r\n]+/g, ' ');
  const subjectName = record.name.replace(/[\r\n]+/g, ' ');

  return {
    subject: `[X1官网] 新的合作咨询 - ${subjectTopic} - ${subjectName}`,
    html: `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>新的合作咨询</title></head>
<body style="margin:0;background:#f4f6f7;color:#172126;font-family:Arial,'Microsoft YaHei',sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:32px 20px">
    <div style="background:#101719;color:#fff;padding:24px 28px">
      <h1 style="margin:0;font-size:22px">新的合作咨询</h1>
      <p style="margin:8px 0 0;color:#b8c5ca;font-size:13px">来自 X1 智能触觉穿戴官网</p>
    </div>
    <div style="background:#fff;padding:28px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:9px 0;color:#66757c;width:110px">姓名</td><td style="padding:9px 0">${safe.name}</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">公司/机构</td><td style="padding:9px 0">${safe.company}</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">联系邮箱</td><td style="padding:9px 0"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
        <tr><td style="padding:9px 0;color:#66757c">合作方向</td><td style="padding:9px 0">${safe.topic}</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">提交时间</td><td style="padding:9px 0">${safe.createdAt}</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">咨询编号</td><td style="padding:9px 0">${safe.id}</td></tr>
      </table>
      <div style="margin-top:22px;border-left:3px solid #138c83;background:#f6f9f9;padding:18px">
        <strong>需求说明</strong>
        <p style="margin:10px 0 0;white-space:pre-wrap;line-height:1.7">${safe.message}</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    text: [
      '新的合作咨询 - X1官网',
      '',
      `姓名/称呼：${record.name}`,
      `公司/机构：${record.company || '未填写'}`,
      `联系邮箱：${record.email}`,
      `合作方向：${record.topic || '未指定'}`,
      `提交时间：${formatDate(record.createdAt)}`,
      `咨询编号：${record.id}`,
      '',
      '需求说明：',
      record.message
    ].join('\n')
  };
}

async function deliverInquiry(record, env) {
  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL || !env.CONTACT_FROM_EMAIL) {
    const error = new Error('Contact email service is not configured');
    error.code = 'CONTACT_DELIVERY_NOT_CONFIGURED';
    throw error;
  }

  const email = buildEmail(record);
  const response = await fetch(EMAIL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: [env.CONTACT_EMAIL],
      reply_to: record.email,
      subject: email.subject,
      html: email.html,
      text: email.text
    })
  });

  if (!response.ok) {
    console.error('Contact email provider rejected the request', { status: response.status });
    throw new Error(`Contact email provider returned ${response.status}`);
  }

  const result = await response.json();
  if (!result.id) throw new Error('Contact email provider returned no message id');
  return result.id;
}

function validateOrder(input) {
  const customer = {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    email: String(input.email || '').trim(),
    address: String(input.address || '').trim()
  };
  const quantity = parseInt(input.quantity, 10);

  if (!customer.name || !customer.phone || !customer.email || !customer.address) {
    return { error: 'Please provide your name, phone, email, and shipping address.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return { error: 'Please enter a valid contact email.' };
  }
  if (!/^1[3-9]\d{9}$/.test(customer.phone)) {
    return { error: 'Please enter a valid phone number.' };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { error: 'Purchase quantity must be between 1 and 99.' };
  }
  if (
    [customer.name, customer.phone, customer.email, customer.address].some(value => value.length > 120)
  ) {
    return { error: 'Submission is too long. Please shorten it and try again.' };
  }

  return {
    customer,
    quantity,
    product: {
      name: String(input.productName || '').trim(),
      price: String(input.productPrice || '').trim(),
      paymentUrl: String(input.paymentUrl || '').trim()
    }
  };
}

function createOrderRecord(validated) {
  const numericMatch = validated.product.price.match(/[\d.]+/);
  const unitPrice = numericMatch ? parseFloat(numericMatch[0]) : 0;
  const total = Number.isNaN(unitPrice) ? validated.product.price : unitPrice * validated.quantity;
  return {
    id: `X1-ORDER-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    product: validated.product,
    quantity: validated.quantity,
    customer: validated.customer,
    totalAmount: total,
    status: 'pending_payment'
  };
}

function buildOrderEmail(record) {
  const safe = {
    id: escapeHtml(record.id),
    productName: escapeHtml(record.product.name),
    price: escapeHtml(record.product.price),
    quantity: record.quantity,
    totalAmount: escapeHtml(typeof record.totalAmount === 'number' ? `¥${record.totalAmount.toLocaleString()}` : record.totalAmount),
    customerName: escapeHtml(record.customer.name),
    customerPhone: escapeHtml(record.customer.phone),
    customerEmail: escapeHtml(record.customer.email),
    customerAddress: escapeHtml(record.customer.address),
    createdAt: escapeHtml(formatDate(record.createdAt))
  };

  return {
    subject: `[X1官网] 新预售订单 - ${safe.productName} - ${safe.customerName}`,
    html: `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>新预售订单</title></head>
<body style="margin:0;background:#f4f6f7;color:#172126;font-family:Arial,'Microsoft YaHei',sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:32px 20px">
    <div style="background:#101719;color:#fff;padding:24px 28px">
      <h1 style="margin:0;font-size:22px">新预售订单</h1>
      <p style="margin:8px 0 0;color:#b8c5ca;font-size:13px">来自 X1 智能触觉穿戴官网</p>
    </div>
    <div style="background:#fff;padding:28px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:9px 0;color:#66757c;width:110px">订单编号</td><td style="padding:9px 0">${safe.id}</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">提交时间</td><td style="padding:9px 0">${safe.createdAt}</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">订单状态</td><td style="padding:9px 0"><span style="background:#ff775c;color:#fff;padding:3px 12px;border-radius:12px;font-size:12px">待付款</span></td></tr>
        <tr><td style="padding:9px 0;color:#66757c">购买数量</td><td style="padding:9px 0">${safe.quantity} 件</td></tr>
        <tr><td style="padding:9px 0;color:#66757c">订单总额</td><td style="padding:9px 0;color:#ff775c;font-weight:600;font-size:16px">${safe.totalAmount}</td></tr>
      </table>
      <div style="margin-top:22px;border-left:3px solid #176fdf;background:#f6f9f9;padding:18px">
        <strong style="color:#176fdf">产品信息</strong>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px">
          <tr><td style="padding:6px 0;color:#66757c;width:110px">产品名称</td><td style="padding:6px 0"><strong>${safe.productName}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#66757c">单价</td><td style="padding:6px 0">${safe.price}</td></tr>
        </table>
      </div>
      <div style="margin-top:22px;border-left:3px solid #20c7c2;background:#f6f9f9;padding:18px">
        <strong style="color:#20c7c2">客户信息</strong>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px">
          <tr><td style="padding:6px 0;color:#66757c;width:110px">姓名</td><td style="padding:6px 0"><strong>${safe.customerName}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#66757c">电话</td><td style="padding:6px 0">${safe.customerPhone}</td></tr>
          <tr><td style="padding:6px 0;color:#66757c">邮箱</td><td style="padding:6px 0"><a href="mailto:${safe.customerEmail}">${safe.customerEmail}</a></td></tr>
          <tr><td style="padding:6px 0;color:#66757c">地址</td><td style="padding:6px 0">${safe.customerAddress}</td></tr>
        </table>
      </div>
    </div>
    <div style="text-align:center;color:#66757c;font-size:12px;margin-top:22px">
      <p>此邮件由 X1 官网自动发送，请勿直接回复此邮件。</p>
    </div>
  </div>
</body>
</html>`,
    text: [
      '新预售订单 - X1官网',
      '',
      `订单编号：${record.id}`,
      `提交时间：${formatDate(record.createdAt)}`,
      '订单状态：待付款',
      `购买数量：${record.quantity} 件`,
      `订单总额：${typeof record.totalAmount === 'number' ? '¥' + record.totalAmount.toLocaleString() : record.totalAmount}`,
      '',
      '--- 产品信息 ---',
      `产品名称：${record.product.name}`,
      `单价：${record.product.price}`,
      '',
      '--- 客户信息 ---',
      `姓名：${record.customer.name}`,
      `电话：${record.customer.phone}`,
      `邮箱：${record.customer.email}`,
      `地址：${record.customer.address}`,
      '',
      '此邮件由 X1 官网自动发送，请勿直接回复此邮件。'
    ].join('\n')
  };
}

async function handleOrders(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { ...jsonHeaders, Allow: 'POST' }
    });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_SIZE) {
    return jsonResponse({ ok: false, message: 'Submission is too large.' }, 413);
  }

  let body;
  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_SIZE) {
      return jsonResponse({ ok: false, message: 'Submission is too large.' }, 413);
    }
    body = JSON.parse(bodyText || '{}');
  } catch {
    return jsonResponse({ ok: false, message: 'Submission data has an invalid format.' }, 400);
  }

  // Bot honeypot
  if (String(body.website || '').trim()) {
    return jsonResponse({ ok: true, paymentUrl: body.paymentUrl || '#', message: 'Order submitted. Redirecting to the payment page.' }, 201);
  }

  const validation = validateOrder(body);
  if (validation.error) {
    return jsonResponse({ ok: false, message: validation.error }, 400);
  }

  const record = createOrderRecord(validation);

  // Save order to KV if available, otherwise just log
  if (env.ORDERS_STORE) {
    try {
      await env.ORDERS_STORE.put(record.id, JSON.stringify(record));
    } catch (e) {
      console.error('Failed to save order to KV:', e.message);
    }
  }

  try {
    const email = buildOrderEmail(record);
    await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: [env.CONTACT_EMAIL],
        reply_to: record.customer.email,
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });
  } catch (error) {
    console.error('Failed to deliver order notification:', error.message);
  }

  return jsonResponse({
    ok: true,
    id: record.id,
    paymentUrl: record.product.paymentUrl,
    message: 'Order submitted. Redirecting to the payment page.'
  }, 201);
}

async function handleContact(request, env) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_SIZE) {
    return jsonResponse({ ok: false, message: 'Submission is too large.' }, 413);
  }

  let bodyText;
  let body;
  try {
    bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_SIZE) {
      return jsonResponse({ ok: false, message: 'Submission is too large.' }, 413);
    }
    body = JSON.parse(bodyText || '{}');
  } catch {
    return jsonResponse({ ok: false, message: 'Submission data has an invalid format.' }, 400);
  }

  // Bots commonly fill hidden website fields. Return a neutral success without sending.
  if (String(body.website || '').trim()) {
    return jsonResponse({ ok: true, message: 'Your partnership inquiry has been submitted. We will contact you soon.' }, 201);
  }

  const validation = validateInquiry(body);
  if (validation.error) {
    return jsonResponse({ ok: false, message: validation.error }, 400);
  }

  const record = createInquiryRecord(validation.inquiry);
  try {
    await deliverInquiry(record, env);
    return jsonResponse({
      ok: true,
      id: record.id,
      message: 'Your partnership inquiry has been sent. We will contact you soon.'
    }, 201);
  } catch (error) {
    console.error('Failed to deliver contact inquiry', { message: error.message });
    const notConfigured = error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED';
    return jsonResponse({
      ok: false,
      message: notConfigured
        ? 'The online contact channel is not configured. Please email hatchyoung@outlook.com.'
        : 'Sending failed temporarily. Please try again later or email hatchyoung@outlook.com.'
    }, notConfigured ? 503 : 502);
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/health') {
    if (request.method !== 'GET') return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
    return jsonResponse({ status: 'ok', service: 'x1-skin-worker' });
  }

  if (url.pathname === '/api/content') {
    if (request.method !== 'GET') return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
    return jsonResponse(content);
  }

  if (url.pathname === '/api/contact') {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
        status: 405,
        headers: { ...jsonHeaders, Allow: 'POST' }
      });
    }
    return handleContact(request, env);
  }

  if (url.pathname === '/api/orders') {
    return handleOrders(request, env);
  }

  if (url.pathname.startsWith('/api/')) {
    return jsonResponse({ ok: false, message: 'Not found' }, 404);
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch: handleRequest
};

export { buildEmail, handleRequest, validateInquiry };
