const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const {
  createInquiryRecord,
  saveInquiryLocally,
  validateInquiry
} = require('./inquiries');

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const CONTENT_FILE = path.join(__dirname, 'content.json');
const MAX_BODY_SIZE = 64 * 1024;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_SIZE) {
        reject(new Error('REQUEST_TOO_LARGE'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handleApi(request, response, pathname) {
  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', service: 'x1-website' });
    return true;
  }

  if (request.method === 'GET' && pathname === '/api/content') {
    const content = await fs.promises.readFile(CONTENT_FILE, 'utf8');
    sendJson(response, 200, JSON.parse(content));
    return true;
  }

  if (request.method === 'POST' && pathname === '/api/contact') {
    try {
      const rawBody = await readRequestBody(request);
      const parsed = JSON.parse(rawBody || '{}');
      const validation = validateInquiry(parsed);
      if (validation.error) {
        sendJson(response, 400, { ok: false, message: validation.error });
        return true;
      }

      const record = createInquiryRecord(validation.inquiry);
      await saveInquiryLocally(record);
      sendJson(response, 201, { ok: true, id: record.id, message: '合作需求已提交，我们会尽快与您联系。' });
    } catch (error) {
      const status = error.message === 'REQUEST_TOO_LARGE' ? 413 : 400;
      sendJson(response, status, { ok: false, message: status === 413 ? '提交内容过大。' : '提交数据格式不正确。' });
    }
    return true;
  }

  return false;
}

async function serveStatic(request, response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = path.resolve(FRONTEND_DIR, `.${decodedPath}`);

  if (!filePath.startsWith(`${FRONTEND_DIR}${path.sep}`)) {
    sendJson(response, 403, { message: 'Forbidden' });
    return;
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error('NOT_FILE');
    const extension = path.extname(filePath).toLowerCase();
    const noCacheExtensions = new Set(['.html', '.css', '.js', '.json']);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': noCacheExtensions.has(extension) ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { message: 'Not found' });
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
    if (await handleApi(request, response, url.pathname)) return;
    await serveStatic(request, response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { message: 'Internal server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`X1 website running at http://${HOST}:${PORT}`);
});
