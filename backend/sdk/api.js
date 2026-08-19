'use strict';

const { ProtocolError } = require('./protocol');

function send(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': process.env.SDK_ALLOWED_ORIGIN || '*'
  });
  response.end(JSON.stringify(data));
}

async function handleSdkApi(request, response, pathname, gateway, readBody) {
  if (!pathname.startsWith('/api/sdk/v1/')) return false;

  try {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': process.env.SDK_ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Max-Age': '86400'
      });
      response.end();
      return true;
    }

    const expectedApiKey = process.env.SDK_API_KEY;
    const suppliedApiKey = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (expectedApiKey && suppliedApiKey !== expectedApiKey) {
      send(response, 401, { error: { code: 'UNAUTHORIZED', message: 'A valid SDK API key is required' } });
      return true;
    }

    if (request.method === 'GET' && pathname === '/api/sdk/v1/devices') {
      send(response, 200, { data: gateway.listDevices() });
      return true;
    }

    const telemetryMatch = pathname.match(/^\/api\/sdk\/v1\/devices\/([^/]+)\/telemetry$/);
    if (request.method === 'GET' && telemetryMatch) {
      send(response, 200, { data: gateway.latestTelemetry(decodeURIComponent(telemetryMatch[1])) });
      return true;
    }

    if (request.method === 'POST' && pathname === '/api/sdk/v1/telemetry') {
      const result = gateway.ingestTelemetry(JSON.parse((await readBody(request)) || '{}'));
      send(response, 202, { data: result.frame, triggered: result.triggered });
      return true;
    }

    const hapticsMatch = pathname.match(/^\/api\/sdk\/v1\/devices\/([^/]+)\/haptics$/);
    if (request.method === 'POST' && hapticsMatch) {
      const command = gateway.playHaptics(
        decodeURIComponent(hapticsMatch[1]),
        JSON.parse((await readBody(request)) || '{}')
      );
      send(response, 202, { data: command });
      return true;
    }

    if (request.method === 'GET' && pathname === '/api/sdk/v1/flows') {
      send(response, 200, { data: gateway.listFlows() });
      return true;
    }

    const flowMatch = pathname.match(/^\/api\/sdk\/v1\/flows\/([^/]+)$/);
    if (request.method === 'PUT' && flowMatch) {
      const flow = gateway.saveFlow(
        decodeURIComponent(flowMatch[1]),
        JSON.parse((await readBody(request)) || '{}')
      );
      send(response, 200, { data: flow });
      return true;
    }

    const runFlowMatch = pathname.match(/^\/api\/sdk\/v1\/flows\/([^/]+)\/run$/);
    if (request.method === 'POST' && runFlowMatch) {
      const body = JSON.parse((await readBody(request)) || '{}');
      const command = gateway.runFlow(decodeURIComponent(runFlowMatch[1]), body.deviceId);
      send(response, 202, { data: command });
      return true;
    }

    if (request.method === 'GET' && pathname === '/api/sdk/v1/events') {
      const requestUrl = new URL(request.url, 'http://localhost');
      send(response, 200, { data: gateway.listEvents(Number(requestUrl.searchParams.get('after') || 0)) });
      return true;
    }

    send(response, 404, { error: { code: 'SDK_ROUTE_NOT_FOUND', message: 'SDK route not found' } });
  } catch (error) {
    const statusCode = error instanceof ProtocolError ? error.statusCode : (error instanceof SyntaxError ? 400 : 500);
    const code = error.code || (error instanceof SyntaxError ? 'INVALID_JSON' : 'INTERNAL_ERROR');
    send(response, statusCode, { error: { code, message: error.message } });
  }
  return true;
}

module.exports = { handleSdkApi };
