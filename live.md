Let me check the existing Convex API surface and the .env.local before planning.

Now I have a complete picture. Here's the detailed phased implementation plan:

---

## Phased Implementation Plan: Full Booking Feature (React Native / Expo)

### API Audit — All Required APIs Already Exist ✅

Every API called in the web source code maps directly to an existing Convex function:

| Web Component | Convex API | Status |
|---|---|---|
| `getProvidersWithPagination` | `bookingSubscribers.ts` | ✅ |
| `getSpecializations` / `getJobTitles` | `bookingSubscribers.ts` | ✅ |
| `getSubscriberByUserId` | `bookingSubscribers.ts` | ✅ |
| `getMySubscription` | `bookingSubscribers.ts` | ✅ |
| `createSubscriber` / `updateSubscriber` | `bookingSubscribers.ts` | ✅ |
| `getPublicEvents` | `events.ts` | ✅ |
| `getProviderEvents` | `events.ts` | ✅ |
| `createEvent` / `updateEvent` / `cancelEvent` | `events.ts` | ✅ |
| `getEventById` | `events.ts` | ✅ |
| `raiseHand` / `lowerHand` / `promoteToSpeaker` / `demoteToListener` | `events.ts` | ✅ |
| `getProviderAvailability` | `bookings.ts` | ✅ |
| `createBooking` / `createEventBooking` | `bookings.ts` | ✅ |
| `getMyBookings` / `getProviderBookings` | `bookings.ts` | ✅ |
| `updateBookingStatus` / `cancelBooking` | `bookings.ts` | ✅ |
| `startSession` / `stopSession` | `bookings.ts` | ✅ |
| `getMySettings` / `createOrUpdateSettings` / `resetToDefaults` | `bookingSettings.ts` | ✅ |
| `getBookingForStream` / `createLiveStreamRoom` / `updateStreamStatus` | `livekit.ts` | ✅ |
| `generateAccessToken` / `generateAudioEventToken` / `startRecording` / `stopRecording` | `livekitActions.ts` | ✅ |
| `getMyLiveStreams` / `downloadRecording` | `livekit.ts` | ✅ |
| `createReferral` / `getPatientReferrals` / `getReferringExpertReferrals` | `referrals.ts` | ✅ |
| `selectExpertFromReferral` / `declineReferral` / `linkBookingToReferral` | `referrals.ts` | ✅ |
| `getStreamComments` / `addStreamComment` | `streamComments.ts` | ✅ |
| `likeStream` / `bookmarkStream` | `engagement.ts` | ✅ |
| `getAllOpenExpertRequests` / `applyToExpertRequest` | `expertRequests.ts` | ✅ |

**LiveKit credentials confirmed in `.env.local`:**
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL` — all present
- `VITE_DISABLE_STREAM_TIME_RESTRICTION=true` — will be translated to `EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION`

---

### File Structure

All files live under `app/(tabs)/booking/`:

```
app/(tabs)/booking/
  index.tsx                    ← already built (Phase 1 updates it)
  new.tsx                      ← Phase 2
  [id].tsx                     ← Phase 3
  providers.tsx                ← Phase 2
  history.tsx                  ← Phase 1

components/booking/
  ProviderCard.tsx             ← Phase 2
  ProviderFilters.tsx          ← Phase 2
  BookingCalendar.tsx          ← Phase 3
  BookingConfirmation.tsx      ← Phase 3
  ProviderSubscriptionForm.tsx ← Phase 4
  EventCard.tsx                ← Phase 5
  EventCreationForm.tsx        ← Phase 5
  BookingSettingsForm.tsx      ← Phase 6
  LiveStreamRoom.tsx           ← Phase 7
  LiveStreamControls.tsx       ← Phase 7
  LiveStreamChat.tsx           ← Phase 7
  ParticipantGrid.tsx          ← Phase 7
  AudioRoomView.tsx            ← Phase 8
  RecordingManagement.tsx      ← Phase 8
  ReferralCreationForm.tsx     ← Phase 9
  PatientReferralsList.tsx     ← Phase 9
  ExpertReferralsList.tsx      ← Phase 9
  ExpertRequestsList.tsx       ← Phase 9
