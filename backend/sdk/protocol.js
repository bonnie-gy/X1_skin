'use strict';

const SCHEMA_VERSION = '1.0';
const HAPTIC_WAVEFORMS = new Set(['constant', 'pulse', 'click', 'heartbeat']);

class ProtocolError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function asNumber(value, field, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new ProtocolError(`${field} must be between ${minimum} and ${maximum}`, 'INVALID_FIELD');
  }
  return number;
}

function normalizeTelemetry(input) {
  if (!input || typeof input !== 'object') {
    throw new ProtocolError('Telemetry body is required', 'INVALID_TELEMETRY');
  }
  if (!input.deviceId || typeof input.deviceId !== 'string') {
    throw new ProtocolError('deviceId is required', 'DEVICE_ID_REQUIRED');
  }
  const channels = input.channels && typeof input.channels === 'object' ? input.channels : {};
  const normalizedChannels = {};
  Object.entries(channels).forEach(([name, value]) => {
    normalizedChannels[name] = asNumber(value, `channels.${name}`, -100000, 100000);
  });
  if (!Object.keys(normalizedChannels).length) {
    throw new ProtocolError('At least one telemetry channel is required', 'CHANNEL_REQUIRED');
  }

  return {
    type: 'x1.telemetry.frame',
    schemaVersion: SCHEMA_VERSION,
    deviceId: input.deviceId,
    sequence: Number.isInteger(input.sequence) ? input.sequence : 0,
    timestamp: input.timestamp || new Date().toISOString(),
    channels: normalizedChannels,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {}
  };
}

function normalizeHapticCommand(deviceId, input) {
  if (!input || typeof input !== 'object') {
    throw new ProtocolError('Haptic command body is required', 'INVALID_COMMAND');
  }
  const waveform = input.waveform || 'pulse';
  if (!HAPTIC_WAVEFORMS.has(waveform)) {
    throw new ProtocolError(`Unsupported waveform: ${waveform}`, 'UNSUPPORTED_WAVEFORM');
  }
  const zones = Array.isArray(input.zones) ? input.zones.filter(Boolean).map(String) : [];
  if (!zones.length) throw new ProtocolError('At least one zone is required', 'ZONE_REQUIRED');

  return {
    type: 'x1.haptics.play',
    schemaVersion: SCHEMA_VERSION,
    requestId: input.requestId || `cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    deviceId,
    zones,
    waveform,
    intensity: asNumber(input.intensity == null ? 0.7 : input.intensity, 'intensity', 0, 1),
    durationMs: Math.round(asNumber(input.durationMs == null ? 180 : input.durationMs, 'durationMs', 10, 10000)),
    frequencyHz: Math.round(asNumber(input.frequencyHz == null ? 120 : input.frequencyHz, 'frequencyHz', 1, 1000)),
    source: input.source || 'api'
  };
}

function normalizeFlow(input, id) {
  if (!input || typeof input !== 'object') throw new ProtocolError('Flow body is required', 'INVALID_FLOW');
  const trigger = input.trigger || {};
  const action = input.action || {};
  const operators = new Set(['>', '>=', '<', '<=', '==']);
  if (!trigger.channel || !operators.has(trigger.operator)) {
    throw new ProtocolError('A valid trigger channel and operator are required', 'INVALID_TRIGGER');
  }

  return {
    id: id || input.id || `flow-${Date.now()}`,
    name: String(input.name || 'Untitled flow'),
    enabled: input.enabled !== false,
    deviceId: input.deviceId || '*',
    trigger: {
      channel: String(trigger.channel),
      operator: trigger.operator,
      value: asNumber(trigger.value, 'trigger.value', -100000, 100000)
    },
    action: {
      deviceId: action.deviceId || '$source',
      zones: Array.isArray(action.zones) ? action.zones.map(String) : ['chest'],
      waveform: action.waveform || 'pulse',
      intensity: action.intensity == null ? 0.8 : action.intensity,
      durationMs: action.durationMs == null ? 180 : action.durationMs,
      frequencyHz: action.frequencyHz == null ? 120 : action.frequencyHz
    },
    cooldownMs: Math.round(asNumber(input.cooldownMs == null ? 500 : input.cooldownMs, 'cooldownMs', 0, 60000))
  };
}

module.exports = {
  ProtocolError,
  SCHEMA_VERSION,
  normalizeFlow,
  normalizeHapticCommand,
  normalizeTelemetry
};
