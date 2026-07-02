Let me read the relevant files first before planning.

Now let me look at the create booking flow and the "create event" and "create pulse" screens specifically:

Now let me check the wallet and how currencies are stored, plus the BookingConfirmation and BookingCalendar components to understand the full flow:

Now let me check the become-provider settings and the booking subscription to understand where a provider's currency is stored:

I now have a thorough understanding of the full system. Here's the phased plan:

---

## Phased Plan: Multi-Currency Support for Content Creation

### The Problem

Right now three creator flows hardcode or default to USD:

- **Create Pulse (`write-reel.tsx`)** — already has a currency picker, but defaults to USD and uses the global `CURRENCIES` list rather than the creator's wallet currencies
- **Write Article (`write-article.tsx`)** — hardcodes `priceToken: "USD"` and shows a "Price (USD)" placeholder with no picker
- **Create Booking Session (provider setup via `ProviderSubscriptionForm.tsx` + `[id].tsx`)** — hardcodes `currency: "USD"` in the `providerInfo` object; no currency selection in the `ProviderSubscriptionForm`
- **Create Event (`EventCreationForm.tsx`)** — defaults to `"USD"`, has a full currency picker but uses a local static list rather than the provider's wallet currencies

The rule: **a buyer can only pay for content in the currency it was priced in** — no exchange, peer-to-peer.

---

### Phase 1 — Backend: Provider Currency Storage

**Goal:** Let providers declare their preferred currency at the subscription level, so it flows everywhere.

1. **Schema change** — Add `sessionCurrency: v.optional(v.string())` to the `bookingSubscribers` table. This is the currency the provider charges in for 1-on-1 and group sessions.
2. **Booking mutations** — Update `createSubscriber` and `updateSubscriber` in `bookingSubscribers.ts` to accept and persist `sessionCurrency`.
3. **Affordability check** — The `bookingPayment.checkBookingAffordability` query already accepts a `currency` param. Verify it correctly checks the buyer's balance in that specific currency (not just USD).
4. **Payment mutation** — Confirm `createBooking` (or equivalent) stores the `currency` and debits the correct wallet balance bucket.

---

### Phase 2 — Provider Setup: Currency Selection

**Goal:** When a creator becomes a provider (or updates their profile), they pick which wallet currency they charge in.

1. **`ProviderSubscriptionForm.tsx`** — Add a currency picker after the price fields (1-on-1 and group). Source the options from the provider's actual wallet balances (only currencies where balance > 0 should be selectable, or at minimum show all 9 but highlight funded ones). Default to the wallet's `primaryCurrency`.
2. **Submit payload** — Include `sessionCurrency` when calling `createSubscriber` / `updateSubscriber`.
3. **Provider card / detail page (`[id].tsx`)** — Replace the hardcoded `currency: "USD"` in `providerInfo` with `providerSubscription.sessionCurrency ?? "USD"`. This feeds correctly into `BookingCalendar` and `BookingConfirmation`.
4. **`ProviderCard.tsx`** — Display the provider's currency symbol next to their price rather than a bare `$` symbol.

---

### Phase 3 — Write Article: Currency Picker

**Goal:** Replace the hardcoded "USD" with a proper currency selector tied to the creator's wallet.

1. **State** — Add `priceCurrency` state (default: user's wallet `primaryCurrency` fetched on mount).
2. **UI** — Replace the "Price (USD)" `TextInput` placeholder with a two-column row matching the existing pattern from `write-reel.tsx` (amount input + currency dropdown). The dropdown should list only the user's funded currencies (or all 9 if none funded yet).
3. **Submit** — Pass `priceToken: priceCurrency` instead of the hardcoded `"USD"`.
4. **Article viewer / paywall** — The `ContentPaywallSheet` already reads `priceToken` dynamically, so buyers will automatically see the correct currency. However, add a check: if the buyer doesn't have a balance in that currency, show a "You need a [CURRENCY] balance to purchase this" message instead of the generic "insufficient funds" error.

---

### Phase 4 — Create Pulse: Lock to Wallet Currencies

**Goal:** The currency picker in `write-reel.tsx` already exists but shows all 9 currencies regardless of what the creator has funded.

1. **Data source** — Query the creator's wallet on the create-pulse screen and derive a list of currencies with `balance > 0`. If none funded, fall back to showing all 9 (or just the primary).
2. **Default** — Pre-select the creator's `primaryCurrency` rather than hardcoded `"USD"`.
3. **Buyer-side enforcement** — In `reel-viewer.tsx`, when the paywall fires, verify the buyer has a balance in `reel.priceToken`. If not, show a clear message: "This Pulse is priced in [NGN]. Fund your NGN wallet to access it."

---

### Phase 5 — Create Event: Lock to Wallet Currencies

**Goal:** `EventCreationForm.tsx` already has the full currency picker but defaults to USD and uses its own local `CURRENCIES` array.

1. **Data source** — Pass the provider's `sessionCurrency` (from Phase 2) as the default, or query the provider's wallet `primaryCurrency`.
2. **Restrict options** — Show only the provider's funded currencies in the picker, not the full static list.
3. **Buyer-side enforcement** — In the event purchase/booking flow, check that the buyer has a balance in `event.priceCurrency`. Surface a clear message if not.

---

### Phase 6 — Buyer-Side Currency Enforcement (Cross-Cutting)

**Goal:** Everywhere a user pays for content, block purchase cleanly if their wallet doesn't hold the required currency.

1. **`ContentPaywallSheet.tsx`** — Before initiating payment, query the buyer's wallet balance for the specific `currency`. If zero/missing, show: *"This content is priced in [NGN]. You need an NGN balance to purchase it. Go to Wallet → Deposit to add funds."*
2. **`BookingConfirmation.tsx`** — Already checks affordability via `checkBookingAffordability`. Ensure the error message specifically names the currency rather than generic "insufficient funds."
3. **Event booking** — Same check before confirming an event registration.

---

### Summary of Touch Points

| Phase | Files Changed | Scope |
|---|---|---|
| 1 | `convex/schema.ts`, `convex/bookingSubscribers.ts`, `convex/bookingPayment.ts` | Backend only |
| 2 | `ProviderSubscriptionForm.tsx`, `booking/[id].tsx`, `ProviderCard.tsx` | Provider setup + display |
| 3 | `write-article.tsx` | Article creation |
| 4 | `write-reel.tsx`, `reel-viewer.tsx` | Pulse creation + purchase |
| 5 | `EventCreationForm.tsx` | Event creation |
| 6 | `ContentPaywallSheet.tsx`, `BookingConfirmation.tsx` | Buyer enforcement |

---

The key insight driving the design: **the creator's wallet is the source of truth for which currencies are valid**. No new "supported currencies" config is needed — if you've deposited NGN, you can price content in NGN. Buyers need the matching currency in their wallet to pay. Want me to start with a specific phase?