```

---

### Phase 1 — Booking Hub (index.tsx) + History Screen
**Files:** `booking/index.tsx` (update), `booking/history.tsx`

The current `index.tsx` is a blank shell. This phase makes it the real hub:

- **Dashboard stats strip** — upcoming count, completed count, provider status badge (if user is a provider), pulled from `getMyBookings` + `getMySubscription`
- **Quick action grid** — Book Session, Find Providers, My Events, History, Settings, Become Provider (conditional on `mySubscription`)
- **Upcoming bookings preview** — top 3 from `getMyBookings({ status: "CONFIRMED" })`, each as a `BookingCard` with Join Session button that activates 15 min before session time
- **Tab bar** — Upcoming / Completed / Cancelled, full list with `BookingCard` per item
- **`history.tsx`** — full paginated list of all past bookings with status filter chips

**Design system:** `AppBackground` + `MobileCard` + `ScreenHeader`, all tokens from `Colors`, `typeScale`, `spacing`, `radius`. `BookingCard` reuses the same pattern as `TransactionCard` from the wallet screen.

---

### Phase 2 — Provider Browser
**Files:** `booking/providers.tsx`, `components/booking/ProviderCard.tsx`, `components/booking/ProviderFilters.tsx`

Translates `BookingBrowser` + `ProviderList` + `ProviderCard` + `ProviderFilters`:

- **Search bar** at top — `AppInput` with debounced `searchTerm` state, feeds `getProvidersWithPagination`
- **Filter bottom sheet** — `BottomSheet` component (already in the app) containing specialization picker, job title picker, min/max price inputs. Active filters shown as dismissible chips below the search bar
- **Provider grid** — `FlatList` with 1-column cards on mobile. Each `ProviderCard` shows avatar (via `api.files.getFileUrl`), name, job title, specialization badge, available days/week, 1-on-1 price, social links, "View Details" button
- **Load more** — `onEndReached` triggers offset increment, `hasMore` from query controls visibility
- **Events section** below providers — horizontal `ScrollView` of `EventCard` components from `getPublicEvents`
- **Expert Requests section** — list from `getAllOpenExpertRequests` with Apply button opening a `BottomSheet` form

**Navigation:** tapping a provider card pushes to `booking/[providerId]/details.tsx` (Phase 3).

---

### Phase 3 — Provider Details + Calendar + Booking Confirmation
**Files:** `booking/[id].tsx` (provider details), `components/booking/BookingCalendar.tsx`, `components/booking/BookingConfirmation.tsx`

**Provider Details screen** (`booking/[id].tsx`):
- Hero section: avatar, name, job title, specialization, social links
- About + What You'll Learn sections
- Availability schedule (days + hours from `openHours`)
- Pricing card: 1-on-1 price, group session price
- "Book a Session" CTA → navigates to calendar view within same screen (view state machine)

**BookingCalendar** (inline view, not a separate screen):
- Month grid built with pure RN `View`/`TouchableOpacity` — no third-party calendar lib
- Calls `getProviderAvailability` for the displayed month range
- Available days highlighted in `Colors.statusSuccessBg`, past days greyed, selected day in `Colors.actionPrimary`
- Time slots panel slides in when a date is selected — vertical `ScrollView` of slot buttons from `availabilityData.timeSlots`
- Duration selector: 30 / 60 / 90 / 120 min chips

**BookingConfirmation** (next view state):
- Summary card: provider info, date, time, duration, rate, total
- "What to Expect" info block
- "Proceed to Payment" → calls `createBooking` with `paymentTxHash: "wallet_payment"` (wallet-based, matching the existing ErcasPay pattern in the app)
- On success: success screen with "View My Bookings" CTA

---

### Phase 4 — Become a Provider (Subscription Form)
**Files:** `components/booking/ProviderSubscriptionForm.tsx`, accessible from `booking/index.tsx`

Translates `ProviderSubscription` + `ProviderSubscriptionFlow`:

- Multi-section scrollable form inside `MobileCard`:
  - Profile preview (avatar + name from `getMyProfile`)
  - Job Title + Specialization (`AppInput`)
  - Pricing section: 1-on-1 price + group session price side by side, info tip card
  - About You + Offer Description (`TextareaInput`)
  - Social links (X, LinkedIn)
  - Weekly schedule: 7 rows, each with a toggle switch + start/end time pickers (custom time picker using `ScrollView` of options, matching the app's existing dropdown pattern)
- Validation mirrors the web version exactly
- On submit: `createSubscriber` or `updateSubscriber` depending on `existingSubscription`
- Success screen with "What's Next" checklist

---

### Phase 5 — Events (Browse + Create + Manage)
**Files:** `components/booking/EventCard.tsx`, `components/booking/EventCreationForm.tsx`, `booking/events.tsx`

**EventCard** — date/time/duration/spots/price/host info/tags, "Join Event" button calls `createEventBooking`, disabled when full

**EventCreationForm** (provider-only, inside `BottomSheet` or pushed screen):
- Title, description, date picker (custom calendar), time picker, duration, max participants, price per person, currency dropdown, tags input, public/private toggle
- Audio-only event toggle → reveals audio settings (max speakers, allow hand raise, record audio)
- Calls `createEvent`

**Events management screen** (`booking/events.tsx`):
- Provider's events in a list with status badges
- Edit / Cancel actions per event
- "Create Event" FAB

---

### Phase 6 — Booking Settings
**Files:** `components/booking/BookingSettingsForm.tsx`

Translates `BookingSettings`:

- Confirmation type: two radio-style toggle cards (Automatic / Manual) using `TouchableOpacity` with active border
- Buffer time: numeric `AppInput` with "minutes" label
- Max advance booking: numeric `AppInput` with "days" label
- Cancellation policy: custom dropdown (same pattern as currency dropdown in wallet/deposit)
- Session instructions: `TextareaInput`
- Save / Reset to Defaults buttons
- Tips info card at bottom
- Calls `getMySettings`, `createOrUpdateSettings`, `resetToDefaults`

---

### Phase 7 — Live Stream (Video)
**Files:** `components/booking/LiveStreamRoom.tsx`, `components/booking/LiveStreamControls.tsx`, `components/booking/LiveStreamChat.tsx`, `components/booking/ParticipantGrid.tsx`

This is the most complex phase. The web version uses `livekit-client` directly. For React Native, the package is `@livekit/react-native`.

**LiveStreamJoin screen** (entry point from BookingCard "Join Session" button):
- Session details summary card
- Live/Not Started/Ended status indicator
- Join button (enabled 15 min before, controlled by `EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION`)
- Calls `generateAccessToken` action → gets `{ token, wsUrl, roomName }`
- On success: renders `LiveStreamRoom`

**LiveStreamRoom**:
- Full-screen `View` with black background
- Local video via `VideoView` from `@livekit/react-native`
- Remote participant videos in a `FlatList` overlay
- Top bar: back button, LIVE indicator, participant count, grid toggle
- Bottom controls bar: camera toggle, mic toggle, screen share, record (provider only), end call — all using `IconButton` from the design system
- Recording status indicator (pulsing red dot)
- Calls `updateStreamStatus`, `startRecording`, `stopRecording`

**LiveStreamChat** (slide-up panel):
- Translates `LiveStreamComments` — collapsible chat panel anchored to bottom-left
- `FlatList` of comments from `getStreamComments` (real-time via Convex subscription)
- `TextInput` + send button
- Calls `addStreamComment`

**ParticipantGrid** (modal overlay):
- Grid of participant video tiles using `FlatList` with `numColumns={2}`
- Tap to focus a participant
- Camera/mic status icons per tile

**LiveStreamEngagement** (right-side vertical strip):
- Provider avatar, like button (heart), bookmark, message provider, share
- Calls `likeStream`, `bookmarkStream`, `startChat`

---

### Phase 8 — Audio Room + Recording Management
**Files:** `components/booking/AudioRoomView.tsx`, `components/booking/RecordingManagement.tsx`

**AudioRoomView** (for `eventType === "AUDIO_ONLY"`):
- Purple gradient background (matches the web design)
- Stage section: grid of speaker cards with speaking ring animation (pulsing border using `Animated`)
- Audience section: compact grid of listener cards
- Hand raise panel (host-only): slide-in panel from right showing raised hands with Promote button
- Controls bar: mute/unmute (speakers/hosts), raise hand (listeners), leave
- Calls `raiseHand`, `lowerHand`, `promoteToSpeaker`, `demoteToListener`, `updateMutedStatus`

**RecordingManagement**:
- List of ended sessions from `getMyLiveStreams({ status: "ENDED" })`
- Per session: date, time, duration, recording status badge (Available / Processing / None)
- Download button calls `downloadRecording` → opens URL with `Linking.openURL`
- Processing status auto-checks via `getRecordingStatus` action

---

### Phase 9 — Referrals System
**Files:** `components/booking/ReferralCreationForm.tsx`, `components/booking/PatientReferralsList.tsx`, `components/booking/ExpertReferralsList.tsx`

**PatientReferralsList** (accessible from booking hub "My Referrals"):
- Status filter chips: All / Pending / Accepted / Completed / Declined
- Per referral: title, referring expert info, status badge
- Pending referrals show suggested expert cards (avatar, name, job title, price) with "Select & Book" button → calls `selectExpertFromReferral` then navigates to calendar
- Decline button calls `declineReferral`

**ExpertReferralsList** (provider-only, "Referral Management"):
- Sent / Received tab toggle
- Commission summary card (total earned) for sent tab
- Per referral: title, patient info, status, selected expert, commission amount + paid/pending badge

**ReferralCreationForm** (provider-only, triggered from completed booking):
- Patient info header
- Title + Health Note fields
- Expert search: `AppInput` with debounced search calling `getProvidersWithPagination`, results in a dropdown list
- Selected experts list (minimum 3) with remove buttons
- Submit calls `createReferral`

---

### Cross-Cutting Concerns (All Phases)

**Design system consistency:**
- Every screen: `AppBackground` → `ScrollView` → `MobileCard` → content
- All headers: `ScreenHeader` with back button
- All buttons: `PrimaryButton` / `SecondaryButton` / `DestructiveButton` from the existing Button component
- All inputs: `AppInput` / `TextareaInput`
- All empty states: `EmptyStateCard`
- All loading states: `AppLoader` or `ActivityIndicator` with `Colors.actionPrimary`
- Status badges: same `statusBadge` pattern from the existing `BookingCard`
- No hardcoded colors — all from `Colors` tokens

**Navigation:** Expo Router file-based. All sub-screens are files under `app/(tabs)/booking/`. The booking hub (`index.tsx`) manages a `viewMode` state for inline views (calendar, confirmation) to avoid deep navigation stacks for flows that belong together.

**LiveKit for React Native:** `@livekit/react-native` + `@livekit/react-native-webrtc` will be added. The `LIVEKIT_WS_URL` (`wss://oathstone-9u7vqsqj.livekit.cloud`) and credentials are already in `.env.local` and are used server-side in `livekitActions.ts` — the mobile client only needs the token + wsUrl returned from `generateAccessToken`.

