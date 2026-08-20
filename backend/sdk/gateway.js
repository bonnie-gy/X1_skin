'use strict';

const {
  ProtocolError,
  normalizeFlow,
  normalizeHapticCommand,
  normalizeTelemetry
} = require('./protocol');
const { SimulatorTransport } = require('./transports/simulator');

const DEFAULT_DEVICES = [
  {
    id: 'x1-vest-sim-01',
    name: 'X1 Haptic Vest Simulator',
    model: 'X1-VEST-DEV',
    transport: 'simulator',
    status: 'connected',
    firmwareVersion: '0.1.0-sim',
    capabilities: {
      telemetryChannels: ['pressure', 'stretch', 'motion'],
      hapticZones: ['chest', 'back', 'left-arm', 'right-arm'],
      waveforms: ['constant', 'pulse', 'click', 'heartbeat']
    }
  },
  {
    id: 'x1-skin-sim-02',
    name: 'X1 Skin Patch Simulator',
    model: 'X1-SKIN-DEV',
    transport: 'simulator',
    status: 'connected',
    firmwareVersion: '0.1.0-sim',
    capabilities: {
      telemetryChannels: ['pressure', 'stretch'],
      hapticZones: ['patch'],
      waveforms: ['constant', 'pulse', 'click']
    }
  }
];

class DeviceGateway {
  constructor() {
    const simulator = new SimulatorTransport(DEFAULT_DEVICES, {
      latencyMs: 35,
      jitterMs: 15
    });
    this.transports = new Map([[simulator.name, simulator]]);
    this.devices = new Map(simulator.listDevices().map(device => [device.id, device]));
    this.telemetry = new Map();
    this.commands = new Map();
    this.flows = new Map();
    this.flowRuntime = new Map();
    this.events = [];
    this.cursor = 0;

    const defaultFlow = normalizeFlow({
      id: 'pressure-to-chest-pulse',
      name: 'Pressure to chest pulse',
      deviceId: 'x1-skin-sim-02',
      enabled: true,
      trigger: { channel: 'pressure', operator: '>=', value: 0.68 },
      action: { deviceId: 'x1-vest-sim-01', zones: ['chest'], waveform: 'pulse', intensity: 0.82, durationMs: 180 },
      cooldownMs: 650
    });
    this.flows.set(defaultFlow.id, defaultFlow);
  }

  listDevices() {
    return Array.from(this.devices.values()).map(device => ({
      ...device,
      lastSeenAt: this.telemetry.get(device.id)?.timestamp || null,
      lastCommand: this.commands.get(device.id) || null
    }));
  }

  getDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) throw new ProtocolError(`Unknown device: ${deviceId}`, 'DEVICE_NOT_FOUND', 404);
    return device;
  }

  ingestTelemetry(input) {
    const frame = normalizeTelemetry(input);
    this.getDevice(frame.deviceId);
    this.telemetry.set(frame.deviceId, frame);
    this.addEvent(frame.type, frame);
    const triggered = this.evaluateFlows(frame);
    return { frame, triggered };
  }

  latestTelemetry(deviceId) {
    this.getDevice(deviceId);
    return this.telemetry.get(deviceId) || null;
  }

  playHaptics(deviceId, input) {
    const device = this.getDevice(deviceId);
    const command = normalizeHapticCommand(deviceId, input);
    command.zones.forEach(zone => {
      if (!device.capabilities.hapticZones.includes(zone)) {
        throw new ProtocolError(`Device ${deviceId} does not support zone ${zone}`, 'UNSUPPORTED_ZONE');
      }
    });
    this.commands.set(deviceId, command);
    const transport = this.transports.get(device.transport);
    if (transport) transport.sendHaptics(command).catch(error => this.addEvent('x1.transport.error', {
      deviceId,
      message: error.message
    }));
    this.addEvent(command.type, command);
    return command;
  }

  listFlows() {
    return Array.from(this.flows.values());
  }

  saveFlow(flowId, input) {
    const flow = normalizeFlow(input, flowId);
    this.flows.set(flow.id, flow);
    this.addEvent('x1.flow.updated', flow);
    return flow;
  }

  runFlow(flowId, sourceDeviceId) {
    const flow = this.flows.get(flowId);
    if (!flow) throw new ProtocolError(`Unknown flow: ${flowId}`, 'FLOW_NOT_FOUND', 404);
    const deviceId = flow.action.deviceId === '$source'
      ? (sourceDeviceId || (flow.deviceId === '*' ? this.listDevices()[0]?.id : flow.deviceId))
      : flow.action.deviceId;
    return this.playHaptics(deviceId, { ...flow.action, source: `flow:${flow.id}` });
  }

  evaluateFlows(frame) {
    const now = Date.now();
    const triggered = [];
    this.flows.forEach(flow => {
      if (!flow.enabled || (flow.deviceId !== '*' && flow.deviceId !== frame.deviceId)) return;
      const actual = frame.channels[flow.trigger.channel];
      if (actual == null || !this.compare(actual, flow.trigger.operator, flow.trigger.value)) return;
      const lastRun = this.flowRuntime.get(flow.id) || 0;
      if (now - lastRun < flow.cooldownMs) return;
      this.flowRuntime.set(flow.id, now);
      triggered.push(this.runFlow(flow.id, frame.deviceId));
    });
    return triggered;
  }

  compare(actual, operator, expected) {
    if (operator === '>') return actual > expected;
    if (operator === '>=') return actual >= expected;
    if (operator === '<') return actual < expected;
    if (operator === '<=') return actual <= expected;
    return actual === expected;
  }

  addEvent(type, payload) {
    this.cursor += 1;
    this.events.push({ cursor: this.cursor, type, timestamp: new Date().toISOString(), payload });
    if (this.events.length > 300) this.events.shift();
  }

  listEvents(after = 0) {
    return {
      cursor: this.cursor,
      events: this.events.filter(event => event.cursor > after)
    };
  }
}

module.exports = { DeviceGateway };
