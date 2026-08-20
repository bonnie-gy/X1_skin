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
    return { error: '请完整填写姓名、邮箱和需求说明。' };
  }
  if (inquiry.name.length < 2) {
    return { error: '请输入有效的姓名（至少2个字符）。' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return { error: '请输入有效的联系邮箱。' };
  }
  if (inquiry.message.length < 10) {
    return { error: '需求说明至少需要10个字符。' };
  }
  if (
    [inquiry.name, inquiry.company, inquiry.email, inquiry.topic].some(value => value.length > 120)
    || inquiry.message.length > 4000
  ) {
    return { error: '提交内容过长，请精简后重试。' };
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

async function handleContact(request, env) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_SIZE) {
    return jsonResponse({ ok: false, message: '提交内容过大。' }, 413);
  }

  let bodyText;
  let body;
  try {
    bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_SIZE) {
      return jsonResponse({ ok: false, message: '提交内容过大。' }, 413);
    }
    body = JSON.parse(bodyText || '{}');
  } catch {
    return jsonResponse({ ok: false, message: '提交数据格式不正确。' }, 400);
  }

  // Bots commonly fill hidden website fields. Return a neutral success without sending.
  if (String(body.website || '').trim()) {
    return jsonResponse({ ok: true, message: '合作需求已提交，我们会尽快与您联系。' }, 201);
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
      message: '合作需求已发送，我们会尽快与您联系。'
    }, 201);
  } catch (error) {
    console.error('Failed to deliver contact inquiry', { message: error.message });
    const notConfigured = error.code === 'CONTACT_DELIVERY_NOT_CONFIGURED';
    return jsonResponse({
      ok: false,
      message: notConfigured
        ? '线上联系渠道尚未配置，请发送邮件至 hatchyoung@outlook.com。'
        : '发送暂时失败，请稍后重试或直接发送邮件至 hatchyoung@outlook.com。'
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

  if (url.pathname.startsWith('/api/')) {
    return jsonResponse({ ok: false, message: 'Not found' }, 404);
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch: handleRequest
};

export { buildEmail, handleRequest, validateInquiry };
