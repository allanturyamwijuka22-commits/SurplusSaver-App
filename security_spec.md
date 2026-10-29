# SurplusSaver — Payload-First Security TDD Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **PII Isolation Invariant**: Personal Identifiable Information (`email`, `phone`, `pdpoConsentVersion`) is isolated inside `/users/{userId}/private/{docId}` and is strictly inaccessible to any user other than `userId` or a verified platform administrator (`isAdmin()`).
2. **Role & Privilege Invariant**: Users cannot self-assign `role: "admin"` on `/users/{userId}` creation or escalate their role during profile updates unless `isAdmin()` is true.
3. **Business Ownership & Verification Invariant**: A `/businesses/{businessId}` document must have `ownerUid == request.auth.uid` on creation (with `verificationStatus == 'pending'`), and only `isAdmin()` can transition `verificationStatus` to `'approved'`, `'rejected'`, or `'suspended'`.
4. **Listing Safety & Price Integrity Invariant**: Every `/listings/{listingId}` document must have `discountedPriceUgx > 0`, `discountedPriceUgx < originalPriceUgx`, `remainingQuantity >= 0`, `remainingQuantity <= totalQuantity`, and valid non-empty `allergens` and `storageInstructions`.
5. **Order Isolation & Query Enforcer Invariant**: `/orders/{orderId}` documents contain private customer reservations and business financials. `list` and `get` operations are strictly restricted to the customer who placed the order (`resource.data.customerUid == request.auth.uid`), the business owner fulfilling it (`resource.data.businessOwnerUid == request.auth.uid`), or `isAdmin()`.
6. **Terminal State Locking**: Once an order reaches `orderStatus == 'collected'` or `orderStatus == 'refunded'`, non-admin users cannot mutate the order status backward.
7. **Temporal Integrity**: All `createdAt` and `updatedAt` fields are validated against server time (`request.time`), and `createdAt` is immutable on update.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Self-Admin Escalation)**: `POST /users/attacker_1` with `{ role: "admin" }` by a non-admin user -> `PERMISSION_DENIED`.
2. **Payload 2 (Cross-User PII Read)**: `GET /users/victim_1/private/info` by `attacker_1` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on Listing)**: `POST /listings/list_1` including undocumented field `{ isVerifiedOverride: true }` -> `PERMISSION_DENIED` via `hasOnly()`.
4. **Payload 4 (Unverified Email Admin Spoof)**: Request with `email == "osbertallan09@gmail.com"` but `email_verified == false` -> `PERMISSION_DENIED`.
5. **Payload 5 (Invalid Discount Math)**: `POST /listings/list_2` where `discountedPriceUgx (25000) >= originalPriceUgx (20000)` -> `PERMISSION_DENIED`.
6. **Payload 6 (Negative Inventory Oversell)**: `PATCH /listings/list_1` setting `remainingQuantity: -1` -> `PERMISSION_DENIED`.
7. **Payload 7 (Competitor Order Scraping)**: `LIST /orders` without filtering by `customerUid == request.auth.uid` or `businessOwnerUid == request.auth.uid` -> `PERMISSION_DENIED`.
8. **Payload 8 (Terminal Order Mutation)**: `PATCH /orders/ord_1` when `existing().orderStatus == 'collected'` attempting to set `orderStatus: 'cancelled'` by customer -> `PERMISSION_DENIED`.
9. **Payload 9 (Business Self-Approval)**: `POST /businesses/biz_1` with `verificationStatus: "approved"` by non-admin business owner -> `PERMISSION_DENIED`.
10. **Payload 10 (ID Poisoning / 1MB String)**: `POST /complaints/bad$id!` or `description` > 800 chars -> `PERMISSION_DENIED`.
11. **Payload 11 (Immortal Field Tampering)**: `PATCH /orders/ord_1` changing `customerUid` or `createdAt` -> `PERMISSION_DENIED`.
12. **Payload 12 (Audit Log Deletion/Tampering)**: `DELETE /audit_logs/log_1` or `PATCH /audit_logs/log_1` -> `PERMISSION_DENIED` (Audit logs are append-only).

---

## 3. Red Team Audit & Conflict Report

| Collection | Identity Spoofing Guard | State Shortcutting Guard | Resource / Value Poisoning Guard | Result |
| :--- | :--- | :--- | :--- | :--- |
| `/users/{userId}` | `userId == request.auth.uid && incoming().uid == request.auth.uid` | Blocks `role == 'admin'` unless `isAdmin()` | Strict `hasOnly` + string `.size()` bounds | PASS |
| `/users/{userId}/private/{docId}` | Owner or `isAdmin()` only | Strict PII schema validation | Max string sizes enforced | PASS |
| `/businesses/{businessId}` | `incoming().ownerUid == request.auth.uid` | `verificationStatus == 'pending'` on non-admin create | `isValidBusiness(incoming())` wraps create & update | PASS |
| `/listings/{listingId}` | `incoming().ownerUid == request.auth.uid` (or inventory update) | Prevents negative stock or price > original | `isValidListing(incoming())` wraps all writes | PASS |
| `/orders/{orderId}` | `incoming().customerUid == request.auth.uid` on create | Terminal lock on `collected` / `refunded` | `isValidOrder(incoming())` + `affectedKeys().hasOnly()` | PASS |
| `/complaints/{complaintId}` | `incoming().reporterUid == request.auth.uid` | Only admin/business can resolve | `isValidComplaint(incoming())` | PASS |
| `/reviews/{reviewId}` | `incoming().customerUid == request.auth.uid` | Immutable after creation | Rating `1..5` + comment `<= 500` chars | PASS |
| `/audit_logs/{logId}` | `incoming().actorUid == request.auth.uid` | Append-only (`allow update, delete: if false`) | `isValidAuditLog(incoming())` | PASS |
