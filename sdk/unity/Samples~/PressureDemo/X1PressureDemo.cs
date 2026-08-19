using System;
using UnityEngine;
using X1.Haptics;

public sealed class X1PressureDemo : MonoBehaviour
{
    [Range(0, 1)] public float pressure;
    public string sensorDeviceId = "x1-skin-sim-02";
    public string vestDeviceId = "x1-vest-sim-01";
    private X1Client client;
    private int sequence;

    private void Awake() { client = new X1Client(); }

    public void UploadPressure()
    {
        var frame = new TelemetryFrame {
            deviceId = sensorDeviceId,
            sequence = ++sequence,
            timestamp = DateTime.UtcNow.ToString("o"),
            channels = new TelemetryChannels { pressure = pressure },
            metadata = new Metadata()
        };
        StartCoroutine(client.UploadTelemetry(frame, Debug.Log, Debug.LogError));
    }

    public void PulseChest()
    {
        var command = new HapticCommand { zones = new[] { "chest" } };
        StartCoroutine(client.PlayHaptics(vestDeviceId, command, Debug.Log, Debug.LogError));
    }
}
