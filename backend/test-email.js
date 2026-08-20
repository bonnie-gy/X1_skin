#!/usr/bin/env node
/**
 * 邮件配置测试脚本
 * 用于验证 SMTP 配置是否正确
 *
 * 使用方法：
 *   node backend/test-email.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('📧 邮件配置测试\n');

  // 检查环境变量
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    CONTACT_EMAIL
  } = process.env;

  console.log('配置信息：');
  console.log(`  SMTP_HOST: ${SMTP_HOST || '❌ 未设置'}`);
  console.log(`  SMTP_PORT: ${SMTP_PORT || '❌ 未设置'}`);
  console.log(`  SMTP_SECURE: ${SMTP_SECURE || '❌ 未设置'}`);
  console.log(`  SMTP_USER: ${SMTP_USER ? '✓ 已设置' : '❌ 未设置'}`);
  console.log(`  SMTP_PASS: ${SMTP_PASS ? '✓ 已设置' : '❌ 未设置'}`);
  console.log(`  CONTACT_EMAIL: ${CONTACT_EMAIL || '⚠️ 未设置（将使用 SMTP_USER）'}\n`);

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('❌ 错误：SMTP 配置不完整');
    console.error('请检查 backend/.env 文件中的 SMTP_* 配置项\n');
    process.exit(1);
  }

  // 创建传输器
  const recipientEmail = CONTACT_EMAIL || SMTP_USER;
  console.log(`📤 尝试连接到 SMTP 服务器：${SMTP_HOST}:${SMTP_PORT}...`);

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

    // 验证连接
    console.log('🔍 验证 SMTP 连接...\n');
    await transporter.verify();

    console.log('✅ SMTP 连接成功！\n');

    // 发送测试邮件
    console.log(`📨 发送测试邮件到：${recipientEmail}\n`);

    const testRecord = {
      id: 'X1-TEST-' + Date.now(),
      name: '测试用户',
      company: '测试公司',
      email: 'test@example.com',
      topic: '测试咨询',
      message: '这是一封测试邮件，用于验证邮件通知功能是否正常工作。',
      createdAt: new Date().toISOString()
    };

    const info = await transporter.sendMail({
      from: `"X1官网测试" <${SMTP_USER}>`,
      to: recipientEmail,
      subject: `[X1官网] 邮件测试 - ${testRecord.name}`,
      text: `这是一封测试邮件。

咨询信息：
- 姓名：${testRecord.name}
- 公司：${testRecord.company}
- 邮箱：${testRecord.email}
- 方向：${testRecord.topic}
- 时间：${new Date(testRecord.createdAt).toLocaleString('zh-CN')}

需求说明：
${testRecord.message}

---
如果你收到这封邮件，说明邮件通知功能已正常工作！`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #176fdf; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .success { background: #28a745; color: white; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ 邮件测试成功</h1>
    </div>
    <div class="content">
      <p>恭喜！你的邮件通知功能已正常工作。</p>
      <div class="success">
        <strong>测试信息：</strong><br>
        姓名：${testRecord.name}<br>
        公司：${testRecord.company}<br>
        方向：${testRecord.topic}
      </div>
      <p>现在你可以在官网提交咨询表单，hatchyoung@outlook.com 将收到邮件通知。</p>
    </div>
  </div>
</body>
</html>`
    });

    console.log('✅ 测试邮件发送成功！');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   收件人：${recipientEmail}\n`);

    console.log('🎉 邮件配置验证完成！所有功能正常。\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 邮件发送失败：', error.message);
    console.error('\n常见问题排查：');
    console.error('  1. 检查 SMTP 用户名和密码是否正确');
    console.error('  2. Outlook 邮箱需要使用"应用专用密码"（如果启用了双重验证）');
    console.error('  3. 确认 SMTP 端口和安全设置是否正确');
    console.error('  4. 检查防火墙是否阻止了 SMTP 连接\n');
    process.exit(1);
  }
}

testEmail();
