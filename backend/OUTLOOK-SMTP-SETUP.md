# Outlook 邮箱 SMTP 配置指南

本文档说明如何配置 Outlook/Hotmail 邮箱以发送咨询通知邮件。

## 📋 准备工作

1. 一个 Outlook 或 Hotmail 邮箱（例如：yourname@outlook.com）
2. 该邮箱的登录密码

## 🔐 配置步骤

### 步骤 1：启用 SMTP 验证

Outlook 默认已启用 SMTP，无需额外操作。

### 步骤 2：配置环境变量

编辑 `backend/.env` 文件：

```env
# 收件人邮箱（收到咨询通知的邮箱）
CONTACT_EMAIL=hatchyoung@outlook.com

# SMTP 配置（Outlook）
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-outlook-email@outlook.com
SMTP_PASS=your-outlook-password
```

**关键配置说明：**

- `CONTACT_EMAIL`：收到通知的邮箱地址（hatchyoung@outlook.com）
- `SMTP_USER`：你的 Outlook 邮箱地址（发件人）
- `SMTP_PASS`：你的 Outlook 邮箱密码

### 步骤 3：应用专用密码（可选但推荐）

如果你启用了双重验证（Two-Factor Authentication），需要生成应用专用密码：

1. 访问 [Microsoft 账户安全](https://account.microsoft.com/security)
2. 登录你的 Outlook 账户
3. 点击"高级安全选项"
4. 找到"应用密码"，点击"创建新的应用密码"
5. 选择"其他" → 输入"X1官网" → 点击"生成"
6. 复制生成的密码（16位字符），填入 `SMTP_PASS`

### 步骤 4：测试配置

运行测试脚本：

```powershell
node backend/test-email.js
```

如果看到 `✅ 邮件测试成功！`，说明配置正确。

### 步骤 5：重启服务器

```powershell
npm start
```

## ✅ 验证功能

1. 打开浏览器访问 `http://127.0.0.1:4173`
2. 滚动到"联系我们"表单
3. 填写并提交表单
4. 检查 `hatchyoung@outlook.com` 邮箱，应该收到咨询通知邮件

## 📧 邮件内容示例

用户提交咨询后，你会收到如下内容的邮件：

```
主题：[X1官网] 新的合作咨询 - 产品与SDK - 张三

包含信息：
- 姓名/称呼：张三
- 公司/机构：ABC公司
- 联系邮箱：zhangsan@example.com
- 合作方向：产品与SDK
- 需求说明：用户填写的详细需求...
- 提交时间：2026-08-20 15:30 (北京时间)
- 咨询编号：X1-1692529800000
```

## 🔧 常见问题

### Q1: 提示"535 5.7.3 Authentication unsuccessful"

**解决方案：**
- 检查 `SMTP_USER` 和 `SMTP_PASS` 是否正确
- 如果启用了双重验证，必须使用应用专用密码
- 确认邮箱账号未因异常登录被锁定

### Q2: 提示"连接超时"

**解决方案：**
- 检查网络连接是否正常
- 确认防火墙/杀毒软件未阻止 Node.js 访问网络
- 尝试使用端口 25（修改 `SMTP_PORT=25`）

### Q3: 邮件进入垃圾箱

**解决方案：**
- 将发件人地址加入通讯录
- 将邮件标记为"非垃圾邮件"
- Outlook 的发件人地址是 `SMTP_USER` 配置的邮箱

### Q4: 收不到邮件但测试成功

**解决方案：**
- 检查 `CONTACT_EMAIL` 配置是否正确
- 查看后端控制台日志，确认邮件发送状态
- 检查是否被邮件服务商的过滤规则拦截

## 📊 SMTP 配置对比

| 邮箱服务 | SMTP 服务器 | 端口 | 安全连接 |
|---------|------------|------|---------|
| Outlook/Hotmail | smtp-mail.outlook.com | 587 | STARTTLS |
| Gmail | smtp.gmail.com | 587 | STARTTLS |
| QQ邮箱 | smtp.qq.com | 587 | STARTTLS |
| 163邮箱 | smtp.163.com | 25/994 | STARTTLS/SSL |
| SendGrid | smtp.sendgrid.net | 587 | STARTTLS |

## 🔒 安全建议

1. ✅ 已在 `.gitignore` 中排除 `.env` 文件
2. ✅ 使用应用专用密码而非主密码
3. ✅ 定期更换 SMTP 密码
4. ✅ 生产环境建议使用 SendGrid、Mailgun 等专业邮件服务
5. ⚠️ 不要在代码库或文档中硬编码密码

## 📞 需要帮助？

如果遇到问题，请检查：
1. `backend/.env` 文件格式是否正确
2. 邮箱账号密码是否正确
3. 网络连接是否正常
4. 后端日志的错误提示

更多配置选项请参考：`backend/.env.example`
