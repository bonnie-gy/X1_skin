const x1 = new X1.Client({ baseUrl: 'http://127.0.0.1:4173' });

async function pressureToHaptics(pressure) {
  await x1.telemetry.upload({
    deviceId: 'x1-skin-sim-02',
    sequence: Date.now(),
    channels: { pressure },
    metadata: { source: 'browser-example' }
  });

  if (pressure >= 0.68) {
    await x1.devices.playHaptics('x1-vest-sim-01', {
      zones: ['chest'],
      waveform: 'pulse',
      intensity: 0.82,
      durationMs: 180
    });
  }
}
