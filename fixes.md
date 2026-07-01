Let me check a few more things before giving the full diagnosis.

Now I have everything I need. Here's a thorough diagnosis of all 5 issues:

---

## Issue Diagnosis

### Issue 1 — Second user's video not showing on APK

**Root cause:** In `LiveStreamRoom.tsx`, the `RemoteTile` component correctly tries to get the video track via `getTrackPublication(Track.Source.Camera)?.videoTrack`. The problem is that on Android, `adaptiveStream: false` is set (good), but there are **two real bugs**:

1. **`focusedParticipant` only shows one remote tile at a time.** When there is exactly 1 remote participant, the secondary strip doesn't render (`remoteParticipants.length > 1` gate). So the one remote is shown as the focused tile — that part is fine. But the `RemoteTile` renders `VideoView` only when `videoTrack` is non-null. On Android, track publications can arrive *after* the first render with a valid publication object but a `null/undefined` `.videoTrack` because the track hasn't attached yet.

2. **`VideoView` receives `videoTrack={undefined}` on first render.** The LiveKit RN SDK requires the track object to be stable and non-null for `VideoView` to work. When `videoTrack` is `undefined`, it renders nothing — but there's no re-render trigger when it becomes available because `RemoteTile` doesn't subscribe to track changes.

**Fix needed:** Use the `useRemoteParticipant` hook (or subscribe to the participant's track publication updates) inside `RemoteTile` so it re-renders when the video track attaches. Also add a `useEffect`/listener on participant track events.

---

### Issue 2 — Clicking a participant should focus their video

**Root cause:** This is a logic gap. In `RoomContent`, `focusedId` is only settable via the secondary strip (`FlatList` of participants when `remoteParticipants.length > 1`). When there's only 1 remote participant there's no tap target at all. The `ParticipantGrid` does call `onFocus(id)` → `setFocusedId(id)` then closes the grid — that part works.

But the `ParticipantGrid` tiles only show **avatar initials**, not live video. When the user taps a tile in the grid, it sets `focusedId` and closes the grid, which should update the main view. This logic is actually correct in the code — the real problem is:

- The main `RemoteTile` doesn't re-render when the track becomes available (same as issue 1)
- The `focusedParticipant` lookup uses `remoteParticipants.find(p => p.identity === focusedId)`, but `remoteParticipants` returns participant objects that don't trigger re-renders when their track state changes

**Fix needed:** Same fix as issue 1 (reactive track subscription) plus making the focused tile itself tappable to allow toggling.

---

### Issue 3 — Buttons (audio, video, raise hand, end session) do nothing

**Root cause — multiple problems:**

1. **Controls bar is positioned `absolute, bottom: 0` with `zIndex: 20`.** The `controlsWrap` style uses `position: absolute, bottom: 0`. On Android, the **system gesture navigation bar / soft buttons** can sit on top of `bottom: 0`. The buttons render but touch events are eaten by the system nav bar layer.

2. **`LiveStreamControls` bar has no `paddingBottom` for the safe area inset.** The bar's content is being obscured. The buttons are *visually there* but the touchable area is clipped behind the system bar.

3. **There is no "Raise Hand" button** in `LiveStreamControls` — it only has Mic, Camera, People, Record (provider), and End. So if users are reporting a raise-hand button doing nothing, that button doesn't exist yet in the controls bar.

4. **Camera and mic toggles call `localParticipant?.setCameraEnabled()` / `setMicrophoneEnabled()` but the state variables `isCameraOn`/`isMicOn` are local only.** If `setCameraEnabled` throws (common on Android when permissions are granted but the camera device is busy), the state flips but nothing visible changes, making it look like the button did nothing.

**Fix needed:** Add `useSafeAreaInsets().bottom` padding to the controls bar. Add proper error handling/state rollback on toggle failures. The bar needs `paddingBottom: insets.bottom + spacing.space3` on Android. Also ensure that buttons are visible on mobile, it is currently being obstructred by the bottom nav. 

---

### Issue 4 — Provider ends for everyone; client can Leave & Rejoin; Provider needs a Hold button

**Root cause:** Currently `handleEndCall` in `RoomContent` checks `isProvider`:
- Provider: shows Alert "End Session for everyone" → calls `stopSession` + `updateStreamStatus("ENDED")` + disconnects
- Client: just calls `doEnd()` directly (no confirmation) → disconnects and calls `onEnd()`

**Problems:**
1. The **client calling `doEnd()` sets `view = "ended"`** (via `onEnd` prop which does `setView("ended")`). So the client can never rejoin — once they leave they see the "Session Complete" screen. The `onEnd` callback in `live-session.tsx` unconditionally sets view to `"ended"` for both roles.

2. The outer `LiveKitRoom` has `onDisconnected={() => { if (!isProvider) onEnd(); }}` — so even if the network blips, the client gets sent to the ended screen.

3. There is **no Hold button** for the provider.

**Fix needed:**
- In `live-session.tsx`, `onEnd` needs to differentiate: provider → `setView("ended")`, client → `setView("join")` (so they can rejoin)
- In `LiveStreamRoom`, the client's "End" button should be labelled "Leave" and should NOT trigger `stopSession`/`updateStreamStatus` — it should just disconnect and let the parent send them back to the join screen
- A "Hold" button for the provider: disconnects from the room (but does NOT call `stopSession` or `updateStreamStatus`) and returns to the join screen, allowing them to rejoin
- The `onDisconnected` handler should not auto-navigate the client to ended on unexpected disconnects

---

### Issue 5 — Confirm Booking buttons hidden behind bottom nav

**Root cause:** `BookingConfirmation` renders `summaryRoot` as a `flex: 1` `View` with a `ScrollView` (scroll content) + a sticky `actionBtns` footer view below the scroll. The `actionBtns` has `paddingBottom: spacing.space5` (20px).

The problem is that `BookingConfirmation` is rendered directly as a child of `AppBackground` inside `[id].tsx` — **not inside a `ScrollView`**. The `AppBackground` doesn't add any bottom offset for the tab bar. The `actionBtns` footer is a `position: static` view at the bottom of `summaryRoot`, but the tab bar is `position: absolute, bottom: 0` overlaid on top of it, and the tab bar height is **60–72px** depending on device, plus Android insets.

`scrollBottomPadding: 100` is only applied to `contentContainerStyle` of scrolls — not to the static footer. The sticky `actionBtns` footer renders below the scroll but is visually overlapped by the tab bar.

**Fix needed:** Add `useSafeAreaInsets().bottom + useTabBarHeight()` as `paddingBottom` to `actionBtns` in `BookingConfirmation`, OR wrap the entire `BookingConfirmation` in a container that has that bottom offset from the tab bar. The simplest fix is giving `actionBtns` a dynamic bottom padding. Since `BookingConfirmation` doesn't currently use any hooks for this, it needs `useSafeAreaInsets` + `useTabBarHeight` added.

---

## Summary Table

| # | File | Root Cause | Fix |
|---|------|-----------|-----|
| 1 | `LiveStreamRoom.tsx` → `RemoteTile` | No reactive subscription to track attach events; `videoTrack` is `undefined` on first render | Use `useParticipantTracks` or subscribe to track events inside `RemoteTile` |
| 2 | `LiveStreamRoom.tsx` → `RoomContent` | Same as #1; grid focus works but the tile doesn't re-render when track attaches | Same fix as #1 |
| 3 | `LiveStreamControls.tsx` + `LiveStreamRoom.tsx` | Controls bar `bottom: 0` with no safe-area padding; system nav bar eats taps on Android | Add `insets.bottom` to controls bar padding |
| 4 | `live-session.tsx` + `LiveStreamRoom.tsx` | `onEnd` goes to `"ended"` for both roles; no Leave vs End distinction; no Hold button | Differentiate `onEnd`/`onLeave`, add Hold for provider, allow client to rejoin |
| 5 | `BookingConfirmation.tsx` | Sticky footer has no tab bar height offset; tab bar overlaps buttons | Add `useTabBarHeight() + insets.bottom` to `actionBtns.paddingBottom` |

---

Ready to implement all fixes? I'll tackle them in the order above across `LiveStreamRoom.tsx`, `LiveStreamControls.tsx`, `live-session.tsx`, and `BookingConfirmation.tsx`.