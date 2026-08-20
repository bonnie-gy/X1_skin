# 链感：智能触觉穿戴企业官网

项目采用前后端分离目录，使用原生 HTML、Tailwind CSS、JavaScript 与 Node.js 实现，不依赖第三方后端框架。

## 目录结构

```text
frontend/
  index.html          页面结构
  styles.css          响应式与视觉样式
  app.js              页面交互与 API 请求
  assets/media/       图片和视频素材
backend/
  server.js           HTTP 服务与 API
  content.json        产品和应用业务数据
  data/               本地联系表单记录
package.json          启动命令
```

## 启动项目

需要 Node.js 18 或更高版本。

```powershell
npm start
```

浏览器访问：`http://127.0.0.1:4173`

开发时可以使用自动重启：

```powershell
npm run dev
```

## 邮件通知配置

联系表单提交后，系统会通过邮件发送通知到指定邮箱。

### 快速配置

1. 复制环境变量模板：
   ```powershell
   copy backend\.env.example backend\.env
   ```

2. 编辑 `backend\.env` 文件，填入你的 SMTP 配置：

   ```env
   # 收件人邮箱（收到咨询通知的邮箱）
   CONTACT_EMAIL=hatchyoung@outlook.com

   # SMTP 配置（以 Outlook 为例）
   SMTP_HOST=smtp-mail.outlook.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@outlook.com
   SMTP_PASS=your-app-password
   ```

3. **测试邮件配置**（推荐）：
   ```powershell
   npm run test:email
   ```

4. 重启服务器：
   ```powershell
   npm start
   ```

### SMTP 配置说明

**Outlook/Hotmail 邮箱：**
- 需要在邮箱设置中启用 SMTP 验证
- 建议使用"应用专用密码"（如果启用了双重验证）

**Gmail 邮箱：**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**SendGrid（推荐用于生产环境）：**
- 注册 SendGrid 账号并创建 API Key
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**QQ邮箱：**
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-qq@qq.com
SMTP_PASS=your-qq-smtp-code
```

> ⚠️ **安全提醒**：`.env` 文件已加入 `.gitignore`，请勿提交到版本控制。生产环境建议使用专业的邮件发送服务（如 SendGrid）。

### 邮件内容

当用户提交咨询表单时，你会收到包含以下信息的邮件：
- 姓名 / 称呼
- 公司 / 机构
- 联系邮箱
- 合作方向
- 需求说明
- 提交时间
- 咨询编号

## 前端修改

- 页面板块和固定文案：修改 `frontend/index.html`
- 颜色、间距、桌面和移动端断点：修改 `frontend/styles.css`
- 产品切换、主题、导航和表单交互：修改 `frontend/app.js`
- 图片和视频：替换 `frontend/assets/media/` 内的同名文件

布局已覆盖手机、平板、1280px、1440px、1920px 及更宽桌面显示器。

## 后端修改

- 产品与行业场景内容：修改 `backend/content.json`
- API 和静态服务：修改 `backend/server.js`
- 联系表单提交后写入：`backend/data/inquiries.ndjson`
- 邮件通知配置：修改 `backend/.env`

现有接口：

- `GET /api/health`：服务状态
- `GET /api/content`：产品和行业应用内容
- `POST /api/contact`：提交合作需求（保存到本地 + 发送邮件通知）

## Vercel 部署

项目根目录已包含 `vercel.json`，部署时保持以下设置：

- Framework Preset：`Other`
- Root Directory：仓库根目录（不要填写 `frontend` 或 `backend`）
- Build Command：留空，使用 `vercel.json` 中的构建配置
- Output Directory：留空，使用 `vercel.json` 中的静态资源路由

推送到 Vercel 关联的 Git 分支后，平台会自动重新部署。部署完成后可访问以下地址检查：

- `/`：网站首页
- `/api/health`：应返回 `{"status":"ok","service":"x1-website"}`
- `/api/content`：应返回产品和行业场景数据

### ⚠️ 重要说明：邮件功能

**Vercel Serverless 函数不支持 SMTP 连接**。如需在 Vercel 部署时使用邮件功能，请：

1. **使用专业邮件 API 服务**（推荐）：
   - SendGrid
   - Mailgun
   - AWS SES

2. **或仅在本地服务器运行邮件功能**，Vercel 部署仅用于展示官网。

配置邮件通知请参考本 README 的"邮件通知配置"部分。

### 环境变量配置

在 Vercel 项目的 Environment Variables 中配置：

- `CONTACT_WEBHOOK_URL`：必填，接收询盘 JSON 的 HTTPS 地址（邮件功能暂不可用）
- `CONTACT_WEBHOOK_TOKEN`：可选，配置后请求会携带 `Authorization: Bearer <token>`

**注意：** Vercel 部署目前只支持 Webhook 通知，不支持 SMTP 邮件发送。

webhook 收到的数据格式为：

```json
{
  "event": "x1.contact.created",
  "inquiry": {
    "id": "X1-...",
    "createdAt": "...",
    "name": "...",
    "company": "...",
    "email": "...",
    "topic": "...",
    "message": "..."
  }
}
```

本地通过 `npm start` 运行时，联系表单仍写入 `backend/data/inquiries.ndjson`。

## 正式发布前

需要补充正式公司名称、商务联系方式、办公地址、备案信息和隐私政策。融资、收入和产品参数目前按商业计划书中的规划或目标口径展示，发布前应以最新正式资料复核。

## SDK 硬件交互演示

本地启动后访问 `http://127.0.0.1:4173/sdk-demo.html`。演示包含两个模拟设备、实时遥测上传、触觉命令、基础规则编排与事件流，可验证电子皮肤输入驱动触觉背心反馈的完整链路。

SDK 交付、API 说明、Unity/Unreal/OpenXR 接入和真实硬件适配清单见 `sdk/README.md`。硬件网关接口位于 `/api/sdk/v1/*`，仅由本地常驻 Node.js 服务提供；Vercel 继续只承载官网，不用于保持串口、BLE 或 UDP 设备连接。