**Payment:** Booking payment uses the existing wallet balance (same pattern as the wallet screen's `PrimaryButton` → action flow). The `paymentTxHash: "wallet_payment"` field is passed to `createBooking`, consistent with how the web version passes `"automated_payment"`.

---

### Implementation Order Summary

| Phase | Screens/Components | Key APIs |
|---|---|---|
| 1 | Booking Hub + History | `getMyBookings`, `getMySubscription` |
| 2 | Provider Browser + Filters | `getProvidersWithPagination`, `getPublicEvents` |
| 3 | Provider Details + Calendar + Confirmation | `getProviderAvailability`, `createBooking` |
| 4 | Become a Provider Form | `createSubscriber`, `updateSubscriber` |
| 5 | Events Browse + Create + Manage | `createEvent`, `createEventBooking`, `getProviderEvents` |
| 6 | Booking Settings | `getMySettings`, `createOrUpdateSettings` |
| 7 | Live Stream (Video) | `generateAccessToken`, `startRecording`, `addStreamComment` |
| 8 | Audio Room + Recordings | `generateAudioEventToken`, `raiseHand`, `downloadRecording` |
| 9 | Referrals System | `createReferral`, `selectExpertFromReferral`, `applyToExpertRequest` |

Ready to start coding — just say which phase to begin with (or "start from Phase 1" to go in order).