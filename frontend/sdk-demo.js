'use strict';

const sdk = new X1.Client({ timeoutMs: 4000 });
const elements = {
  gatewayDot: document.querySelector('#gatewayDot'),
  gatewayText: document.querySelector('#gatewayText'),
  deviceCount: document.querySelector('#deviceCount'),
  deviceList: document.querySelector('#deviceList'),
  transportName: document.querySelector('#transportName'),
  streamToggle: document.querySelector('#streamToggle'),
  pressureValue: document.querySelector('#pressureValue'),
  pressureInput: document.querySelector('#pressureInput'),
  pressureOutput: document.querySelector('#pressureOutput'),
  sendFrameButton: document.querySelector('#sendFrameButton'),
  thresholdInput: document.querySelector('#thresholdInput'),
  thresholdOutput: document.querySelector('#thresholdOutput'),
  targetDeviceSelect: document.querySelector('#targetDeviceSelect'),
  zoneSelect: document.querySelector('#zoneSelect'),
  waveformSelect: document.querySelector('#waveformSelect'),
  intensityInput: document.querySelector('#intensityInput'),
  intensityOutput: document.querySelector('#intensityOutput'),
  actionSummary: document.querySelector('#actionSummary'),
  saveFlowButton: document.querySelector('#saveFlowButton'),
  playButton: document.querySelector('#playButton'),
  eventLog: document.querySelector('#eventLog'),
  clearLogButton: document.querySelector('#clearLogButton'),
  latencyValue: document.querySelector('#latencyValue'),
  chart: document.querySelector('#signalChart')
};

let devices = [];
let selectedDeviceId = '';
let targetDeviceId = '';
let sequence = 0;
let eventCursor = 0;
let uploadPending = false;
let samples = Array(90).fill(0);

function log(message, type) {
  const item = document.createElement('li');
  item.className = type || '';
  item.textContent = `${new Date().toLocaleTimeString('zh-CN', { hour12: false })}  ${message}`;
  elements.eventLog.prepend(item);
  while (elements.eventLog.children.length > 60) elements.eventLog.lastChild.remove();
}

function setGatewayOnline(online, message) {
  elements.gatewayDot.classList.toggle('online', online);
  elements.gatewayText.textContent = message;
}

function renderDevices() {
  elements.deviceCount.textContent = devices.length;
  elements.deviceList.innerHTML = devices.map(device => `
    <button class="device-item ${device.id === selectedDeviceId ? 'active' : ''}" data-device-id="${device.id}" type="button">
      <strong>${device.name}</strong>
      <span><i></i>${device.status} / ${device.model}</span>
    </button>
  `).join('');
  const active = devices.find(device => device.id === selectedDeviceId);
  if (active) elements.transportName.textContent = active.transport;
}

function renderTargetDevices() {
  elements.targetDeviceSelect.innerHTML = devices.map(device =>
    `<option value="${device.id}">${device.name}</option>`
  ).join('');
  elements.targetDeviceSelect.value = targetDeviceId;
  renderZones();
}

function renderZones() {
  const target = devices.find(device => device.id === targetDeviceId);
  const labels = { chest: '胸部', back: '背部', 'left-arm': '左臂', 'right-arm': '右臂', patch: '贴片' };
  const previous = elements.zoneSelect.value;
  const zones = target?.capabilities.hapticZones || [];
  elements.zoneSelect.innerHTML = zones.map(zone => `<option value="${zone}">${labels[zone] || zone}</option>`).join('');
  if (zones.includes(previous)) elements.zoneSelect.value = previous;
  updateControlLabels();
}

function updateControlLabels() {
  elements.pressureOutput.value = Number(elements.pressureInput.value).toFixed(2);
  elements.thresholdOutput.value = Number(elements.thresholdInput.value).toFixed(2);
  elements.intensityOutput.value = Number(elements.intensityInput.value).toFixed(2);
  elements.actionSummary.textContent = `${elements.zoneSelect.value} / ${elements.waveformSelect.value}`;
}

