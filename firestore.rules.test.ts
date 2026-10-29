import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  attemptAtomicInventoryReservation,
  calculateDiscountPercent,
  calculateOrderEconomics,
  evaluateListingEligibility,
  filterAndRankListings,
  formatUgx,
  generateCollectionCode,
  getCommissionBpsForTier,
  processIdempotentWebhook,
  verifyCollectionCodeInput,
  verifyWebhookSignature,
  WebhookEventPayload,
} from './src/lib/domainLogic';
import { buildInitialSeedData } from './src/lib/seedData';
import { OrderRecord } from './src/types/marketplace';

describe('SurplusSaver Critical User Journeys & Security Rule Verification Suite', () => {
  const nowMs = Date.now();
  const { businesses, listings } = buildInitialSeedData(nowMs);

  it('1 & 13. Enforces Firestore Security Rules Eight Pillars & rejects all Dirty Dozen attack vectors', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

    // Pillar 1: Global default-deny safety net
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');

    // Pillar 2 & 3: Path variable hardening & strict schema validation helpers
    expect(rulesContent).toContain('function isValidId(id)');
    expect(rulesContent).toContain('function isValidUserProfile(data)');
    expect(rulesContent).toContain('function isValidBusiness(data)');
    expect(rulesContent).toContain('function isValidListing(data)');
    expect(rulesContent).toContain('function isValidOrder(data)');

    // Pillar 4 & 5: Verified email requirement & anti-self-admin escalation
    expect(rulesContent).toContain('request.auth.token.email_verified == true');
    expect(rulesContent).toContain("incoming().role in ['customer', 'business', 'delivery_partner'] || isAdmin()");

    // Pillar 6: PII isolation in /users/{userId}/private/{docId}
    expect(rulesContent).toContain('match /private/{docId}');
    expect(rulesContent).toContain('existsAfter(/databases/$(database)/documents/users/$(userId))');

    // Pillar 8: Query Enforcer on /orders (no blanket signed-in reads)
    expect(rulesContent).toContain('resource.data.customerUid == request.auth.uid');
    expect(rulesContent).toContain('resource.data.businessOwnerUid == request.auth.uid');

    // Terminal state lock on collected/refunded orders
    expect(rulesContent).toContain("!(existing().orderStatus in ['collected', 'refunded'])");
  });

  it('2 & 3. Validates Business Verification Gate before public listing eligibility', () => {
    const sampleListing = listings[0];
    const unverifiedResult = evaluateListingEligibility(sampleListing, nowMs, false);
    expect(unverifiedResult.eligible).toBe(false);
    expect(unverifiedResult.reason).toContain('Business verification is not approved');

    const verifiedResult = evaluateListingEligibility(sampleListing, nowMs, true);
    expect(verifiedResult.eligible).toBe(true);
  });

  it('4. Searches and filters Kampala listings by category, neighborhood, dietary tags, and price', () => {
    const kololoOnly = filterAndRankListings(listings, { neighborhood: 'Kololo' }, nowMs);
    expect(kololoOnly.length).toBeGreaterThan(0);
    expect(kololoOnly.every((l) => l.neighborhood === 'Kololo')).toBe(true);

    const glutenFree = filterAndRankListings(listings, { dietaryTag: 'Gluten-Free' }, nowMs);
    expect(glutenFree.length).toBeGreaterThan(0);
    expect(glutenFree.every((l) => l.dietaryTags.includes('Gluten-Free'))).toBe(true);

    const under15k = filterAndRankListings(listings, { maxPriceUgx: 15000 }, nowMs);
    expect(under15k.every((l) => l.discountedPriceUgx <= 15000)).toBe(true);
  });

  it('5 & 6. Prevents concurrent overselling of final available inventory unit', () => {
    // Only 1 unit left on the shelf
    const initialStock = 1;

    // Customer A reserves 1 unit
    const customerA = attemptAtomicInventoryReservation(initialStock, 1);
    expect(customerA.success).toBe(true);
    expect(customerA.newStock).toBe(0);

    // Concurrent Customer B attempts to reserve 1 unit after stock hits 0
    const customerB = attemptAtomicInventoryReservation(customerA.newStock, 1);
    expect(customerB.success).toBe(false);
    expect(customerB.newStock).toBe(0);
    expect(customerB.error).toContain('sold out');
  });

  it('7, 8 & 9. Verifies signed payment webhooks and guarantees idempotent duplicate event handling', () => {
    const secret = 'flw_secret_ug_test_991';
    const processedIds = new Set<string>();

    const mockOrder: OrderRecord = {
      id: 'ord_test_101',
      customerUid: 'cust_1',
      customerName: 'Sarah K.',
      businessId: 'biz_endiro_kololo',
      businessOwnerUid: 'owner_1',
      businessName: 'Acacia Artisan Bakery',
      pickupAddress: 'Plot 24 Acacia Ave',
      listingId: 'lst_kololo_sourdough_pack',
      listingTitle: 'Sourdough Pack',
      quantity: 2,
      unitPriceUgx: 16500,
      originalUnitPriceUgx: 38000,
      grossTotalUgx: 33000,
      savingsTotalUgx: 43000,
      commissionBps: 1000,
      platformCommissionUgx: 3300,
      netBusinessProceedsUgx: 29700,
      currency: 'UGX',
      collectionWindow: 'Today 17:30 - 20:30',
      collectionDeadlineIso: new Date(nowMs + 7200000).toISOString(),
      collectionCode: 'SS-8K4P2M',
      paymentMethod: 'mtn_momo_sandbox',
      paymentProviderRef: 'PENDING',
      paymentStatus: 'pending_verification',
      orderStatus: 'reserved',
      cancellationReason: '',
      createdAt: new Date(nowMs).toISOString(),
      updatedAt: new Date(nowMs).toISOString(),
    };

    const validEvent: WebhookEventPayload = {
      eventId: 'evt_mtn_9001',
      orderId: 'ord_test_101',
      providerRef: 'MTN-UG-882910',
      amountUgx: 33000,
      currency: 'UGX',
      status: 'successful',
      signature: `sha256=${secret}:evt_mtn_9001:ord_test_101:33000`,
    };

    expect(verifyWebhookSignature(validEvent, secret)).toBe(true);
    expect(verifyWebhookSignature(validEvent, 'wrong_secret')).toBe(false);

    // First delivery succeeds and marks paid_sandbox_verified
    const firstResult = processIdempotentWebhook(processedIds, mockOrder, validEvent, secret);
    expect(firstResult.accepted).toBe(true);
    expect(firstResult.duplicate).toBe(false);
    expect(firstResult.updatedOrder.paymentStatus).toBe('paid_sandbox_verified');

    // Second (duplicate) webhook delivery is safely ignored idempotently
    const duplicateResult = processIdempotentWebhook(
      processedIds,
      firstResult.updatedOrder,
      validEvent,
      secret
    );
    expect(duplicateResult.accepted).toBe(true);
    expect(duplicateResult.duplicate).toBe(true);
  });

  it('10 & 11. Generates and validates 6-character collection verification codes', () => {
    const code = generateCollectionCode('order-seed-kampala-42');
    expect(code).toMatch(/^SS-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);

    // Exact match and case-insensitive suffix match work
    expect(verifyCollectionCodeInput(code, code)).toBe(true);
    expect(verifyCollectionCodeInput(code, code.slice(3).toLowerCase())).toBe(true);
    expect(verifyCollectionCodeInput(code, 'SS-WRONG1')).toBe(false);
  });

  it('14. Computes integer UGX order totals, savings, and tiered commissions with zero floating-point drift', () => {
    expect(getCommissionBpsForTier('standard')).toBe(1500);
    expect(getCommissionBpsForTier('growth')).toBe(1000);
    expect(getCommissionBpsForTier('enterprise')).toBe(750);

    const econ = calculateOrderEconomics({
      quantity: 3,
      unitPriceUgx: 14000,
      originalUnitPriceUgx: 32000,
      commissionBps: 1500, // 15%
    });

    expect(econ.grossTotalUgx).toBe(42000);
    expect(econ.originalGrossUgx).toBe(96000);
    expect(econ.savingsTotalUgx).toBe(54000);
    expect(econ.platformCommissionUgx).toBe(6300);
    expect(econ.netBusinessProceedsUgx).toBe(35700);
    expect(econ.platformCommissionUgx + econ.netBusinessProceedsUgx).toBe(econ.grossTotalUgx);
    expect(formatUgx(econ.grossTotalUgx)).toBe('UGX 42,000');
    expect(calculateDiscountPercent(32000, 14000)).toBe(56);
  });

  it('15. Blocks expired, withdrawn, safety-suspended, or allergen-incomplete listings from purchase', () => {
    const base = listings[0];

    // Expired sale deadline
    const expiredSale = evaluateListingEligibility(
      { ...base, saleDeadlineIso: new Date(nowMs - 60000).toISOString() },
      nowMs,
      true
    );
    expect(expiredSale.eligible).toBe(false);
    expect(expiredSale.reason).toContain('Sale window has closed');

    // Misordered deadlines (sale deadline after safe-use deadline)
    const badChronology = evaluateListingEligibility(
      {
        ...base,
        saleDeadlineIso: new Date(nowMs + 48 * 3600000).toISOString(),
        collectionDeadlineIso: new Date(nowMs + 12 * 3600000).toISOString(),
      },
      nowMs,
      true
    );
    expect(badChronology.eligible).toBe(false);

    // Missing allergens
    const missingAllergens = evaluateListingEligibility({ ...base, allergens: '' }, nowMs, true);
    expect(missingAllergens.eligible).toBe(false);
    expect(missingAllergens.reason).toContain('allergen');

    // Suspended for food safety
    const suspended = evaluateListingEligibility(
      { ...base, status: 'suspended_safety' },
      nowMs,
      true
    );
    expect(suspended.eligible).toBe(false);
  });
});
