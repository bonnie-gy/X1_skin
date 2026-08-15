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

现有接口：

- `GET /api/health`：服务状态
- `GET /api/content`：产品和行业应用内容
- `POST /api/contact`：提交合作需求

## 正式发布前

需要补充正式公司名称、商务联系方式、办公地址、备案信息和隐私政策。融资、收入和产品参数目前按商业计划书中的规划或目标口径展示，发布前应以最新正式资料复核。
