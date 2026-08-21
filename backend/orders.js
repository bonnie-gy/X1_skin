'use strict';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ORDER_FILE = path.join(__dirname, 'data', 'orders.ndjson');

function validateOrder(input) {
  const customer = {
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    email: String(input.email || '').trim(),
    address: String(input.address || '').trim()
  };

  const quantity = parseInt(input.quantity, 10);

  if (!customer.name || !customer.phone || !customer.email || !customer.address) {
    return { error: '请完整填写姓名、电话、邮箱和收货地址。' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    return { error: '请输入有效的联系邮箱。' };
  }
  if (!/^1[3-9]\d{9}$/.test(customer.phone)) {
    return { error: '请输入有效的手机号码。' };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { error: '购买数量必须在 1 到 99 之间。' };
  }
  if (
    [customer.name, customer.phone, customer.email, customer.address].some(value => value.length > 120)
  ) {
    return { error: '填写内容过长，请精简后重试。' };
  }

  return {
    customer,
    quantity,
    product: {
      name: String(input.productName || '').trim(),
      price: String(input.productPrice || '').trim(),
      deposit: String(input.productDeposit || '').trim()
    }
  };
}

function createOrderRecord(validated) {
  const totalAmount = calculateTotal(validated.product.price, validated.quantity);
  return {
    id: `X1-ORDER-${Date.now()}`,
    createdAt: new Date().toISOString(),
    product: validated.product,
    quantity: validated.quantity,
    customer: validated.customer,
    totalAmount,
    status: 'pending_payment'
  };
}

function calculateTotal(price, quantity) {
  const numericMatch = price.match(/[\d.]+/);
  if (!numericMatch) return price;
  const unitPrice = parseFloat(numericMatch[1]);
  if (Number.isNaN(unitPrice)) return price;
  const total = unitPrice * quantity;
  if (price.includes('万')) {
    return `${total / 10000}万元`;
  }
  return `¥${total.toLocaleString()}`;
}

async function saveOrderLocally(record) {
  await fs.promises.mkdir(path.dirname(ORDER_FILE), { recursive: true });
  await fs.promises.appendFile(ORDER_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

/**
 * 通过邮件发送订单通知
 */
async function deliverOrderByEmail(record) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    CONTACT_EMAIL
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('[Email] SMTP not configured, skipping order notification');
    return { skipped: true, reason: 'SMTP not configured' };
  }

  const recipientEmail = CONTACT_EMAIL || SMTP_USER;

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true' || parseInt(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const subject = `[X1官网] 新预售订单 - ${record.product.name} - ${record.customer.name}`;
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
    .product-box { background: white; border-left: 4px solid #176fdf; padding: 20px; margin-top: 20px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .product-box h3 { margin: 0 0 12px; font-size: 16px; color: #176fdf; }
    .customer-box { background: white; border-left: 4px solid #20c7c2; padding: 20px; margin-top: 20px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .customer-box h3 { margin: 0 0 12px; font-size: 16px; color: #20c7c2; }
    .amount { font-size: 20px; font-weight: 600; color: #ff775c; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #666; font-size: 12px; }
    .badge { display: inline-block; background: #ff775c; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .timestamp { color: #999; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛒 新预售订单</h1>
    <p>来自 X1 智能触觉穿戴官网</p>
  </div>
  <div class="content">
    <table class="info-table">
      <tr>
        <th colspan="2">订单概览</th>
      </tr>
      <tr>
        <td>订单编号</td>
        <td><code>${escapeHtml(record.id)}</code></td>
      </tr>
      <tr>
        <td>提交时间</td>
        <td class="timestamp">${formatDate(record.createdAt)}</td>
      </tr>
      <tr>
        <td>订单状态</td>
        <td><span class="badge">待付款</span></td>
      </tr>
      <tr>
        <td>购买数量</td>
        <td>${record.quantity} 件</td>
      </tr>
      <tr>
        <td>订单总额</td>
        <td class="amount">${escapeHtml(record.totalAmount)}</td>
      </tr>
    </table>

    <div class="product-box">
      <h3>产品信息</h3>
      <table class="info-table">
        <tr><td>产品名称</td><td><strong>${escapeHtml(record.product.name)}</strong></td></tr>
        <tr><td>单价</td><td>${escapeHtml(record.product.price)}</td></tr>
        ${record.product.deposit ? `<tr><td>定金</td><td>${escapeHtml(record.product.deposit)}</td></tr>` : ''}
      </table>
    </div>

    <div class="customer-box">
      <h3>客户信息</h3>
      <table class="info-table">
        <tr><td>姓名</td><td><strong>${escapeHtml(record.customer.name)}</strong></td></tr>
        <tr><td>电话</td><td>${escapeHtml(record.customer.phone)}</td></tr>
        <tr><td>邮箱</td><td><a href="mailto:${escapeHtml(record.customer.email)}">${escapeHtml(record.customer.email)}</a></td></tr>
        <tr><td>地址</td><td>${escapeHtml(record.customer.address)}</td></tr>
      </table>
    </div>

    <div class="footer">
      <p>此邮件由 X1 官网自动发送，请勿直接回复此邮件。</p>
      <p>如需联系客户，请直接发送邮件至：<a href="mailto:${escapeHtml(record.customer.email)}">${escapeHtml(record.customer.email)}</a></p>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
新预售订单 - X1官网
====================

订单编号：${record.id}
提交时间：${formatDate(record.createdAt)}
订单状态：待付款
购买数量：${record.quantity} 件
订单总额：${record.totalAmount}

--- 产品信息 ---
产品名称：${record.product.name}
单价：${record.product.price}${record.product.deposit ? `\n定金：${record.product.deposit}` : ''}

--- 客户信息 ---
姓名：${record.customer.name}
电话：${record.customer.phone}
邮箱：${record.customer.email}
地址：${record.customer.address}

====================
此邮件由 X1 官网自动发送，请勿直接回复此邮件。
如需联系客户，请直接发送邮件至：${record.customer.email}
    `.trim();

    const info = await transporter.sendMail({
      from: `"X1官网" <${SMTP_USER}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
      replyTo: record.customer.email,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      }
    });

    console.log(`[Email] Order notification sent to ${recipientEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, recipient: recipientEmail };
  } catch (error) {
    console.error('[Email] Failed to send order notification:', error.message);
    return { sent: false, error: error.message };
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, char => map[char]);
}

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
  createOrderRecord,
  deliverOrderByEmail,
  saveOrderLocally,
  validateOrder
};
