'use strict';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

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

/**
 * 通过邮件发送合作咨询通知
 * 支持 Outlook/Hotmail、Gmail、SendGrid 等 SMTP 服务
 */
async function deliverInquiryByEmail(record) {
  // 从环境变量读取邮件配置
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    CONTACT_EMAIL
  } = process.env;

  // 如果未配置 SMTP，跳过邮件发送（不阻断主流程）
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('[Email] SMTP not configured, skipping email notification');
    return { skipped: true, reason: 'SMTP not configured' };
  }

  // 收件人邮箱：优先使用 CONTACT_EMAIL，否则使用发件人邮箱
  const recipientEmail = CONTACT_EMAIL || SMTP_USER;

  try {
    // 创建邮件传输器
    const transporterConfig = {
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true' || parseInt(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    };

    const transporter = nodemailer.createTransport(transporterConfig);

    // 构建邮件内容
    const subject = `[X1官网] 新的合作咨询 - ${record.topic || '未指定方向'} - ${record.name}`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: #176fdf; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .info-table th { background: #e9ecef; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: #666; border-bottom: 2px solid #dee2e6; }
    .info-table td { padding: 14px 16px; border-bottom: 1px solid #e9ecef; vertical-align: top; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-table td:first-child { font-weight: 600; color: #555; width: 140px; }
    .info-table td:last-child { color: #333; }
    .message-box { background: white; border-left: 4px solid #176fdf; padding: 20px; margin-top: 20px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .message-box h3 { margin: 0 0 12px; font-size: 16px; color: #176fdf; }
    .message-box p { margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #666; font-size: 12px; }
    .badge { display: inline-block; background: #176fdf; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .timestamp { color: #999; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 新的合作咨询</h1>
    <p>来自 X1 智能触觉穿戴官网</p>
  </div>
  <div class="content">
    <table class="info-table">
      <tr>
        <th colspan="2">咨询信息</th>
      </tr>
      <tr>
        <td>姓名 / 称呼</td>
        <td><strong>${escapeHtml(record.name)}</strong></td>
      </tr>
      <tr>
        <td>公司 / 机构</td>
        <td>${escapeHtml(record.company || '未填写')}</td>
      </tr>
      <tr>
        <td>联系邮箱</td>
        <td><a href="mailto:${escapeHtml(record.email)}">${escapeHtml(record.email)}</a></td>
      </tr>
      <tr>
        <td>合作方向</td>
        <td><span class="badge">${escapeHtml(record.topic || '未指定')}</span></td>
      </tr>
      <tr>
        <td>提交时间</td>
        <td class="timestamp">${formatDate(record.createdAt)}</td>
      </tr>
      <tr>
        <td>咨询编号</td>
        <td><code>${record.id}</code></td>
      </tr>
    </table>
    <div class="message-box">
      <h3>需求说明</h3>
      <p>${escapeHtml(record.message)}</p>
    </div>
    <div class="footer">
      <p>此邮件由 X1 官网自动发送，请勿直接回复此邮件。</p>
      <p>如需回复，请直接发送邮件至：<a href="mailto:${escapeHtml(record.email)}">${escapeHtml(record.email)}</a></p>
    </div>
  </div>
</body>
</html>`;

    // 纯文本版本（作为备用）
    const textContent = `
新的合作咨询 - X1官网
====================

咨询信息：
- 姓名/称呼：${record.name}
- 公司/机构：${record.company || '未填写'}
- 联系邮箱：${record.email}
- 合作方向：${record.topic || '未指定'}
- 提交时间：${formatDate(record.createdAt)}
- 咨询编号：${record.id}

需求说明：
${record.message}

====================
此邮件由 X1 官网自动发送，请勿直接回复此邮件。
如需回复，请直接发送邮件至：${record.email}
    `.trim();

    // 发送邮件
    const info = await transporter.sendMail({
      from: `"X1官网" <${SMTP_USER}>`,
      to: recipientEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
      replyTo: record.email, // 设置回复地址为客户邮箱
      headers: {
        'X-Priority': '1', // 高优先级
        'X-MSMail-Priority': 'High'
      }
    });

    console.log(`[Email] Notification sent to ${recipientEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, recipient: recipientEmail };
  } catch (error) {
    console.error('[Email] Failed to send notification:', error.message);
    // 邮件发送失败不影响主流程
    return { sent: false, error: error.message };
  }
}

/**
 * HTML 转义防止 XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, char => map[char]);
}

/**
 * 格式化日期
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  }) + ' (北京时间)';
}

module.exports = {
  createInquiryRecord,
  deliverInquiryByEmail,
  deliverInquiryToWebhook,
  saveInquiryLocally,
  validateInquiry
};
