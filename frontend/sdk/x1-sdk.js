(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.X1 = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ApiError extends Error {
    constructor(message, options) {
      super(message);
      this.name = 'X1ApiError';
      this.status = options.status;
      this.code = options.code;
      this.details = options.details;
    }
  }

  class Client {
    constructor(options) {
      const config = options || {};
      this.baseUrl = String(config.baseUrl || '').replace(/\/$/, '');
      this.apiKey = config.apiKey || '';
      this.timeoutMs = Number(config.timeoutMs || 5000);
      this.fetch = config.fetch || globalThis.fetch.bind(globalThis);

      this.devices = {
        list: () => this.request('GET', '/api/sdk/v1/devices'),
        telemetry: deviceId => this.request('GET', `/api/sdk/v1/devices/${encodeURIComponent(deviceId)}/telemetry`),
        playHaptics: (deviceId, command) => this.request('POST', `/api/sdk/v1/devices/${encodeURIComponent(deviceId)}/haptics`, command)
      };
      this.telemetry = {
        upload: frame => this.request('POST', '/api/sdk/v1/telemetry', frame)
      };
      this.flows = {
        list: () => this.request('GET', '/api/sdk/v1/flows'),
        save: (flowId, flow) => this.request('PUT', `/api/sdk/v1/flows/${encodeURIComponent(flowId)}`, flow),
        run: (flowId, deviceId) => this.request('POST', `/api/sdk/v1/flows/${encodeURIComponent(flowId)}/run`, { deviceId })
      };
      this.events = {
        list: after => this.request('GET', `/api/sdk/v1/events?after=${Number(after || 0)}`)
      };
    }

    async request(method, path, body) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

      try {
        const response = await this.fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = payload.error || payload;
          throw new ApiError(error.message || `Request failed (${response.status})`, {
            status: response.status,
            code: error.code || 'REQUEST_FAILED',
            details: payload
          });
        }
        return payload.data;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timed out', { status: 0, code: 'TIMEOUT' });
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  return { ApiError, Client, VERSION: '0.1.0' };
}));
