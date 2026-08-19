using System;

namespace X1.Haptics
{
    [Serializable] public class TelemetryChannels
    {
        public float pressure;
        public float stretch;
        public float motion;
    }

    [Serializable] public class TelemetryFrame
    {
        public string deviceId;
        public int sequence;
        public string timestamp;
        public TelemetryChannels channels;
        public Metadata metadata;
    }

    [Serializable] public class Metadata { public string source = "unity"; }

    [Serializable] public class HapticCommand
    {
        public string[] zones;
        public string waveform = "pulse";
        public float intensity = 0.8f;
        public int durationMs = 180;
        public int frequencyHz = 120;
        public string source = "unity";
    }
}
