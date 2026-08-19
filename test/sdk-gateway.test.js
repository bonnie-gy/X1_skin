'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DeviceGateway } = require('../backend/sdk/gateway');
const { ProtocolError } = require('../backend/sdk/protocol');

test('lists multiple devices with stable capabilities', () => {
  const gateway = new DeviceGateway();
  const devices = gateway.listDevices();
  assert.equal(devices.length, 2);
  assert.ok(devices[0].capabilities.hapticZones.length > 0);
});

test('telemetry triggers a cross-device haptic flow', () => {
  const gateway = new DeviceGateway();
  gateway.saveFlow('cross-device', {
    name: 'Skin to vest',
    deviceId: 'x1-skin-sim-02',
    trigger: { channel: 'pressure', operator: '>=', value: 0.7 },
    action: { deviceId: 'x1-vest-sim-01', zones: ['chest'], waveform: 'pulse', intensity: 0.9 },
    cooldownMs: 0
  });

  const result = gateway.ingestTelemetry({
    deviceId: 'x1-skin-sim-02',
    sequence: 7,
    channels: { pressure: 0.82 }
  });

  const command = result.triggered.find(item => item.source === 'flow:cross-device');
  assert.ok(command);
  assert.equal(command.deviceId, 'x1-vest-sim-01');
  assert.deepEqual(command.zones, ['chest']);
  assert.equal(gateway.listEvents(0).events.at(-1).type, 'x1.haptics.play');
});

test('rejects unsupported haptic zones', () => {
  const gateway = new DeviceGateway();
  assert.throws(
    () => gateway.playHaptics('x1-skin-sim-02', { zones: ['chest'] }),
    error => error instanceof ProtocolError && error.code === 'UNSUPPORTED_ZONE'
  );
});

test('cooldown prevents repeated flow commands', () => {
  const gateway = new DeviceGateway();
  const frame = { deviceId: 'x1-skin-sim-02', channels: { pressure: 0.9 } };
  assert.equal(gateway.ingestTelemetry(frame).triggered.length, 1);
  assert.equal(gateway.ingestTelemetry(frame).triggered.length, 0);
});
