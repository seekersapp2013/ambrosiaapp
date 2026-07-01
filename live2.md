Let me check all the relevant APIs before planning.

Now I have everything I need. Here's the full, API-verified implementation plan:

---

## Phases 7–9 Detailed Implementation Plan

### API Audit for Phases 7–9

**⚠️ Critical finding on LiveKit packages:**
`@livekit/react-native` and `@livekit/react-native-webrtc` are **NOT installed**. The current `package.json` only has `livekit-server-sdk` (server-side only). These must be installed before Phase 7 can be coded.

**All Convex APIs confirmed present:**

| API | File | Status |
|---|---|---|
| `generateAccessToken` | `livekitActions.ts` | ✅ |
| `generateAudioEventToken` | `livekitActions.ts` | ✅ |
| `startRecording` / `stopRecording` | `livekitActions.ts` | ✅ |
| `getRecordingStatus` | `livekitActions.ts` | ✅ |
| `createLiveStreamRoom` / `getBookingForStream` | `livekit.ts` | ✅ |
| `updateStreamStatus` | `livekit.ts` | ✅ |
| `getMyLiveStreams` / `downloadRecording` | `livekit.ts` | ✅ |
| `startSession` / `stopSession` | `bookings.ts` | ✅ |
| `getStreamComments` / `addStreamComment` | `streamComments.ts` | ✅ |
| `likeStream` / `bookmarkStream` | `engagement.ts` | ✅ (take `streamId: v.id("bookings")`) |
| `raiseHand` / `lowerHand` | `events.ts` | ✅ (take `bookingId`) |
| `promoteToSpeaker` / `demoteToListener` | `events.ts` | ✅ (take `eventId` + `targetUserId`) |
| `updateMutedStatus` | `events.ts` | ✅ |
| `createReferral` | `referrals.ts` | ✅ (needs min 3 suggestedExperts, patient must be a user ID) |
| `getPatientReferrals` | `referrals.ts` | ✅ |
| `getReferringExpertReferrals` | `referrals.ts` | ✅ |
| `getSelectedExpertReferrals` | `referrals.ts` | ✅ (extra API — used for received tab) |
| `selectExpertFromReferral` | `referrals.ts` | ✅ |
| `declineReferral` | `referrals.ts` | ✅ |
| `linkBookingToReferral` | `referrals.ts` | ✅ |
| `getAllOpenExpertRequests` | `expertRequests.ts` | ✅ |
| `applyToExpertRequest` | `expertRequests.ts` | ✅ |
| `getProvidersWithPagination` | `bookingSubscribers.ts` | ✅ (used in ReferralCreationForm expert search) |

**Also confirmed available from Phases 1–6 (reused):**
- `getBookingById` ✅, `getMyBookings` ✅, `getMySubscription` ✅, `checkBookingAffordability` ✅, `payForBooking` ✅, `createBooking` ✅

---

### Phase 7 — Live Stream (Video)

**Package install required first:**
```
npx expo install @livekit/react-native @livekit/react-native-webrtc
```
Also requires `babel.config.js` plugin addition per LiveKit docs.

**New files:**
- `app/(tabs)/booking/live-session.tsx` — the join + stream screen
- `components/booking/LiveStreamRoom.tsx`
- `components/booking/LiveStreamControls.tsx`
- `components/booking/LiveStreamChat.tsx`
- `components/booking/ParticipantGrid.tsx`

**Update existing:**
- `app/(tabs)/booking/index.tsx` — wire the "Join Now" button to navigate to `live-session` instead of `booking-detail`

---

#### 7a — `live-session.tsx` (Join Screen + Container)

**Route:** `/(tabs)/booking/live-session?bookingId=<id>`

**Entry point:** The "Join Now" button on `BookingCard` in `index.tsx` navigates here. Currently it goes to `booking-detail` — this needs updating.

**States:** `joining` → `live` → `ended`

**Joining state:**
- Calls `getBookingForStream` (query, realtime) to get `{ liveStreamStatus, liveStreamRoomName, provider, client, isProvider, sessionDate, sessionTime, duration }`
- Shows a session summary card: provider name/avatar, date, time, duration, status badge (`NOT_STARTED` / `LIVE` / `ENDED`)
- Join button is enabled when:
  - `liveStreamStatus !== "ENDED"` AND
  - Either `EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION=true` OR within 15 min window
