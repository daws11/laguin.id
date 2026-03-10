# Upsell Feature — Detailed Implementation Plan

## Overview

Add a per-theme upsell system that lets admins create unlimited upsell offers shown to users during the checkout flow. Three modes are supported:

| Mode | Name | Behavior |
|------|------|----------|
| `pre-payment` | Upsells before payment | User completes Step 4 → sees upsell pages one by one → single Xendit invoice with base price + accepted upsells |
| `post-payment` | Upsells after payment | User completes Step 4 → pays base price via Xendit → sees upsell pages → second Xendit invoice for accepted upsells only |
| `none` | No upsells | Current behavior, unchanged |

---

## Data Model

### New: Upsell definition (stored in Theme settings JSON)

Each theme's `settings` JSON blob gets a new `upsells` section inside `creationDelivery`:

```json
{
  "creationDelivery": {
    "upsellMode": "none",
    "upsells": [
      {
        "id": "upsell_abc123",
        "title": "Add 3rd Verse",
        "description": "Your song comes with 2 verses by default. Add a 3rd verse (bridge) & chorus.",
        "highlightText": "For most customers, the 3rd verse is typically where someone cries out of love!",
        "price": 50000,
        "priceLabel": "One-time upgrade",
        "imageUrl": null,
        "acceptButtonText": "Yes, Add 3rd Verse!",
        "declineButtonText": "No Thanks, Continue",
        "guaranteeBadge": "30 Day Money Back Guarantee",
        "guaranteeSubtext": "Love it or get your money back, no questions asked",
        "sortOrder": 0,
        "isActive": true
      }
    ]
  }
}
```

**Why JSON in Theme settings instead of a separate DB table:**
- Consistent with how all other theme config is stored (publicSiteConfig, creationDelivery)
- Upsells are tightly coupled to themes — each theme has its own set
- Admin UI already has patterns for editing arrays in theme settings (FAQ items, how-it-works steps, audio samples)
- No need for relational queries between upsells and other entities

### Modified: Order model (Prisma schema)

Add three new fields to the `Order` model:

```prisma
model Order {
  // ... existing fields ...
  acceptedUpsells    Json?    // Array of accepted upsell objects: [{ id, title, price }]
  upsellInvoiceId    String?  // Xendit invoice ID for post-payment upsell invoice
  upsellInvoiceUrl   String?  // Xendit invoice URL for post-payment upsell invoice
}
```

- `acceptedUpsells`: Tracks which upsells the user accepted and at what price. Stored as JSON array so it's self-contained and doesn't need joins.
- `upsellInvoiceId` / `upsellInvoiceUrl`: Only used in `post-payment` mode when a second Xendit invoice is created for the upsell total.

---

## Backend API Changes

### 1. Theme settings — already handled

The upsells config lives in `Theme.settings` JSON, which is already read/written by the existing theme admin CRUD endpoints. No new endpoints needed for storage.

### 2. Public settings endpoint — expose upsells to frontend

**File:** `apps/api/src/routes/settings.public.ts`

Modify the `/api/public/settings` response to include upsell configuration when present:

```typescript
// Add to response:
upsellMode: creationDelivery?.upsellMode ?? 'none',
upsells: (creationDelivery?.upsells ?? []).filter(u => u.isActive).map(u => ({
  id: u.id,
  title: u.title,
  description: u.description,
  highlightText: u.highlightText,
  price: u.price,
  priceLabel: u.priceLabel,
  imageUrl: u.imageUrl,
  acceptButtonText: u.acceptButtonText,
  declineButtonText: u.declineButtonText,
  guaranteeBadge: u.guaranteeBadge,
  guaranteeSubtext: u.guaranteeSubtext,
}))
```

### 3. New endpoint: Accept/finalize upsells

**File:** `apps/api/src/routes/orders.public.ts`

```
POST /api/orders/:id/upsells
Body: { acceptedUpsellIds: string[] }
```

Logic:
1. Load the order and its theme settings
2. Validate that all `acceptedUpsellIds` match active upsells for this theme
3. Calculate upsell total from matched upsells
4. Store `acceptedUpsells` JSON on the order
5. **Pre-payment mode:**
   - Create a single Xendit invoice for `basePrice + upsellTotal`
   - Store `xenditInvoiceId` / `xenditInvoiceUrl` on the order
   - Return `{ xenditInvoiceUrl }`
