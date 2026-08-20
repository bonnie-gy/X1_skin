'use strict';

const EMAIL_API_URL = 'https://api.resend.com/emails';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai'
  }).format(new Date(isoString));
}

function buildInquiryEmail(record) {
  const subjectTopic = (record.topic || '未指定方向').replace(/[\r\n]+/g, ' ');
  const subjectName = record.name.replace(/[\r\n]+/g, ' ');
  const safe = {
    id: escapeHtml(record.id),
    name: escapeHtml(record.name),
    company: escapeHtml(record.company || '未填写'),
    email: escapeHtml(record.email),
    topic: escapeHtml(record.topic || '未指定'),
    message: escapeHtml(record.message),
    createdAt: escapeHtml(formatDate(record.createdAt))
  };

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

async function deliverInquiryByResend(record, env = process.env, fetchImpl = globalThis.fetch) {
  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL || !env.CONTACT_FROM_EMAIL) {
    const error = new Error('Contact email service is not configured');
    error.code = 'CONTACT_DELIVERY_NOT_CONFIGURED';
    throw error;
  }

  const email = buildInquiryEmail(record);
  const response = await fetchImpl(EMAIL_API_URL, {
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
    const error = new Error(`Contact email provider returned ${response.status}`);
    error.code = 'CONTACT_DELIVERY_FAILED';
    throw error;
  }

  const result = await response.json();
  if (!result.id) {
    const error = new Error('Contact email provider returned no message id');
    error.code = 'CONTACT_DELIVERY_FAILED';
    throw error;
  }

  return { id: result.id };
}

module.exports = {
  buildInquiryEmail,
  deliverInquiryByResend
};