function drawChart() {
  const canvas = elements.chart;
  const context = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.strokeStyle = '#1d292e';
  context.lineWidth = 1;
  for (let row = 1; row < 4; row += 1) {
    context.beginPath();
    context.moveTo(0, (height / 4) * row);
    context.lineTo(width, (height / 4) * row);
    context.stroke();
  }
  const thresholdY = height - Number(elements.thresholdInput.value) * height;
  context.strokeStyle = '#6f853a';
  context.setLineDash([4, 5]);
  context.beginPath();
  context.moveTo(0, thresholdY);
  context.lineTo(width, thresholdY);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = '#57d7d1';
  context.lineWidth = 2;
  context.beginPath();
  samples.forEach((sample, index) => {
    const x = (index / (samples.length - 1)) * width;
    const y = height - sample * height;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  });
  context.stroke();
}

function flashZones(zones) {
  zones.forEach(zone => {
    const button = document.querySelector(`[data-zone="${zone}"]`);
    if (!button) return;
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 220);
  });
}

async function uploadFrame(pressure) {
  if (!selectedDeviceId || uploadPending) return;
  uploadPending = true;
  const startedAt = performance.now();
  try {
    const frame = await sdk.telemetry.upload({
      deviceId: selectedDeviceId,
      sequence: sequence += 1,
      timestamp: new Date().toISOString(),
      channels: {
        pressure: Number(pressure.toFixed(3)),
        stretch: Number((pressure * 0.72).toFixed(3)),
        motion: Number((Math.abs(Math.sin(Date.now() / 760)) * 0.45).toFixed(3))
      },
      metadata: { source: 'sdk-browser-demo' }
    });
    elements.latencyValue.textContent = `${Math.round(performance.now() - startedAt)} ms`;
    setGatewayOnline(true, '本地设备网关在线');
    return frame;
  } catch (error) {
    setGatewayOnline(false, '设备网关离线');
    log(`${error.code || 'ERROR'} ${error.message}`, 'error');
  } finally {
    uploadPending = false;
  }
}

async function pollEvents() {
  try {
    const result = await sdk.events.list(eventCursor);
    eventCursor = result.cursor;
    result.events.forEach(event => {
      if (event.type === 'x1.haptics.play') {
        flashZones(event.payload.zones);
        log(`HAPTIC ${event.payload.zones.join(',')} ${event.payload.waveform} @ ${event.payload.intensity}`, 'command');
      } else if (event.type === 'x1.flow.updated') {
        log(`FLOW ${event.payload.id} updated`);
      } else if (event.type === 'x1.telemetry.frame' && event.cursor % 8 === 0) {
        log(`TELEMETRY #${event.payload.sequence} pressure=${event.payload.channels.pressure}`);
      }
    });
  } catch (error) {
    setGatewayOnline(false, '设备网关离线');
  }
}

async function saveFlow() {
  elements.saveFlowButton.disabled = true;
  try {
    await sdk.flows.save('pressure-to-chest-pulse', {
      name: 'Pressure feedback demo',
      enabled: true,
      deviceId: selectedDeviceId,
      trigger: { channel: 'pressure', operator: '>=', value: Number(elements.thresholdInput.value) },
      action: {
        deviceId: targetDeviceId,
        zones: [elements.zoneSelect.value],
        waveform: elements.waveformSelect.value,
        intensity: Number(elements.intensityInput.value),
        durationMs: 180,
        frequencyHz: 120
      },
      cooldownMs: 650
    });
    log('编排已保存并启用', 'command');
  } catch (error) {
    log(`${error.code || 'ERROR'} ${error.message}`, 'error');
  } finally {
    elements.saveFlowButton.disabled = false;
  }
}