- On join button press:
  1. Calls `createLiveStreamRoom({ bookingId })` mutation (only if `liveStreamRoomName` is null — idempotent check)
  2. Calls `generateAccessToken({ bookingId, participantName })` action → gets `{ token, wsUrl, roomName }`
  3. Provider additionally calls `startSession({ bookingId })` mutation
  4. On success: transitions to `live` state, renders `<LiveStreamRoom>`

**Ended state:**
- Session ended card with "Back to Bookings" CTA
- If recording available (`recordingUrl` present): shows download button → calls `downloadRecording({ bookingId })` → `Linking.openURL(result.downloadUrl)`

**API calls in this file:**
- `useQuery(api.livekit.getBookingForStream, { bookingId })`
- `useMutation(api.livekit.createLiveStreamRoom)`
- `useAction(api.livekitActions.generateAccessToken)`
- `useMutation(api.bookings.startSession)` — provider only
- `useMutation(api.livekit.downloadRecording)` — ended state

---

#### 7b — `LiveStreamRoom.tsx`

**Props:** `{ token, wsUrl, roomName, bookingId, isProvider, onEnd }`

**Structure:** Full-screen `View` with black background, no scroll.

**LiveKit connection:**
- Connects to LiveKit room via `Room` from `@livekit/react-native`
- Uses `useRoom`, `useLocalParticipant`, `useRemoteParticipants` hooks
- Room events: `RoomEvent.Disconnected` → calls `handleEndSession`

**Layout (top → bottom):**
1. **Top bar** — back chevron, session title + LIVE badge (pulsing red dot, `Animated.loop`), participant count, grid-view toggle button (`IconButton`)
2. **Video area** — local `VideoView` in corner (picture-in-picture style), remote participants grid (when ≤ 4: 2×2; when > 4: opens `ParticipantGrid`)
3. **Engagement strip** (right side vertical) — like, bookmark, comment toggle; calls `likeStream({ streamId: bookingId })`, `bookmarkStream({ streamId: bookingId })`
4. **`LiveStreamChat`** panel — slides up from bottom left when comment button tapped
5. **`LiveStreamControls`** bar — anchored to bottom

**End session logic (provider only):**
1. If recording active: calls `stopRecording({ bookingId })` action
2. Calls `stopSession({ bookingId })` mutation
3. Calls `updateStreamStatus({ bookingId, status: "ENDED" })` mutation
4. Disconnects LiveKit room
5. Calls `onEnd()`

**Client disconnect:** just disconnects room and navigates back.

---

#### 7c — `LiveStreamControls.tsx`

**Props:** `{ isProvider, isCameraOn, isMicOn, isRecording, participantCount, onToggleCamera, onToggleMic, onToggleGrid, onToggleRecord, onEndCall }`

- Camera toggle (`IconButton`, camera icon)
- Mic toggle (`IconButton`, mic icon)
- Grid toggle (`IconButton`, grid icon, shows participant count badge)
- Record button — provider only, pulsing red when `isRecording`, calls `startRecording` / `stopRecording`
- End call button (`DestructiveButton` style, red, full pill)

All state (`isCameraOn`, `isMicOn`, `isRecording`) is managed in `LiveStreamRoom.tsx` and passed down. Toggling camera/mic calls LiveKit's `localParticipant.setCameraEnabled()` / `setMicrophoneEnabled()`.

---

#### 7d — `LiveStreamChat.tsx`

**Props:** `{ bookingId, visible, onClose }`

**Data:** `useQuery(api.streamComments.getStreamComments, { streamId: bookingId })` — real-time Convex subscription, auto-updates as comments arrive.

**Layout:**
- Slide-up animated panel (`Animated.Value` Y-position)
- `FlatList` of comments: author avatar fallback (initial letter), author name, message text, time ago
- `TextInput` + send `IconButton` at bottom
- On send: `useMutation(api.streamComments.addStreamComment)({ streamId: bookingId, content })` then clears input

---

#### 7e — `ParticipantGrid.tsx`

**Props:** `{ participants, localParticipant, onFocus, onClose }`

