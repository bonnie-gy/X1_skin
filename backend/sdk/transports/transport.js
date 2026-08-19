'use strict';

class DeviceTransport {
  constructor(name) {
    this.name = name;
  }

  listDevices() {
    throw new Error('listDevices() must be implemented');
  }

  async connect() {
    throw new Error('connect() must be implemented');
  }

  async sendHaptics() {
    throw new Error('sendHaptics() must be implemented');
  }

  onTelemetry() {
    throw new Error('onTelemetry() must be implemented');
  }
}

module.exports = { DeviceTransport };
