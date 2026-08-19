# X1 Developer Kit SDK 0.1

This directory is the initial software delivery for the X1 developer kit. Run `npm start`, then open `http://127.0.0.1:4173/sdk-demo.html`.

## System boundary

```text
X1 hardware / simulator
        |
  serial, BLE or UDP transport adapter
        |
Local X1 Gateway (device registry, API, event stream, orchestration)
        |
JavaScript SDK | Unity Package | Unreal Plugin | OpenXR bridge
        |
Game, XR application, training software or low-code flow
```

The local gateway is required for hardware interaction. The existing Vercel deployment remains the public website and must not be used for real-time device control because serverless functions do not preserve device connections or in-memory state.

## API contract

All routes are under `/api/sdk/v1`. Payloads use `schemaVersion: "1.0"`. The authoritative HTTP description is [spec/openapi.yaml](spec/openapi.yaml).

| Operation | Route |
| --- | --- |
| Discover devices | `GET /devices` |
| Read latest telemetry | `GET /devices/{deviceId}/telemetry` |
| Upload telemetry | `POST /telemetry` |
| Play a haptic pattern | `POST /devices/{deviceId}/haptics` |
| List flows | `GET /flows` |
| Create or update a flow | `PUT /flows/{flowId}` |
| Run a flow manually | `POST /flows/{flowId}/run` |
| Poll ordered events | `GET /events?after={cursor}` |

Set `SDK_API_KEY` to require `Authorization: Bearer <key>`. Set `SDK_ALLOWED_ORIGIN` when browser clients should be restricted to a known origin. The default configuration is intended only for a local developer kit.

## Low-code orchestration

Version 0.1 intentionally supports a small deterministic graph:

```text
telemetry channel -> comparison -> cooldown -> haptic command
```

See [examples/pressure-flow.json](examples/pressure-flow.json). This format should remain the saved interchange format even after a visual node editor is added. Later nodes should be introduced by a versioned node registry, not arbitrary executable JavaScript.

## Engine delivery

- `unity/` is a Unity Package Manager package. Add it from disk and import `Samples~/PressureDemo`.
- `unreal/X1Haptics/` is an Unreal Engine runtime plugin. Copy it into the project's `Plugins` directory and enable it.
- `openxr/` describes the standard OpenXR haptic mapping. OpenXR stays above the X1 transport layer.
- The browser SDK is served from `/sdk/x1-sdk.js` and exposes `new X1.Client()`.

## Real hardware adapter checklist

Implement `backend/sdk/transports/transport.js` for each physical transport. Before coding the adapter, hardware and firmware teams must freeze:

- device identity, capability discovery and firmware version fields;
- binary frame layout, endianness, CRC and maximum frame size;
- channel units, ranges, sampling rate and batching;
- host/device clock synchronization and monotonic sequence behavior;
- command ACK, timeout, retry, cancellation and safe intensity limits;
- reconnect behavior, firmware update path and diagnostic logs.

The first production adapter should normally be USB serial because it is observable and stable during development. Add BLE after the wire protocol and safety behavior are proven.
