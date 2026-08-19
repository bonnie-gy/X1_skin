'use strict';

const { DeviceTransport } = require('./transport');

class SimulatorTransport extends DeviceTransport {
  constructor(devices) {
    super('simulator');
    this.devices = devices;
    this.telemetryListener = null;
  }

  listDevices() {
    return this.devices.map(device => ({ ...device }));
  }

  async connect(deviceId) {
    return this.devices.some(device => device.id === deviceId);
  }

  async sendHaptics(command) {
    return { accepted: true, requestId: command.requestId };
  }

  onTelemetry(listener) {
    this.telemetryListener = listener;
    return () => { this.telemetryListener = null; };
  }

  emitTelemetry(frame) {
    if (this.telemetryListener) this.telemetryListener(frame);
  }
}

module.exports = { SimulatorTransport };
