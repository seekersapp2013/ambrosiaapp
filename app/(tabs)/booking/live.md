Now let me read the key LiveKit component files and backend functions:

Now let me find the LiveStreamControls and any metro/webpack config for the native stub:

I now have all the essential files. Let me provide the comprehensive response.

Now let me look at a few more critical files to complete the picture:

Now I have a comprehensive picture of the codebase. Let me provide the detailed phased plan.

---

## Investigation Summary & Phased Plan

After thoroughly examining the codebase, here's what I found and my recommended phased approach to resolve all three issues.

---

### Root Cause Analysis

**Bug 1: Blank video screen on mobile APK (works on web)**

There are **two critical issues** causing this:

1. **Missing `@livekit/react-native` in `app.json` plugins array.** The Expo plugins list in `app.json` does NOT include `@livekit/react-native`. This plugin is required to properly configure the native iOS/Android projects — it sets up the native WebRTC module registration, background modes, and necessary build settings. Without it, the native module may partially load (enough that `registerGlobals()` succeeds) but video rendering via `VideoView` fails silently.

2. **Room instantiation uses raw `livekit-client` instead of the `@livekit/react-native` wrapper's Room.** In `LiveStreamRoom.tsx` (line 588), the Room is created via:
   ```ts
   const { Room: LKRoom } = require("livekit-client");
   roomRef.current = new LKRoom({ adaptiveStream: false, dynacast: false });
   ```
   On native, `@livekit/react-native` patches the `livekit-client` Room to use native WebRTC transports via `registerGlobals()`. However, creating the Room directly from `livekit-client` *after* the initial import may bypass the native track publication pipeline. The `<Room>` wrapper from `@livekit/react-native` (aliased as `LiveKitRoom`) should be managing the room lifecycle, but passing a pre-created `livekit-client` Room instance creates a mismatch — the `VideoView` component from `@livekit/react-native` expects tracks created through its native pipeline.

3. **`VideoView` may not be receiving a valid native track reference.** The `videoTrack` prop comes from `publication?.videoTrack`, which is a `livekit-client` JS-level track object. On native, `VideoView` from `@livekit/react-native` needs the track to be backed by a native WebRTC stream. If the Room was instantiated without proper native bindings, the track object exists in JS but has no native renderer attached.

**Bug 2: Audio potentially not working**

The `AudioRoomView.tsx` has the same Room instantiation pattern (`require("livekit-client")`). Additionally:
- For LISTENER role, mic is explicitly muted by default (`useState(role === "LISTENER")`) — this is correct.
- For HOST/SPEAKER, `setMicrophoneEnabled(true)` is called after connection — but if the native WebRTC pipeline isn't properly bound (same issue as video), audio tracks may publish without actually capturing from the mic.
- The `handleToggleMic` in `AudioRoomContent` correctly calls `localParticipant.setMicrophoneEnabled()` but there's no verification that the audio track was actually created.

**Feature 3: Pre-call test mode (like Zoom/Google Meet)**

This doesn't exist yet and needs to be built from scratch.

---

### Phased Implementation Plan

---

#### Phase 1: Fix Native Plugin Configuration (Critical — fixes blank video)

**Files to modify:**
- `app.json`
- `babel.config.js` (potentially)
- Rebuild native binary

**Tasks:**
1. Add `@livekit/react-native` to the `plugins` array in `app.json`:
   ```json
   "plugins": [
     "expo-router",
     "@livekit/react-native",
     ...
   ]
   ```
2. Add `expo-build-properties` plugin to ensure `minSdkVersion >= 24` (required by `@livekit/react-native-webrtc`):
   ```json
   ["expo-build-properties", {
     "android": { "minSdkVersion": 24 }
   }]
   ```
3. Run `npx expo prebuild --clean` to regenerate native projects with the plugin applied.
4. Rebuild the APK with `eas build` or local build.

**Why this fixes it:** The plugin hooks into the native build to register WebRTC native modules, configure ProGuard rules, and set required build flags. Without it, `VideoView` renders an empty native view because the WebRTC track has no native backing.

---

#### Phase 2: Fix Room Instantiation Pattern (Critical — fixes video + audio)

**Files to modify:**
- `components/booking/LiveStreamRoom.tsx`
- `components/booking/AudioRoomView.tsx`

**Tasks:**
1. **Remove the manual `require("livekit-client")` Room creation.** Instead, let `<LiveKitRoom>` (the `@livekit/react-native` wrapper) manage the Room internally, or if you need a reference, use it from the context after connection:
   ```tsx
   // Option A: Let LiveKitRoom create the room internally (simplest)
   <Room serverUrl={wsUrl} token={token} connect audio video>
     <RoomContent ... />
   </Room>
   
   // Option B: If you need the Room ref, use useRoom() hook inside RoomContent
   ```
2. If a Room ref is still needed for disconnect calls, use `useRoom()` from `@livekit/react-native` inside `RoomContent` rather than creating one externally.
3. For the `AudioRoomView`, same fix — remove `require("livekit-client")` Room, rely on the `LiveKitRoom` component's internal Room.

**Why this fixes it:** The `@livekit/react-native` `LiveKitRoom` component creates its own Room with native WebRTC bindings injected by `registerGlobals()`. Passing in an externally-created Room may bypass these bindings. The tracks published through a natively-bound Room will properly connect to `VideoView`.

