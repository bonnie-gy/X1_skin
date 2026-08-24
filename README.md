# 链感——智能触觉穿戴企业官网

项目采用前后端分离目录，使用原生 HTML、Tailwind CSS、JavaScript 与 Node.js 实现，不依赖第三方后端框架。

## 项目简介

链感致力于研发"锁子甲式链锁反应躯震"智能穿戴设备，核心方向聚焦于"智能材料"与"柔性电子皮肤"两大前沿领域，实现刚柔并济的全感触控体验。系统主要由两类材料构成：

- **基础骨架（结构材料）**：宏观层面采用加州理工学院团队设计的 3D 打印聚合物联锁面料，自然状态柔软可弯折，通过压缩颗粒锁紧后硬度可提升 25 倍、承重超自身 30 倍；微观层面探索西湖大学团队合成的分子级"机械互锁聚合物"（MIPs），用分子"活扣"编织出二维"锁子甲"，分子链可滑动，具有出色的拉伸性和弹性。此外，热塑性聚氨酯等聚合物也常作为柔性基底，为电子元件提供拉伸和支撑。
- **"神经网络"（传感与反馈材料）**：集成 MXene/碳纳米管复合材料（模拟珍珠层结构制成的"电子皮肤"，灵敏度因子 5.8×10⁴，能精准监测脉搏、发声、运动等微小形变）、金纳米薄膜与激光诱导石墨烯智能手套（压力和手指弯曲检测准确率分别高达 98% 和 97%）、银纳米线(AgNWs)与氧化锌(ZnO)纳米棒压电传感器（80% 拉伸应变下仍保持 173.5 mV/kPa 高灵敏度）等高灵敏度传感材料。信号传导方面，银纳米线常与 PDMS 或壳聚糖复合制成柔性拉伸电极，铜-弹性体复合材料用于可拉伸电路。触觉反馈执行器包括微型震动马达、基于铜线圈和永磁体的振动执行器（可实现对皮肤的毫米级精细触觉反馈），结合形状记忆合金还能模拟冷热和压力感。

智能贴身衣物技术已具备可行性，可通过体温监测传感与个人热管理技术实现自适应温度调节。体温监测方面，CORE 体温监测器精度高达 ±0.21°C；前沿研究已将碳基热敏电阻集成到 T 恤中，实现 1.77 秒快速响应并通过蓝牙实时传输，还有多功能纳米纤维衣服可同时监测体温、呼吸等多种信号。个人热管理方面，被动调节利用辐射制冷或制热材料无需耗能，主动调节通过微型热电模块或相变材料实现——过去三年微型热电模块效率已提升近 40%。最关键的趋势是传感和调节技术正在整合，通过 AI 算法处理传感器数据，有望实现对温度的自适应精准调节，打造"监测-分析-调节-反馈"的闭环系统。

市场正处于高速增长期：2025 年全球智能温控服饰市场规模已突破 65 亿美元，预计年复合增长率（CAGR）维持 28% 以上；温控智能夹克 2025 年全球市场规模超 15 亿美元，CAGR 超 25%。体征监测智能服装方面，截至 2026 年第一季度全球已部署超 1200 万件，预计 2030 年市场规模突破 340 亿美元。作为对比，消费级可穿戴设备 2026-2032 年累计营收预计超 1 万亿美元，CAGR 为 12%，智能服装赛道增速远高于行业平均水平。特别值得关注的是，中东与非洲等极端环境地区特种智能防护服订单量 2026 年同比激增 66%；西欧暑期极度高温频发，未来也有望将技术发展到恒温罩领域。

当前核心应用场景集中在极端环境作业保护：工地与户外作业（预防热射病），数据显示到 2050 年美国因极端高温可能导致每年 45 万起工伤和 5000 亿美元的生产率损失，美国军方已研发出通过监测心率、皮肤温度等数据评估热射病风险的算法并整合到可穿戴设备中；特种作业与军事领域，极地科考、电力巡检、消防等场景对智能服装需求刚性极强，军事与消防领域采购预算较 2025 年同期增长 82%，工业级产品单价通常是消费级的 5 至 10 倍。技术上已初步走通，正优先在专业和工业领域落地，未来有望逐步走向大众消费市场。

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

### 邮件环境变量

Vercel Serverless 函数不使用 SMTP，而是通过 Resend HTTPS API 发送联系表单通知。在 Vercel 项目的 Production Environment Variables 中配置：

- `RESEND_API_KEY`：Resend Sending access API Key
- `CONTACT_EMAIL`：接收询盘的邮箱
- `CONTACT_FROM_EMAIL`：Resend 允许的发件人地址

可以通过 Vercel Dashboard 配置，也可以运行：

```powershell
npx vercel env add RESEND_API_KEY production --sensitive
npx vercel env add CONTACT_EMAIL production --sensitive
npx vercel env add CONTACT_FROM_EMAIL production --sensitive
npx vercel --prod
```

只有 Resend 明确返回邮件 ID 后，`POST /api/contact` 才会返回成功。未配置或投递请求失败时，接口返回错误，前端保留用户填写的内容。

## Cloudflare Workers 备用部署

项目也可以通过 `wrangler.jsonc` 部署到 Cloudflare Worker `x1-skin`。Worker 同时提供 `frontend/` 静态资源、`/api/health`、`/api/content` 和 `/api/contact`。

```powershell
npm install
npm test
npm run cf:deploy
```

联系表单在 Workers 环境中使用 Resend HTTPS API，不使用 SMTP。发布前需要在 Resend 验证发件域名，并给 Worker 配置以下 Secret：

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_EMAIL
npx wrangler secret put CONTACT_FROM_EMAIL
```

- `RESEND_API_KEY`：Resend API Key
- `CONTACT_EMAIL`：接收询盘的邮箱，例如 `hatchyoung@outlook.com`
- `CONTACT_FROM_EMAIL`：Resend 已验证的发件人，例如 `X1 Website <contact@example.com>`

Secret 配置完成后再次运行 `npm run cf:deploy`。邮件服务未配置或发送失败时，接口会返回错误，不会向用户误报发送成功。

未验证自有域名时，Resend 的测试发件人 `onboarding@resend.dev` 只能向 Resend 账号邮箱发送。当前部署暂时发送到 `guoy38529@gmail.com`；验证自有域名后才能稳定切换到其他收件地址。

本地通过 `npm start` 运行时，联系表单仍写入 `backend/data/inquiries.ndjson`。

## 正式发布前

需要补充正式公司名称、商务联系方式、办公地址、备案信息和隐私政策。融资、收入和产品参数目前按商业计划书中的规划或目标口径展示，发布前应以最新正式资料复核。

## SDK 硬件交互演示

本地启动后访问 `http://127.0.0.1:4173/sdk-demo.html`。演示包含两个模拟设备、实时遥测上传、触觉命令、基础规则编排与事件流，可验证电子皮肤输入驱动触觉背心反馈的完整链路。

SDK 交付、API 说明、Unity/Unreal/OpenXR 接入和真实硬件适配清单见 `sdk/README.md`。硬件网关接口位于 `/api/sdk/v1/*`，仅由本地常驻 Node.js 服务提供；Vercel 继续只承载官网，不用于保持串口、BLE 或 UDP 设备连接。