- `Modal` overlay, dark semi-transparent background
- `FlatList` with `numColumns={2}`, each tile is a `VideoView` (or fallback initials view if no video track)
- Per tile: participant name label, camera-off icon if no video, mic-muted icon if audio muted
- Tap a tile → calls `onFocus(participant)` to bring them to main view, closes modal

---

### Phase 8 — Audio Room + Recording Management

**New files:**
- `components/booking/AudioRoomView.tsx`
- `components/booking/RecordingManagement.tsx`
- `app/(tabs)/booking/recordings.tsx`

**Update existing:**
- `app/(tabs)/booking/live-session.tsx` — detect `eventType === "AUDIO_ONLY"` and render `<AudioRoomView>` instead of `<LiveStreamRoom>`
- `app/(tabs)/booking/index.tsx` — add "Recordings" quick action button (provider-only)

---

#### 8a — `live-session.tsx` fork for audio

The join screen is the **same** as Phase 7 with one change:
- After getting token, check `booking.event?.eventType === "AUDIO_ONLY"` (from `getBookingForStream`)
- If audio: call `generateAudioEventToken({ eventId, bookingId, participantName })` instead of `generateAccessToken`
- Token response includes `{ token, wsUrl, roomName, role }` where `role` is `"HOST"` / `"SPEAKER"` / `"LISTENER"`
- Render `<AudioRoomView>` instead of `<LiveStreamRoom>` when `isAudioOnly === true`

---

#### 8b — `AudioRoomView.tsx`

**Props:** `{ token, wsUrl, roomName, bookingId, eventId, isHost, role, onLeave }`

**Background:** Linear gradient (`expo-linear-gradient` — already available via Expo) from deep purple to dark.

**LiveKit connection:** Same `Room` setup but only audio tracks published (enforced server-side by token grants — `canPublishSources: [MICROPHONE]` only).

**Layout sections:**

**Stage (top 50%):**
- Grid of speaker avatar cards — each shows: avatar or initials fallback, name, "SPEAKING" ring animation (pulsing border using `Animated.loop` + `Animated.timing` on `borderColor` opacity), mic icon
- Speakers = `remoteParticipants.filter(p => p.metadata?.role !== "LISTENER")` + local if HOST/SPEAKER
- Speaking detection: `participant.isSpeaking` from LiveKit hooks → triggers the pulsing ring animation

**Audience (bottom 40%):**
- Compact horizontal grid of listener avatar chips — smaller, no speaking ring
- Listeners = `remoteParticipants.filter(p => p.metadata?.role === "LISTENER")`

**Hand-raise panel (host-only side panel):**
- Slide-in from right side, triggered by a "Hands" button in controls bar
- Lists participants where `participant.metadata?.handRaised === true`
- Per entry: name + "Promote to Speaker" button
- Promote calls: `promoteToSpeaker({ eventId, targetUserId })` mutation
- After promotion, host re-generates token for that user is NOT needed — LiveKit handles this via `canUpdateOwnMetadata`; instead the booking's `participantRole` field is updated server-side and the new token grant is handled on reconnect

**Controls bar (bottom):**
- For HOST/SPEAKER: Mute/Unmute mic (`localParticipant.setMicrophoneEnabled()`), Leave button
- For LISTENER: Raise Hand button (calls `raiseHand({ bookingId })` mutation), lower hand (calls `lowerHand({ bookingId })`), Leave button
- Mute state stored in `updateMutedStatus({ eventId, isMuted })` for server-side tracking

**Demote button (host only, shown per-speaker in stage grid):**
- Long press or "..." menu on speaker tile → `demoteToListener({ eventId, targetUserId })`

---

#### 8c — `RecordingManagement.tsx`

**Props:** none (standalone component)

**Data:** `useQuery(api.livekit.getMyLiveStreams, { status: "ENDED" })` — returns ended bookings that have `liveStreamRoomName` set (i.e., had a live stream).

**Layout (inside `MobileCard`):**
- Section header: "My Recordings"
- Per session row:
  - Left: session icon
  - Center: provider/client name, date + time, duration
  - Right: recording status badge + action