---

#### Phase 3: Harden Permission Flow & Verify Track Publication (Audio fix)

**Files to modify:**
- `app/(tabs)/booking/live-session.tsx`
- `components/booking/LiveStreamRoom.tsx`
- `components/booking/AudioRoomView.tsx`

**Tasks:**
1. **Add explicit track publication verification after connection.** In `RoomContent`, after `connectionState === Connected`, verify that the local camera and microphone tracks are actually published:
   ```tsx
   useEffect(() => {
     if (connectionState === ConnectionState.Connected && localParticipant) {
       const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
       const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
       if (!camPub?.track) {
         // Camera didn't auto-publish — force enable
         localParticipant.setCameraEnabled(true);
       }
       if (!micPub?.track) {
         localParticipant.setMicrophoneEnabled(true);
       }
     }
   }, [connectionState, localParticipant]);
   ```
2. **Handle permission re-check on Android 13+** — `READ_MEDIA_IMAGES` vs `READ_EXTERNAL_STORAGE` isn't an issue here, but camera/mic permissions on Android 12+ have stricter enforcement. Add `MODIFY_AUDIO_SETTINGS` and `BLUETOOTH` permissions to `AndroidManifest.xml` for Bluetooth headset support:
   ```xml
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
   <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30"/>
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
   ```
3. **Sync the `isMicOn`/`isCameraOn` state with actual track state** — currently, the state is set optimistically. After connection, read the actual publication state to sync:
   ```tsx
   setIsCameraOn(!!localParticipant.isCameraEnabled);
   setIsMicOn(!!localParticipant.isMicrophoneEnabled);
   ```

---

#### Phase 4: Build Pre-Call Test Mode (New Feature)

**New files to create:**
- `components/booking/MediaTestView.tsx` — the pre-call test UI
- `hooks/useMediaDeviceTest.ts` — hook that manages camera/mic preview without LiveKit

**Files to modify:**
- `app/(tabs)/booking/live-session.tsx` — add a `"testing"` state to the view state machine

**Architecture:**

The test mode should work *without* connecting to LiveKit (no token needed). It uses the device's native WebRTC APIs directly to:
- Preview local camera in a `VideoView`
- Capture microphone audio and display a real-time volume meter
- Allow switching between front/back camera
- Show device info (camera name, mic name)

**Tasks:**

1. **Create `hooks/useMediaDeviceTest.ts`:**
   - On native: Use `@livekit/react-native-webrtc`'s `mediaDevices.getUserMedia()` (exposed by `registerGlobals()`) to get local streams without a Room.
   - Track audio levels via `getStats()` or an `AudioContext` analyzer (web) / track volume events (native).
   - Expose: `{ videoTrack, audioLevel, isCameraWorking, isMicWorking, switchCamera, cleanup }`

2. **Create `components/booking/MediaTestView.tsx`:**
   - Full-screen view with:
     - Camera preview (local `VideoView` with the test video track)
     - Audio level meter (animated bar that moves with mic input)
     - "Camera working ✓ / ✗" indicator
     - "Microphone working ✓ / ✗" indicator  
     - "Switch Camera" button (front/back)
     - "Looks Good — Join Session" button → transitions to `handleJoin()`
     - "Go Back" button

3. **Update `live-session.tsx`:**
   - Add `"testing"` to `SessionView` type: `type SessionView = "join" | "testing" | "connecting" | "live" | "ended"`
   - Add a "Test Audio & Video" secondary button on the join screen (always available, doesn't require `canJoin`)
   - When tapped, set `view` to `"testing"`, render `<MediaTestView>`
   - `MediaTestView`'s "Join" button calls existing `handleJoin()`, its "Back" button returns to `view = "join"`

**UX Flow:**
```
Join Screen → "Test Audio & Video" button
    → MediaTestView (camera preview + mic meter)
        → "Looks Good" → handleJoin() → connecting → live
        → "Go Back" → Join Screen
```

---

#### Phase 5: Polish & Edge Cases

**Tasks:**
1. **Add error feedback in the live session** when tracks fail to publish (e.g., camera blocked by another app).
2. **Add a reconnection banner** — if `connectionState` goes to `Reconnecting`, show a subtle banner in the live view instead of silently breaking.
3. **Handle the case where user denies permissions during test mode** — show inline guidance to open Settings.
4. **Add audio-only test variant** — when the event is `AUDIO_ONLY`, the test mode only shows the mic level meter, no camera preview.
5. **Clean up test resources** — ensure `useMediaDeviceTest` stops all tracks when the component unmounts or user navigates away.

---

### Priority & Impact Summary

| Phase | Impact | Effort | Fixes |
|-------|--------|--------|-------|
| 1 | Critical | Low (config change + rebuild) | Blank video on APK |
| 2 | Critical | Medium (refactor Room creation) | Blank video + audio |
| 3 | High | Low-Medium | Audio reliability, Bluetooth |
| 4 | High | Medium-High (new feature) | Pre-call test mode |
| 5 | Medium | Low | Edge cases, UX polish |

Phases 1 and 2 are the immediate priority — they're likely what's causing your blank video and potentially broken audio. Phase 1 alone (adding the plugin and rebuilding) may resolve both issues since the Room is passed to `<LiveKitRoom>` which should re-bind it. But Phase 2 makes it architecturally correct.

Want me to start implementing any of these phases?