6. **Post-payment mode:**
   - If `acceptedUpsellIds` is empty → return `{ redirect: 'confirmation' }`
   - If upsells accepted → create a second Xendit invoice for `upsellTotal` only
   - Store `upsellInvoiceId` / `upsellInvoiceUrl` on the order
   - Return `{ xenditInvoiceUrl: upsellInvoiceUrl }`

### 4. Modify existing order draft endpoint

**File:** `apps/api/src/routes/orders.public.ts`

For `POST /api/orders/draft`:
- **Pre-payment mode:** Do NOT create a Xendit invoice at draft time. Instead return `{ orderId, upsellMode: 'pre-payment' }` so the frontend knows to show upsells first.
- **Post-payment mode:** Create the Xendit invoice as normal (base price only). Return `{ orderId, xenditInvoiceUrl, upsellMode: 'post-payment' }`.
- **No upsells:** Current behavior unchanged.

### 5. Xendit webhook — handle upsell invoices

**File:** `apps/api/src/routes/xendit.webhook.ts`

The webhook currently uses `external_id` (which is `order.id`) to find the order. Since both the main invoice and upsell invoice use the same order ID as external_id, we need to distinguish them:

- Use a prefixed external_id for upsell invoices: `upsell:${order.id}`
- In the webhook handler, check for the `upsell:` prefix:
  - If present: update `upsellInvoiceId` status, log event, but don't re-trigger generation
  - If not: existing behavior (mark paid, trigger generation)

---

## Frontend Changes

### 1. New route: `/upsell`

**File:** `apps/web/src/routes/UpsellRoute.tsx` (new)

URL: `/:themeSlug/upsell?orderId=xxx` (or `/upsell?orderId=xxx` for default theme)

**Component behavior:**
- Receives `orderId` from URL params
- Fetches upsell config from settings (already loaded) or from order context
- Maintains state: `currentUpsellIndex`, `acceptedUpsellIds[]`
- Shows one upsell at a time (full-screen card similar to the attached screenshot):
  - Headline at top (e.g., "You'll get your song via email in 7 days! But before you go...")
  - Upsell card with: title, description, highlight text, price, accept button, decline button
  - Guarantee badge at bottom
- **Accept:** Add upsell ID to accepted list, advance to next
- **Decline:** Advance to next without adding
- **After last upsell:** Call `POST /api/orders/:id/upsells` with accepted IDs, then redirect based on response

**Styling:**
- Uses theme CSS variables (`--theme-accent`, `--theme-button`, etc.)
- Mobile-first, centered layout
- Accept button uses theme accent color, decline button is outlined/ghost
- Optional countdown timer for urgency

### 2. Modify ConfigRoute — redirect to upsells

**File:** `apps/web/src/routes/ConfigRoute.tsx`

In the submit handler, after receiving the draft response:

```typescript
// Current: redirect to Xendit or checkout
// New logic:
if (res.upsellMode === 'pre-payment') {
  // Don't go to Xendit yet — show upsells first
  navigate(`/${themeSlug}/upsell?orderId=${res.orderId}`)
} else if (res.xenditInvoiceUrl) {
  window.location.href = res.xenditInvoiceUrl
} else {
  navigate(`/checkout?orderId=${res.orderId}`)
}
```

### 3. Modify CheckoutRoute — redirect to upsells (post-payment mode)

**File:** `apps/web/src/routes/CheckoutRoute.tsx`

After payment is confirmed (order status = paid), check upsell mode:

```typescript
if (upsellMode === 'post-payment' && upsells.length > 0 && !order.acceptedUpsells) {
  // User just paid base price, now show upsells
  navigate(`/${themeSlug}/upsell?orderId=${order.id}`)
  return
}
// Otherwise show normal confirmation
```

### 4. Add route to React Router

**File:** `apps/web/src/main.tsx` (or wherever routes are defined)

```typescript
{ path: '/:themeSlug/upsell', element: <UpsellRoute /> },
{ path: '/upsell', element: <UpsellRoute /> },
```

---

## Admin UI Changes

### 1. Upsell mode selector

**File:** `apps/web/src/features/admin/tabs/settings/CreationDeliveryCard.tsx`

Add a new section "Upsells" with:
- Radio/select for upsell mode: `none`, `pre-payment`, `post-payment`
- Description text explaining each mode

### 2. Upsell list editor

**File:** `apps/web/src/features/admin/tabs/settings/UpsellsEditor.tsx` (new component)

