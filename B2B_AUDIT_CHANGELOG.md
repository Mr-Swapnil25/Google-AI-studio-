# Anna Bazaar B2B Audit & Fix - Complete CHANGELOG

**Date:** Generated during comprehensive platform audit  
**Scope:** Enforce B2B bulk-only operations, Dynamic Mandi Price Engine, Farmer↔Buyer negotiation hardening, error handling defenses

---

## 📋 Executive Summary

This audit transformed Anna Bazaar from a mixed retail/bulk platform into a **pure B2B bulk trading platform** with:
- ✅ Minimum order quantity: **100kg (1 quintal)**
- ✅ Dynamic floor price enforcement based on mandi data
- ✅ Offer classification system (INVALID/LOW/FAIR/GENEROUS)
- ✅ Server-side validation preventing offers below floor price
- ✅ Enhanced error handling with message retry capability

---

## 📁 Files Modified

### 1. `services/mandiPriceService.ts` (NEW FILE)
**Purpose:** Core dynamic pricing engine for B2B negotiations

**Key Features:**
- `fetchMandiPrice(commodityName, state?, district?)` - Queries Firestore mandiPrices collection
- `computePriceBand(commodityName, grade, state?, district?, logisticsType?)` - Returns PriceBand with floor/target/stretch prices
- `classifyOffer(offerPrice, priceBand)` - Returns OfferClassification: INVALID/LOW/FAIR/GENEROUS
- `validateOfferPrice()` - Full async validation with classification
- `validateBulkQuantity(quantityKg)` - Enforces MIN_BULK_QUANTITY_KG (100kg)
- `formatBulkQuantity(quantityKg)` - Display helper (quintals/tons)

**Constants:**
- `NATIONAL_FALLBACK_PRICES` - Fallback prices when mandi data unavailable
- `QUALITY_FACTORS` - Multipliers for grades A (1.0), B (0.85), C (0.70)
- `LOGISTICS_PER_QUINTAL` - Cost by region (local: ₹50, regional: ₹150, national: ₹300)
- `GRADE_MARGINS` - Target price margins (A: 15%, B: 10%, C: 5%)

**Price Calculation Formula:**
```
floorPrice = (BaseMandiPrice × QualityFactor) + LogisticsShare
targetPrice = BaseMandiPrice × (1 + MarginPercent) × QualityFactor
```

---

### 2. `types.ts`
**Changes:**
- Added `MessageStatus` type: `'sending' | 'sent' | 'failed'`
- Added `BulkUnit` enum: `Kg = 'kg', Quintal = 'quintal', Ton = 'ton'`
- Added `MIN_BULK_QUANTITY_KG = 100` constant
- Enhanced `ChatMessage` interface with optional `status?: MessageStatus`
- Enhanced `Negotiation` interface with:
  - `floorPrice?: number`
  - `targetPrice?: number`
  - `priceSource?: string`
  - `priceVerified?: boolean`
  - `qualityGrade?: string`
  - `farmerLocation?: { state?: string; district?: string }`
- Deprecated `ProductType.Retail` with backward compatibility note

---

### 3. `services/firebaseService.ts`
**Changes:**
- `mapNegotiations()` now extracts all new price-related fields from Firestore
- `createNegotiation()` returns `{ success: boolean; error?: string }`:
  - Validates `offeredPrice >= floorPrice` (if provided)
  - Validates `quantity >= 100kg`
  - Returns descriptive error messages on validation failure
- `updateNegotiation()` returns `{ success: boolean; error?: string }`:
  - Validates price floor for buyer counter-offers
  - Farmers can counter at any price

---

### 4. `components/BuyerNegotiationConsole.tsx`
**Changes:**
- Added imports for `MIN_BULK_QUANTITY_KG`, `classifyOffer`, `PriceBand`, `OfferClassification`
- Computes `priceBand` from negotiation data (floorPrice, targetPrice)
- Computes `offerClassification` based on current price input
- Added validation flags: `isOfferValid`, `isQuantityValid`, `canSubmitOffer`
- **UI Additions:**
  - Price Floor Indicator showing minimum floor and fair target prices
  - Offer Classification Badge with color-coded status:
    - INVALID: Red badge with block icon
    - LOW: Orange badge with trending down
    - FAIR: Green badge with check circle
    - GENEROUS: Blue badge with trending up
  - Price/Quantity spinners highlight red when invalid
  - Update Offer button disabled with explanation when validation fails

---

### 5. `components/NegotiationModal.tsx`
**Changes:**
- Added `computePriceBand` and `classifyOffer` integration
- Added state: `priceBand`, `isLoadingPrices`
- Async price band loading on modal open
- **UI Additions:**
  - Price Band Display showing floor/target prices with source
  - "Fallback pricing" warning when mandi data unavailable
  - Offer Classification indicator (for buyers only)
  - Quantity input enforces MIN_BULK_QUANTITY_KG with validation message
  - Price input shows validation error if below floor
  - Submit button disabled when validation fails
- `onSubmit` now passes `priceBand` in values object

---

### 6. `App.tsx`
**Changes:**
- Updated `handleNegotiationSubmit` function signature to accept `priceBand` in values
- Modified to:
  - Enforce MIN_BULK_QTY (100kg) with error toast
  - Pass priceBand fields (floorPrice, targetPrice, priceSource, priceVerified) to `createNegotiation()`
  - Handle `{ success, error }` return from Firebase operations
  - Show specific error messages on validation failure
