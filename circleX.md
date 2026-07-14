## Circle Feature — Implementation Plan

---

## STEP 1: Sub-Circles & Circle-Only Content ✅ COMPLETE

All 9 phases implemented and deployed.

| Phase | Status |
|-------|--------|
| Phase 1 — Schema & Sub-Circles Infrastructure | ✅ Done |
| Phase 2 — Sub-Circle CRUD & Queries | ✅ Done |
| Phase 3 — Circle-Only Content & Announcements | ✅ Done |
| Phase 4 — Circle Detail Redesign & Content Feed | ✅ Done |
| Phase 5 — Circle Chat for Sub-Circles | ✅ Done |
| Phase 6 — Circle-Only Content Creation UI | ✅ Done |
| Phase 7 — Community Badge & Join Button | ✅ Done |
| Phase 8 — Feed & AI Integration | ✅ Done |
| Phase 9 — Migration & Backward Compatibility | ✅ Done |

---

## STEP 2: Circle-Only Events & Circle-Only Booking

**Goal:** Retire the standalone `circle-events.tsx` screen and the "Expert Requests" quick action. Replace them with circle-scoped usage of the existing Booking/Events system. Circle creators can create circle-only events (using the platform's booking/events feature) and invite/onboard practitioners for circle-only bookings. Members must join the circle before attending events or making bookings.

---

### What gets retired

1. **`app/(tabs)/circle-events.tsx`** — removed entirely. Events for a circle now use the existing booking/events system with a `circleId` + `isCircleOnly` scope.
2. **"Events" quick action** on `circle-detail.tsx` — replaced with a link to the circle's events within the booking section, or shown inline on circle-detail.
3. **"Requests" quick action** on `circle-detail.tsx` — replaced by a "Practitioners" / "Book" section within the circle.

---

### Key Design Decisions

1. **Circle-only events use the existing `bookings`/events schema** — just like articles/reels gained `circleId` + `isCircleOnly`, events gain the same fields. The event creation flow already exists in the booking feature; we add a circle scope to it.

2. **Circle-only bookings use the existing booking system** — circle creators can invite practitioners (existing platform users with practitioner profiles) or onboard new ones. Members book those practitioners through the normal booking flow, gated by circle membership.

3. **Public visibility, member-only attendance** — circle events and practitioners are visible to everyone (they appear in the booking section publicly), but the "Attend" / "Book" action requires circle membership. Non-members see a "Join [Circle Name] to attend" prompt.

4. **Feature parity — circle-only events/bookings have the EXACT SAME features as standard ones** — The only difference is the membership gate. All existing capabilities apply:
   - **Live streaming** (audio-only events, video live streams) — works identically for circle events
   - **Event types** (LIVE_STREAM, AUDIO_ONLY) — all supported
   - **RSVP / attendance tracking** — same, gated by membership
   - **Recordings / replays** — same
   - **Paid events / ticketing** — same (circle members still pay if event is paid)
   - **Recurring events / scheduling** — same
   - **Booking sessions** (1:1, group) — same, gated by membership
   - **Booking payments / revenue split** — same (practitioner gets their share)
   - **Session notes / follow-ups** — same
   - **Calendar integration** — same
   - **Notifications / reminders** — same (sent only to circle members who RSVP'd)
   - **Event chat / Q&A during live** — same
   
   In short: the system treats circle events/bookings as regular events/bookings with one extra guard (`isCircleExclusive` / `isCircleOnly`). No features are removed or simplified.

5. **Re-use existing components — do NOT rewrite** — All implementation must extend or update existing screens, components, mutations, and queries. Do not create duplicate versions of event creation, booking flow, practitioner cards, live stream UI, etc. Instead:
   - Pass `circleId` as a param to existing screens (event creation, booking flow, live stream)
   - Add conditional logic inside existing components for the membership gate
   - Re-use `CommunityBadge` from Step 1 for circle attribution on event/booking cards
   - Extend existing backend mutations with optional `circleId` + validation (same pattern as Step 1 for articles/reels)
   - If a component needs a new prop (e.g. `circleId`, `isCircleExclusive`), add it as optional — existing usage continues to work unchanged

---

### Phase 1: Schema — Circle-Only Events & Bookings

**Goal:** Extend the events and booking tables to support circle scoping.

**1.1 — Add fields to the events/bookings table (already has `circleId` + `isCircleExclusive`)**

The events schema already has:
- `circleId: v.optional(v.id("circles"))` — link event to a circle
- `isCircleExclusive: v.optional(v.boolean())` — only circle members can join

These are sufficient. No new schema fields needed for events. The existing `isCircleExclusive` flag enforces member-only attendance.

**1.2 — New `circlePractitioners` table**

| Field | Type | Notes |
|-------|------|-------|
| `circleId` | `v.id("circles")` | The circle this practitioner is linked to |
| `practitionerId` | `v.id("users")` | The practitioner's user ID |
| `invitedBy` | `v.id("users")` | Who invited/onboarded them |
| `status` | `v.string()` | `"INVITED"` \| `"ACCEPTED"` \| `"ONBOARDED"` |
| `specialties` | `v.optional(v.array(v.string()))` | What they offer in this circle |
| `isActive` | `v.boolean()` | |
| `createdAt` | `v.number()` | |

Indexes: `by_circle` (circleId), `by_practitioner` (practitionerId), `by_circle_practitioner` (circleId, practitionerId)

**1.3 — Ensure bookings table can be circle-scoped**

Add to `bookings` table (if not already present):
- `circleId: v.optional(v.id("circles"))` — links booking to a circle
- `isCircleOnly: v.optional(v.boolean())` — if true, only circle members can book

New index: `by_circle` (circleId)

---

### Phase 2: Backend — Circle Events CRUD

**Goal:** Circle admins can create events that are circle-exclusive using the existing events system.

**2.1 — Modify event creation mutation**

- When a circle CREATOR/ADMIN creates an event with `circleId` set:
  - Auto-set `isCircleExclusive: true`
  - Validate that the user is CREATOR/ADMIN of that circle
- The event shows up in the main booking/events listing (publicly visible)
- Attendance/RSVP is gated: backend checks circle membership before allowing join

**2.2 — Circle events query**

- New query: `getCircleEvents(circleId)` — returns all events linked to a circleId
- Used by the circle-detail screen to show upcoming events inline

**2.3 — Attendance gating**

- Modify the event join/RSVP mutation: if `isCircleExclusive === true`, check that the user is an active member of the event's `circleId`. If not, return an error with the circleId so the frontend can show the "Join circle" prompt.

**2.4 — Auto-post event to Announcements sub-circle**

When a circle event is created:
1. Find the circle's Announcements sub-circle (same logic as article/reel auto-announcement from Step 1)
2. Insert a `content_link` message into the Announcements sub-circle:
   - `messageType: "content_link"`
   - `content`: JSON with `{ contentType: "event", contentId: eventId, title, date, coverImage }`
   - This ensures all circle members see "📅 New event: [Title]" in their Announcements feed
3. Since Announcements content surfaces in the for-you feed (Step 1 Phase 8), the event announcement is visible to all users — with community badge + "Join to attend" gate

**2.5 — Events in the for-you feed**

- Circle events (where `isCircleExclusive === true`) appear in the for-you feed as event cards
- They are NOT gated from viewing — anyone can see the event details (title, date, description, attendee count)
- The "Attend" action is gated: non-members see "Join [Circle Name] to attend"
- Event cards in the feed show the `CommunityBadge` component (same as articles/reels from Step 1)
- The for-you feed query (`listUnifiedFeed` in `convex/feed.ts`) is extended to include upcoming circle events as a third content type alongside articles and reels

---

### Phase 3: Backend — Circle Practitioners & Bookings

**Goal:** Circle creators can invite/onboard practitioners. Members can book them.

**3.1 — New file `convex/circlePractitioners.ts`**

| Function | Type | Description |
|----------|------|-------------|
| `invitePractitioner` | mutation | Circle CREATOR/ADMIN only. Invites an existing platform user (who has a practitioner/expert profile) to the circle. Creates a `circlePractitioners` record with status `"INVITED"`. |
| `acceptInvitation` | mutation | Called by the practitioner to accept. Sets status to `"ACCEPTED"`. |
| `onboardPractitioner` | mutation | Circle CREATOR/ADMIN only. For practitioners not yet on the platform — creates a placeholder or sends an onboarding invite. Sets status `"ONBOARDED"`. |
| `removePractitioner` | mutation | Circle CREATOR/ADMIN only. Deactivates the practitioner from the circle. |
| `getCirclePractitioners` | query | Returns all active practitioners for a circle, with profile info. |
| `getMyCircleInvitations` | query | Returns pending invitations for the current user (practitioner view). |

**3.2 — Circle-scoped booking creation**

- Modify the existing booking creation flow: when a booking is made to a practitioner linked to a circle, set `circleId` and `isCircleOnly: true` on the booking.
- Validation: user must be a member of the circle to book a circle practitioner.
- The booking still appears in the user's normal bookings list (the booking section), but is tagged with the circle's community badge.

**3.3 — Practitioner search within circle**

- Query that returns practitioners available in a specific circle, with their specialties, availability, and booking info.

---

### Phase 4: Frontend — Circle Detail Updates (Events & Practitioners)

**Goal:** Replace the old "Events" and "Requests" quick actions with circle-scoped events and practitioners.

**4.1 — Remove old quick actions from `circle-detail.tsx`**

- Remove the "Events" quick action that navigated to `circle-events.tsx`
- Remove the "Requests" quick action that navigated to `expert-requests`
- Replace with:
  - **"Events" section** — inline list of upcoming circle events (max 3, with "View All" linking to booking section filtered by circle)
  - **"Practitioners" section** — inline list of circle practitioners (max 3, with "View All" and "Book" button per practitioner)

**4.2 — "Create Event" button (admin only)**

- Visible only to CREATOR/ADMIN
- Navigates to the existing event creation screen with `circleId` pre-filled
- The event creation screen auto-sets `isCircleExclusive: true`

**4.3 — "Invite Practitioner" button (admin only)**

- Visible only to CREATOR/ADMIN
- Opens a search/picker for platform users with practitioner profiles
- Or an "Onboard new" option for off-platform practitioners

**4.4 — Event cards on circle-detail**

- Each event card shows: title, date/time, attendee count, "Attend" or "Joined" badge
- If user is not a circle member: show "Join circle to attend" overlay instead of "Attend"

**4.5 — Practitioner cards on circle-detail**

- Each card shows: practitioner name, avatar, specialty, "Book" button
- If user is not a circle member: show "Join circle to book" overlay

---

### Phase 5: Frontend — Booking Section Integration

**Goal:** Circle events and practitioners appear in the main booking/events section with circle attribution.

**5.1 — Events listing (booking section)**

- Circle-exclusive events appear in the main events listing alongside public events
- Show the community badge: "[Circle Icon] [Circle Name] · Members Only"
- "Attend" button gated: if not a member, shows "Join [Circle Name]" instead
- Tapping "Join" navigates to circle-detail to join, then back

**5.2 — Practitioners listing (booking section)**

- Circle practitioners appear when browsing practitioners, tagged with circle badge
- "Book" button gated same way: non-members see "Join [Circle Name] to book"
- Filter option: "Circle Practitioners" shows only those linked to user's circles

**5.3 — Booking flow**

- When booking a circle practitioner: normal booking flow, with `circleId` + `isCircleOnly` auto-set
- Booking confirmation shows circle attribution
- Booking appears in the user's bookings with community badge

---

### Phase 6: Frontend — Retire Old Screens

**Goal:** Clean up deprecated screens and navigation.

**6.1 — Remove or deprecate `circle-events.tsx`**

- Remove the screen file or redirect to the booking section filtered by circleId
- Remove the tab/route registration if it was a dedicated route

**6.2 — Update navigation references**

- Remove any navigation to `circle-events` from other screens
- Update circle-detail to use the new inline events section
- Remove "Expert Requests" navigation references

---

### Execution Order

1. **Phase 1** → Schema changes (circlePractitioners table, booking circleId field)
2. **Phase 2** → Backend event CRUD + attendance gating
3. **Phase 3** → Backend practitioners CRUD + circle-scoped bookings
4. **Phase 4** → Circle-detail UI (events + practitioners sections, admin actions)
5. **Phase 5** → Booking section integration (community badge, membership gating)
6. **Phase 6** → Retire old screens + cleanup

---

### Key Behaviors Summary

| Feature | Visibility | Who can act | Gate |
|---------|-----------|-------------|------|
| Circle event | Publicly visible in booking section | Only circle members can attend | "Join [Circle] to attend" prompt for non-members |
| Circle practitioner | Publicly visible in booking section | Only circle members can book | "Join [Circle] to book" prompt for non-members |
| Create event | Circle-detail (admin section) | CREATOR/ADMIN only | — |
| Invite practitioner | Circle-detail (admin section) | CREATOR/ADMIN only | — |
| Onboard practitioner | Circle-detail (admin section) | CREATOR/ADMIN only | — |

---

Waiting for approval before implementation begins.
