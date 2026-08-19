#pragma once

/* OpenXR owns action binding and timing; X1 Gateway owns device routing and patterns. */
typedef struct X1OpenXrHapticBridge {
    const char* gateway_url;
    const char* device_id;
    const char* action_path;
    const char* x1_zone;
} X1OpenXrHapticBridge;

/* Map XrHapticVibration: amplitude -> intensity, duration -> durationMs,
   frequency -> frequencyHz, then POST x1.haptics.play through the gateway. */
