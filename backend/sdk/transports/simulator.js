'use strict';

const { DeviceTransport } = require('./transport');

class SimulatorTransport extends DeviceTransport {
  constructor(devices, options = {}) {
    super('simulator');
    this.devices = devices;
    this.telemetryListener = null;
    this.latencyMs = options.latencyMs || 0;
    this.jitterMs = options.jitterMs || 0;
  }

  listDevices() {
    return this.devices.map(device => ({ ...device }));
  }

  async connect(deviceId) {
    await this._wait(this.latencyMs * 0.5);
    return this.devices.some(device => device.id === deviceId);
  }

  async sendHaptics(command) {
    const delay = this.latencyMs + (Math.random() - 0.5) * 2 * this.jitterMs;
    await this._wait(Math.max(0, delay));
    return { accepted: true, requestId: command.requestId };
  }

  onTelemetry(listener) {
    this.telemetryListener = listener;
    return () => { this.telemetryListener = null; };
  }

  emitTelemetry(frame) {
    if (this.telemetryListener) this.telemetryListener(frame);
  }

  _wait(ms) {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { SimulatorTransport };
