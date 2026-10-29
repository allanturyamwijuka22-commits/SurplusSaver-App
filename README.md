# SurplusSaver — Kampala Food Surplus Marketplace

**Tagline:** *Good Food. Better Prices. Less Waste.*  
**Primary Market:** Kampala, Uganda (`UGX` integer minor-unit financial engine)

---

## 1. System Architecture & Key Technical Decisions

- **Frontend & UI Architecture:** React 19 + TypeScript + Tailwind CSS v4 with a mobile-first, low-bandwidth-capable design system (`Fraunces` editorial display, `Plus Jakarta Sans` UI prose, `JetBrains Mono` tabular numerals).
- **Authentication & Persistent Database:** Firebase Authentication (Google Sign-In via `signInWithPopup`) + Cloud Firestore Enterprise Edition (`firebase-applet-config.json`), secured by Zero-Trust Attribute-Based Access Control (`firestore.rules`) validated with `@firebase/eslint-plugin-security-rules`.
- **PII Isolation (Uganda PDPO Compliance):** Personal Identifiable Information (`email`, `phone`, `pdpoConsentVersion`) is isolated inside `/users/{userId}/private/{docId}` and is unreadable by other customers or competing businesses.
- **Atomic Inventory & Financial Engine (`src/lib/domainLogic.ts`):**
  - Uses Firestore transactions (`runTransaction`) and optimistic atomic checks to prevent two concurrent customers from purchasing the final available unit.
  - All monetary values (`originalPriceUgx`, `discountedPriceUgx`, `grossTotalUgx`, `platformCommissionUgx`, `netBusinessProceedsUgx`) are stored and calculated as exact integers in `UGX` with basis-point commission math (`1500 bps = 15.00%`) to prevent floating-point rounding errors.
- **Strict Three-Deadline Food Safety Model:** Every listing tracks and validates:
  1. `saleDeadlineIso` (online reservation cutoff)
  2. `collectionDeadlineIso` (customer handover deadline)
  3. `safeUseDeadlineIso` (safe consumption guideline)

---

## 2. External Services, Sandbox Boundaries & Launch Requirements

| Service Domain | Current Implementation Status | Production Launch Requirement |
| :--- | :--- | :--- |
| **Database & Auth** | **Live** (Provisioned Firebase Auth + Firestore with deployed `firestore.rules`) | Review and harden custom domain authorized redirect URIs in Firebase Console. |
| **Payments (MTN MoMo, Airtel Money, Card)** | **Explicitly Labeled Sandbox Mode** (`mtn_momo_sandbox`, `airtel_money_sandbox`, `card_sandbox`) with SHA-256 webhook signature & idempotency verifier | Add live `FLUTTERWAVE_SECRET_KEY` / `PESAPAL_CONSUMER_KEY` in `.env` and point webhook URL to backend endpoint. |
| **Email & Uganda SMS Notifications** | **In-App Live** + Explicit Gateway Setup Status | Configure `SMTP_HOST` and `AFRICASTALKING_API_KEY` for live SMS delivery to `+256` numbers. |
| **Business KCCA Verification** | **Live Admin Workflow** (Approve / Reject / Suspend with KCCA Permit & URA TIN capture) | Establish operational verification SOP with Kampala Capital City Authority (KCCA) public health registry. |

---

## 3. Local Development, Testing & Production Deployment

```bash
# 1. Install dependencies
npm install

# 2. Validate Firestore security rules with ESLint
npx eslint firestore.rules

# 3. Run the automated Vitest quality & security suite
npx vitest run

# 4. Type-check and build production bundle
npm run lint
npm run build
```