Only visible when upsell mode is not `none`. Features:
- List of upsell cards with drag-to-reorder (or up/down arrows)
- Each card shows: title, price, active toggle
- "Add Upsell" button
- Click to expand/edit: title, description, highlight text, price, button texts, guarantee text, image upload, active toggle
- Delete button with confirmation

This follows the same pattern as the FAQ items editor or how-it-works steps editor.

---

## Order Admin — Upsell Visibility

### Show accepted upsells in order detail

**File:** `apps/web/src/features/admin/tabs/orders/AdminOrdersTab.tsx`

In the order detail view, add a section showing:
- Which upsells were accepted (title + price each)
- Total upsell amount
- Upsell payment link (if post-payment mode, for admin to share)
- Combined total (base + upsells)

---

## Implementation Phases (Suggested Order)

### Phase 1: Data & Backend
1. Add `acceptedUpsells`, `upsellInvoiceId`, `upsellInvoiceUrl` to Prisma schema
2. Run `prisma db push`
3. Add upsell fields to public settings response
4. Modify `POST /orders/draft` to return `upsellMode`
5. Create `POST /orders/:id/upsells` endpoint
6. Update Xendit webhook for upsell invoice handling

### Phase 2: Admin UI
7. Add upsell mode selector to CreationDeliveryCard
8. Build UpsellsEditor component
9. Wire up save/load with theme settings

### Phase 3: Customer-Facing UI
10. Build UpsellRoute component (the upsell page users see)
11. Update ConfigRoute submit handler for pre-payment redirect
12. Update CheckoutRoute for post-payment upsell redirect
13. Add routes to router config

### Phase 4: Admin Order View
14. Show accepted upsells in order detail
15. Show upsell invoice link for admin sharing

---

## Edge Cases & Considerations

1. **Manual confirmation + upsells:** If manual confirmation is ON and upsell mode is pre-payment, the upsell flow still works — user sees upsells, then gets sent to WhatsApp. The Xendit invoice (with upsell total) is created in the background as we already do for manual mode.

2. **Free orders (paymentAmount = 0):** Upsells should still work. If base price is 0 but upsells are accepted, a Xendit invoice is created for the upsell total only.

3. **User refreshes during upsell flow:** The UpsellRoute should check if upsells have already been finalized (`order.acceptedUpsells` exists) and redirect to the appropriate next step instead of showing upsells again.

4. **Expired Xendit invoices:** If a pre-payment invoice expires (user took too long on upsells), the upsell endpoint should handle creating a fresh invoice. This is not a new problem — existing flow has the same risk.

5. **Currency:** All prices are in IDR (same as existing paymentAmount). The upsell price is stored as an integer (e.g., 50000 = Rp 50.000).

6. **Analytics:** Track upsell acceptance/decline in OrderEvents for funnel analysis. Consider adding Meta Pixel events for upsell conversions (e.g., `AddToCart` for upsell accept, `Purchase` for upsell payment).

7. **Post-payment mode timing:** The upsell page could optionally include a countdown timer or urgency element to encourage quick decisions before the user leaves. This is configurable per upsell.

8. **Multiple upsell invoices:** In post-payment mode, if the user somehow revisits the upsell page, check if a previous upsell invoice was already created and either reuse it or void it before creating a new one.

---

## Example User Flows

### Pre-payment flow (base 200k + 3 upsells at 50k each):
```
Step 4 → Upsell 1 (Accept ✓) → Upsell 2 (Decline ✗) → Upsell 3 (Accept ✓)
→ POST /orders/:id/upsells { acceptedUpsellIds: ["upsell_1", "upsell_3"] }
→ Xendit invoice created for 300k (200k + 50k + 50k)
→ User pays 300k → webhook fires → order confirmed
```

### Post-payment flow (base 200k + 2 upsells at 50k each):
```
Step 4 → Xendit invoice for 200k → User pays 200k → webhook fires → order confirmed
→ Redirect to Upsell 1 (Accept ✓) → Upsell 2 (Accept ✓)
→ POST /orders/:id/upsells { acceptedUpsellIds: ["upsell_1", "upsell_2"] }
→ Second Xendit invoice created for 100k (50k + 50k)
→ User pays 100k → webhook fires → upsell payment recorded
→ Confirmation page
```

### No upsells:
```
Step 4 → Xendit invoice for 200k → User pays → Confirmation page
(Current behavior, unchanged)
```