**Recording status badge logic:**
- `recordingUrl` starts with `"pending-"` → badge: "Processing" (yellow)
- `recordingUrl` starts with `"processing-"` → badge: "Processing" (yellow) + auto-poll
- `recordingUrl` is a real URL → badge: "Available" (green) + Download button
- `recordingUrl` is null/undefined → badge: "No Recording" (grey)

**Auto-poll:** For sessions showing "Processing", use a `useEffect` with a 30-second interval that calls `useAction(api.livekitActions.getRecordingStatus)({ bookingId })` to check if recording is now complete. On completion, Convex's real-time subscription to `getMyLiveStreams` updates automatically.

**Download:** Button calls `useMutation(api.livekit.downloadRecording)({ bookingId })` → gets `{ downloadUrl }` → `Linking.openURL(downloadUrl)`.

---

#### 8d — `recordings.tsx` screen

Thin screen wrapper:
```
AppBackground → ScreenHeader("Recordings") → ScrollView → MobileCard → <RecordingManagement />
```
- Entry point: "Recordings" quick action in booking hub (provider only)
- Route: `/(tabs)/booking/recordings`

---

### Phase 9 — Referrals System

**New files:**
- `components/booking/PatientReferralsList.tsx`
- `components/booking/ExpertReferralsList.tsx`
- `components/booking/ReferralCreationForm.tsx`
- `app/(tabs)/booking/referrals.tsx`

**Update existing:**
- `app/(tabs)/booking/index.tsx` — add "Referrals" quick action (visible to all users, but content is role-conditional)
- `app/(tabs)/booking/booking-detail.tsx` — add "Create Referral" button on COMPLETED bookings (provider-only)

---

#### 9a — `referrals.tsx` screen

**Route:** `/(tabs)/booking/referrals`

**Role detection:** `useQuery(api.bookingSubscribers.getMySubscription)` → if active provider, show `<ExpertReferralsList>` as second tab; always show `<PatientReferralsList>` as first tab.

**Tab bar:** "My Referrals" | "Referral Management" (provider-only, hidden for non-providers)

---

#### 9b — `PatientReferralsList.tsx`

**Data:**
- `useQuery(api.referrals.getPatientReferrals, { status: activeFilter || undefined })`

**Layout:**
- Filter chips: All / Pending / Accepted / Completed / Declined
- Per referral card:
  - Title, referring expert name + job title, created date, status badge
  - Status colors: `PENDING` = warning, `ACCEPTED` = info, `COMPLETED` = success, `DECLINED` = danger

**Pending referral expanded view:**
- "Choose an Expert" section below the referral card
- `suggestedExpertsDetails` from the query already includes profile + subscription per expert
- Each expert shown as a mini `ProviderCard` variant (avatar, name, job title, price)
- "Select & Book" button per expert:
  1. Calls `selectExpertFromReferral({ referralId, selectedExpertId })` mutation
  2. On success: navigates to `/(tabs)/booking/<selectedExpertId>` (Phase 3 calendar flow) with a `referralId` query param
  3. After booking is created (success screen), the referral is linked via `linkBookingToReferral({ referralId, bookingId })` — this call happens in a modified version of `BookingConfirmation` that accepts an optional `referralId` prop
- "Decline" button: calls `declineReferral({ referralId, reason: undefined })` → shows confirmation `BottomSheet` first

**⚠️ BookingConfirmation update needed:** Add optional `referralId` prop. After successful `createBooking`, if `referralId` is present, call `linkBookingToReferral({ referralId, bookingId: newBookingId })`.

---

#### 9c — `ExpertReferralsList.tsx`

**Data:**
- Sent tab: `useQuery(api.referrals.getReferringExpertReferrals, { status: undefined })`
- Received tab: `useQuery(api.referrals.getSelectedExpertReferrals, { status: undefined })`

**Note:** `getSelectedExpertReferrals` is an additional API (not in the original plan but confirmed in `referrals.ts`) — it returns referrals where the current user is the `selectedExpertId`. This is used for the "Received" tab.

**Layout:**
- Toggle: "Sent" | "Received"

**Sent tab:**
- Commission summary card at top: total earned = sum of `commissionAmount` from `COMPLETED` referrals, total pending = sum from `ACCEPTED` referrals
- Per referral row: title, patient info (name), status badge, selected expert name (if accepted), commission amount + paid/pending badge

