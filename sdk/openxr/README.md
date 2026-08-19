# X1 OpenXR bridge

OpenXR is the XR action and timing interface, not the X1 device transport. The integration keeps these responsibilities separate:

1. The application creates an OpenXR haptic output action and binds it to the controller or body action path.
2. `xrApplyHapticFeedback` supplies amplitude, duration and frequency.
3. The X1 bridge maps those fields to `intensity`, `durationMs` and `frequencyHz`, adds an X1 body `zone`, then sends `x1.haptics.play` to the local gateway.
4. The gateway resolves the logical zone to the actual connected device and actuator.

Recommended mapping:

| OpenXR | X1 command |
| --- | --- |
| `amplitude` | `intensity` (0 to 1) |
| `duration` | `durationMs` |
| `frequency` | `frequencyHz` |
| action binding path | configured X1 `zone` |

Do not create a private OpenXR extension for the first developer kit. Start with a Unity/Unreal bridge over the standard haptic action API. Consider an extension only when runtime-level body-zone discovery is required and at least two runtimes need the same capability.