- Updated `handleNegotiationResponse` to handle new return type
- Removed cart addition on deal acceptance (B2B doesn't use cart for negotiated deals)
- **Message Retry System:**
  - `handleSendMessage` now marks messages as 'sending' then 'failed' on error
  - Added `handleRetryMessage` function for retrying failed messages
  - Updated `handleSendMessageToNegotiation` with same pattern
  - Passed `onRetryMessage` to ChatModal

---

### 7. `components/ChatModal.tsx`
**Changes:**
- Added optional `onRetryMessage?: (messageId: string) => void` prop
- Enhanced message rendering to show status:
  - "Sending..." indicator for in-progress messages
  - "Failed to send" with red styling for failed messages
  - Double-check icon for sent messages
- Added retry button below failed messages: "Tap to retry"

---

### 8. `components/FarmerView.tsx`
**Changes:**
- Changed `activeFormTab` default to `ProductType.Bulk`
- Changed `initialFormState.quantity` default to 100 (1 quintal)
- Removed Retail/Bulk tab toggle from Add Product Modal
- Added B2B Bulk Platform Notice:
  > "All listings are for bulk wholesale orders with a minimum quantity of 1 quintal (100kg). Retail orders are not supported."

---

### 9. `components/ProductUploadPage.tsx`
**Changes:**
- Removed Retail/Bulk toggle buttons entirely
- Added B2B Bulk Platform Notice:
  > "All listings are for bulk wholesale only. Minimum order quantity is 1 quintal (100kg)."

---

### 10. `components/BuyerView.tsx`
**Changes:**
- Changed `filterType` from stateful `'All' | 'Retail' | 'Bulk'` to fixed `'Bulk'`
- Product filtering shows all products (legacy compatibility - all are now bulk)
- Product cards updated:
  - Replaced conditional "Add to Cart / Start Negotiation" with single "Start Bulk Negotiation" button
  - Changed quantity display from `Retail / Min: Xkg` to always show `Bulk: Min Xkg`
  - Styled quantity badge with blue B2B indicator
- Updated "No products found" message to "No bulk listings found"

---

## 🔒 Validation Flow

### Client-Side Validation (UI)
1. Price input validates against computed `floorPrice`
2. Quantity input validates against `MIN_BULK_QUANTITY_KG` (100)
3. Submit button disabled when either validation fails
4. Classification badge provides feedback (INVALID blocks submission)

### Server-Side Validation (Firebase)
1. `createNegotiation()` checks:
   - `offeredPrice >= floorPrice` (if floor provided)
   - `quantity >= 100`
2. `updateNegotiation()` checks:
   - Price floor for buyer counter-offers
   - Farmers exempt (can counter at any price)
3. Returns `{ success: false, error: "message" }` on failure

---

## ✅ Flow Validation Checklist

### Happy Path
- [ ] Farmer creates bulk listing (defaults to 100kg minimum)
- [ ] Buyer discovers listing in marketplace
- [ ] Buyer clicks "Start Bulk Negotiation"
- [ ] NegotiationModal loads price band from mandi service
- [ ] Buyer submits offer ≥ floor price
- [ ] Negotiation created successfully in Firestore
- [ ] Farmer sees negotiation in dashboard
- [ ] Farmer can Accept, Reject, or Counter
- [ ] Both parties can chat with message status indicators
- [ ] Deal accepted → success notification

### Error Cases
- [ ] Buyer attempts offer < floor price → UI blocks submission
- [ ] Buyer attempts quantity < 100kg → validation error shown
- [ ] Server rejects below-floor offer → error toast displayed
- [ ] Message send fails → "Failed to send" shown with retry button
- [ ] Retry message → success toast on recovery

### Fallback Pricing
- [ ] Mandi data unavailable → "Fallback pricing" warning shown
- [ ] National average prices used for floor/target calculation
- [ ] Platform remains functional without live mandi data

---

## 🛡️ Error Handling Defenses

| Defense | Location | Description |
|---------|----------|-------------|
| Fallback Pricing | `mandiPriceService.ts` | National averages when mandi data unavailable |
| Price Floor UI | `NegotiationModal.tsx` | Shows warning, disables submit |
| Quantity Minimum | Multiple files | 100kg enforced at UI and server |
| Server Validation | `firebaseService.ts` | Rejects invalid offers at write time |
| Message Retry | `App.tsx`, `ChatModal.tsx` | Failed messages show retry button |
| Role-Based Views | `App.tsx` | Farmers see FarmerView, Buyers see BuyerView |
| KYC Gate | `App.tsx` | Farmers must complete KYC before selling |

---

## 📊 Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| Retail support | Yes | **No** (B2B only) |
| Min order quantity | None | **100kg** |
| Price floor enforcement | None | **Dynamic mandi-based** |
| Offer classification | None | **4-tier system** |
| Message status tracking | None | **sending/sent/failed** |
| Server-side validation | Basic | **Comprehensive with errors** |

---

## 🚀 Next Steps (Optional Enhancements)

1. **Location Override UI** - Manual State/District dropdown when geolocation fails
2. **Unverified Price Override** - Checkbox for farmers to accept offers below floor
3. **Real-time Mandi Price Updates** - Cloud Function to refresh prices from government APIs
4. **Bulk Order Logistics Integration** - Calculate delivery costs based on distance
5. **Contract Generation** - PDF agreement for accepted deals

---

*Generated by comprehensive B2B audit process*