**Received tab:**
- Per referral row: title, patient name, referring expert name, commission amount (what they'll earn), status badge

---

#### 9d — `ReferralCreationForm.tsx`

**Props:** `{ booking: { _id, clientId, clientName, clientAvatar, totalAmount, currency }, onSuccess, onCancel }`

**Trigger:** "Create Referral" button in `booking-detail.tsx` for COMPLETED bookings where `isProvider === true`.

**Layout (inside `BottomSheet`):**

1. **Patient info header** — client avatar + name (from booking), "Referring patient" label

2. **Title input** — `AppInput`, e.g. "Anxiety & Depression Support Referral"

3. **Health Note textarea** — `TextareaInput`, private note visible only to the selected expert. Label: "Health Note (shared only with selected expert)"

4. **Expert search section:**
   - `AppInput` with debounced search → calls `useQuery(api.bookingSubscribers.getProvidersWithPagination, { searchTerm, limit: 10, offset: 0 })`
   - Results shown as inline dropdown list below the input (absolute positioned `View` with `zIndex`) — not a full `BottomSheet`
   - Each result: avatar, name, job title — tap to add to selected list
   - Cannot add self (current provider)
   - Cannot add someone who is not an active provider (already filtered by the query)

5. **Selected experts list:**
   - Shows added experts as cards with a remove (×) button
   - Minimum 3 required (enforced in validation: `suggestedExperts.length < 3` blocks submit, shows inline error)
   - Maximum 10 (UI limit)

6. **Submit / Cancel buttons:**
   - `PrimaryButton` "Send Referral" → calls `createReferral({ patientId: booking.clientId, title, healthNote, suggestedExperts: [...userIds] })`
   - On success: `onSuccess()` closes the sheet, shows a toast "Referral sent"
   - Error display: inline error card below buttons

**Validation before submit:**
- Title not empty
- Health note not empty
- At least 3 experts selected
- No self-referral (UI prevents adding self, API also enforces)

---

### Cross-Phase Dependencies & Sequencing

| Step | Dependency |
|---|---|
| Phase 7 requires | `@livekit/react-native` install first |
| Phase 7 `live-session.tsx` | Must update `index.tsx` "Join Now" to route here |
| Phase 8 audio | Reuses `live-session.tsx` from Phase 7 (one file, two modes) |
| Phase 8 `recordings.tsx` | Must add entry point to `index.tsx` quick actions |
| Phase 9 `PatientReferralsList` | Must update `BookingConfirmation` to accept `referralId` prop |
| Phase 9 `ReferralCreationForm` | Must update `booking-detail.tsx` to add CTA for completed bookings |
| Phase 9 `referrals.tsx` | Must add entry point to `index.tsx` quick actions |

---

### File Checklist Summary

**Phase 7 (5 files):**
- `app/(tabs)/booking/live-session.tsx` — new
- `components/booking/LiveStreamRoom.tsx` — new
- `components/booking/LiveStreamControls.tsx` — new
- `components/booking/LiveStreamChat.tsx` — new
- `components/booking/ParticipantGrid.tsx` — new
- `app/(tabs)/booking/index.tsx` — update Join Now routing
- `package.json` — add `@livekit/react-native` + `@livekit/react-native-webrtc`

**Phase 8 (3 files):**
- `app/(tabs)/booking/live-session.tsx` — update to support audio mode
- `components/booking/AudioRoomView.tsx` — new
- `components/booking/RecordingManagement.tsx` — new
- `app/(tabs)/booking/recordings.tsx` — new screen
- `app/(tabs)/booking/index.tsx` — add Recordings quick action

**Phase 9 (5 files):**
- `app/(tabs)/booking/referrals.tsx` — new screen
- `components/booking/PatientReferralsList.tsx` — new
- `components/booking/ExpertReferralsList.tsx` — new
- `components/booking/ReferralCreationForm.tsx` — new
- `app/(tabs)/booking/index.tsx` — add Referrals quick action
- `app/(tabs)/booking/booking-detail.tsx` — add Create Referral CTA
- `components/booking/BookingConfirmation.tsx` — add optional `referralId` prop + `linkBookingToReferral` call