async function playHaptics(zone) {
  elements.playButton.disabled = true;
  try {
    await sdk.devices.playHaptics(targetDeviceId, {
      zones: [zone || elements.zoneSelect.value],
      waveform: elements.waveformSelect.value,
      intensity: Number(elements.intensityInput.value),
      durationMs: 180,
      frequencyHz: 120,
      source: 'sdk-browser-demo'
    });
  } catch (error) {
    log(`${error.code || 'ERROR'} ${error.message}`, 'error');
  } finally {
    elements.playButton.disabled = false;
  }
}

async function initialize() {
  try {
    devices = await sdk.devices.list();
    selectedDeviceId = devices[0]?.id || '';
    targetDeviceId = devices.find(device => device.capabilities.hapticZones.includes('chest'))?.id || selectedDeviceId;
    renderDevices();
    renderTargetDevices();
    const flows = await sdk.flows.list();
    const flow = flows.find(item => item.id === 'pressure-to-chest-pulse');
    if (flow) {
      if (flow.deviceId !== '*' && devices.some(device => device.id === flow.deviceId)) {
        selectedDeviceId = flow.deviceId;
        renderDevices();
      }
      elements.thresholdInput.value = flow.trigger.value;
      targetDeviceId = flow.action.deviceId === '$source' ? selectedDeviceId : flow.action.deviceId;
      renderTargetDevices();
      elements.zoneSelect.value = flow.action.zones[0];
      elements.waveformSelect.value = flow.action.waveform;
      elements.intensityInput.value = flow.action.intensity;
    }
    updateControlLabels();
    setGatewayOnline(true, '本地设备网关在线');
    log(`SDK ${X1.VERSION} ready / ${devices.length} devices`);
  } catch (error) {
    setGatewayOnline(false, '请通过 npm start 启动网关');
    log(`${error.code || 'ERROR'} ${error.message}`, 'error');
  }
}

elements.deviceList.addEventListener('click', event => {
  const button = event.target.closest('[data-device-id]');
  if (!button) return;
  selectedDeviceId = button.dataset.deviceId;
  renderDevices();
});
elements.pressureInput.addEventListener('input', updateControlLabels);
elements.thresholdInput.addEventListener('input', () => { updateControlLabels(); drawChart(); });
elements.intensityInput.addEventListener('input', updateControlLabels);
elements.targetDeviceSelect.addEventListener('change', () => {
  targetDeviceId = elements.targetDeviceSelect.value;
  renderZones();
});
elements.zoneSelect.addEventListener('change', updateControlLabels);
elements.waveformSelect.addEventListener('change', updateControlLabels);
elements.sendFrameButton.addEventListener('click', () => uploadFrame(Number(elements.pressureInput.value)));
elements.saveFlowButton.addEventListener('click', saveFlow);
elements.playButton.addEventListener('click', () => playHaptics());
elements.clearLogButton.addEventListener('click', () => { elements.eventLog.innerHTML = ''; });
document.querySelectorAll('[data-zone]').forEach(button => button.addEventListener('click', () => {
  const compatibleTarget = devices.find(device => device.capabilities.hapticZones.includes(button.dataset.zone));
  if (compatibleTarget) {
    targetDeviceId = compatibleTarget.id;
    renderTargetDevices();
  }
  elements.zoneSelect.value = button.dataset.zone;
  updateControlLabels();
  playHaptics(button.dataset.zone);
}));

setInterval(() => {
  const base = Number(elements.pressureInput.value);
  const pressure = elements.streamToggle.checked
    ? Math.max(0, Math.min(1, base + Math.sin(Date.now() / 430) * 0.18 + (Math.random() - 0.5) * 0.06))
    : base;
  elements.pressureValue.textContent = pressure.toFixed(2);
  samples.push(pressure);
  samples = samples.slice(-90);
  drawChart();
  if (elements.streamToggle.checked) uploadFrame(pressure);
}, 180);
setInterval(pollEvents, 360);
window.addEventListener('resize', drawChart);

updateControlLabels();
drawChart();
initialize();
