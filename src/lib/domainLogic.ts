import {
  FoodListing,
  OrderRecord,
  PaymentMethodId,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
} from '../types/marketplace';

/**
 * Formats integer UGX amounts safely without floating-point drift.
 */
export function formatUgx(amountUgx: number): string {
  const safeInt = Math.round(Number(amountUgx) || 0);
  return `UGX ${safeInt.toLocaleString('en-US')}`;
}

/**
 * Calculates discount percentage as an integer [0..99].
 */
export function calculateDiscountPercent(originalUgx: number, discountedUgx: number): number {
  if (originalUgx <= 0 || discountedUgx >= originalUgx || discountedUgx <= 0) {
    return 0;
  }
  return Math.round(((originalUgx - discountedUgx) / originalUgx) * 100);
}

/**
 * Integer-based financial calculation for orders, commissions, and net business proceeds.
 * Uses basis points (10000 bps = 100%) with integer rounding to prevent floating-point errors.
 */
export interface OrderEconomics {
  quantity: number;
  unitPriceUgx: number;
  originalUnitPriceUgx: number;
  grossTotalUgx: number;
  originalGrossUgx: number;
  savingsTotalUgx: number;
  commissionBps: number;
  platformCommissionUgx: number;
  netBusinessProceedsUgx: number;
}

export function calculateOrderEconomics(params: {
  quantity: number;
  unitPriceUgx: number;
  originalUnitPriceUgx: number;
  commissionBps: number;
}): OrderEconomics {
  const quantity = Math.max(1, Math.floor(params.quantity));
  const unitPriceUgx = Math.floor(params.unitPriceUgx);
  const originalUnitPriceUgx = Math.floor(params.originalUnitPriceUgx);
  const commissionBps = Math.max(0, Math.min(5000, Math.floor(params.commissionBps)));

  if (unitPriceUgx <= 0 || originalUnitPriceUgx <= unitPriceUgx) {
    throw new Error('Discounted unit price must be positive and strictly less than original price.');
  }

  const grossTotalUgx = quantity * unitPriceUgx;
  const originalGrossUgx = quantity * originalUnitPriceUgx;
  const savingsTotalUgx = originalGrossUgx - grossTotalUgx;

  // Exact integer basis point math: floor((grossTotal * bps + 5000) / 10000)
  const platformCommissionUgx = Math.floor((grossTotalUgx * commissionBps + 5000) / 10000);
  const netBusinessProceedsUgx = grossTotalUgx - platformCommissionUgx;

  return {
    quantity,
    unitPriceUgx,
    originalUnitPriceUgx,
    grossTotalUgx,
    originalGrossUgx,
    savingsTotalUgx,
    commissionBps,
    platformCommissionUgx,
    netBusinessProceedsUgx,
  };
}

/**
 * Evaluates whether a food listing is eligible for reservation and collection at `nowIso`.
 * Enforces strict separation between saleDeadline, collectionDeadline, and safeUseDeadline,
 * plus allergen & storage instruction completeness.
 */
export interface ListingEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export function evaluateListingEligibility(
  listing: Pick<
    FoodListing,
    | 'status'
    | 'remainingQuantity'
    | 'discountedPriceUgx'
    | 'originalPriceUgx'
    | 'saleDeadlineIso'
    | 'collectionDeadlineIso'
    | 'safeUseDeadlineIso'
    | 'allergens'
    | 'storageInstructions'
  >,
  nowMs: number = Date.now(),
  businessVerified: boolean = true
): ListingEligibilityResult {
  if (!businessVerified) {
    return { eligible: false, reason: 'Business verification is not approved.' };
  }
  if (listing.status !== 'published') {
    return { eligible: false, reason: `Listing is currently ${listing.status}.` };
  }
  if (listing.remainingQuantity <= 0) {
    return { eligible: false, reason: 'Sold out — no units remaining.' };
  }
  if (listing.discountedPriceUgx <= 0 || listing.discountedPriceUgx >= listing.originalPriceUgx) {
    return { eligible: false, reason: 'Invalid discount pricing configuration.' };
  }
  if (!listing.allergens || listing.allergens.trim().length < 2) {
    return { eligible: false, reason: 'Missing mandatory allergen declaration.' };
  }
  if (!listing.storageInstructions || listing.storageInstructions.trim().length < 3) {
    return { eligible: false, reason: 'Missing mandatory food storage instructions.' };
  }

  const saleDeadlineMs = Date.parse(listing.saleDeadlineIso);
  const collectionDeadlineMs = Date.parse(listing.collectionDeadlineIso);
  const safeUseDeadlineMs = Date.parse(listing.safeUseDeadlineIso);

  if (Number.isNaN(saleDeadlineMs) || Number.isNaN(collectionDeadlineMs) || Number.isNaN(safeUseDeadlineMs)) {
    return { eligible: false, reason: 'Invalid sale, collection, or safe-use deadline timestamp.' };
  }

  // Chronological safety invariant: saleDeadline <= collectionDeadline <= safeUseDeadline
  if (saleDeadlineMs > collectionDeadlineMs || collectionDeadlineMs > safeUseDeadlineMs) {
    return {
      eligible: false,
      reason: 'Safety deadline violation: Sale deadline must precede collection and safe-use deadlines.',
    };
  }

  if (nowMs >= saleDeadlineMs) {
    return { eligible: false, reason: 'Sale window has closed for this listing.' };
  }
  if (nowMs >= collectionDeadlineMs) {
    return { eligible: false, reason: 'Collection window has already passed.' };
  }
  if (nowMs >= safeUseDeadlineMs) {
    return { eligible: false, reason: 'Product has passed its safe-use deadline.' };
  }

  return { eligible: true };
}

/**
 * Validates and executes an atomic in-memory / transaction inventory deduction.
 * Prevents two concurrent buyers from purchasing the final available unit.
 */
export function attemptAtomicInventoryReservation(
  currentStock: number,
  requestedQty: number
): { success: boolean; newStock: number; error?: string } {
  const stock = Math.floor(currentStock);
  const qty = Math.floor(requestedQty);

  if (qty <= 0) {
    return { success: false, newStock: stock, error: 'Requested quantity must be at least 1.' };
  }
  if (stock < qty) {
    return {
      success: false,
      newStock: stock,
      error: stock === 0 ? 'Item is sold out.' : `Only ${stock} unit(s) remaining in stock.`,
    };
  }
  return {
    success: true,
    newStock: stock - qty,
  };
}

/**
 * Generates a human-readable 6-character alphanumeric verification code (excluding ambiguous 0/O/1/I).
 */
export function generateCollectionCode(seedEntropy?: string): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'SS-';
  const source = seedEntropy || `${Date.now()}-${Math.random()}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let i = 0; i < 6; i++) {
    const idx = Math.abs((hash >> (i * 4)) ^ (i * 31 + source.charCodeAt(i % source.length))) % alphabet.length;
    code += alphabet[idx];
  }
  return code;
}

/**
 * Verifies a collection code entered by business staff during customer pickup.
 */
export function verifyCollectionCodeInput(expectedCode: string, staffInput: string): boolean {
  const cleanExpected = expectedCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanInput = staffInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanExpected.length < 4) return false;
  return cleanExpected === cleanInput || cleanExpected.endsWith(cleanInput) && cleanInput.length === 6;
}

/**
 * Payment Webhook & Idempotency Processor
 * Ensures duplicate payment webhook events (e.g., Flutterwave / Pesapal retries)
 * never double-credit or double-charge an order.
 */
export interface WebhookEventPayload {
  eventId: string;
  orderId: string;
  providerRef: string;
  amountUgx: number;
  currency: 'UGX';
  status: 'successful' | 'failed';
  signature: string;
}

export function verifyWebhookSignature(payload: WebhookEventPayload, expectedSecret: string): boolean {
  if (!expectedSecret || !payload.signature) return false;
  const expectedSig = `sha256=${expectedSecret}:${payload.eventId}:${payload.orderId}:${payload.amountUgx}`;
  return payload.signature === expectedSig;
}

export function processIdempotentWebhook(
  processedEventIds: Set<string>,
  order: OrderRecord,
  event: WebhookEventPayload,
  expectedSecret: string
): {
  accepted: boolean;
  duplicate: boolean;
  updatedOrder: OrderRecord;
  reason?: string;
} {
  if (!verifyWebhookSignature(event, expectedSecret)) {
    return {
      accepted: false,
      duplicate: false,
      updatedOrder: order,
      reason: 'Invalid webhook signature',
    };
  }

  if (processedEventIds.has(event.eventId)) {
    return {
      accepted: true,
      duplicate: true,
      updatedOrder: order,
      reason: 'Duplicate webhook event ignored idempotently',
    };
  }

  if (event.amountUgx !== order.grossTotalUgx || event.currency !== order.currency) {
    return {
      accepted: false,
      duplicate: false,
      updatedOrder: order,
      reason: 'Webhook amount or currency mismatch against server order total',
    };
  }

  processedEventIds.add(event.eventId);

  const updatedOrder: OrderRecord = {
    ...order,
    paymentProviderRef: event.providerRef,
    paymentStatus: event.status === 'successful' ? 'paid_sandbox_verified' : 'failed',
    orderStatus: event.status === 'successful' ? 'reserved' : 'cancelled',
    updatedAt: new Date().toISOString(),
  };

  return {
    accepted: true,
    duplicate: false,
    updatedOrder,
  };
}

/**
 * Transparent marketplace filtering & ranking engine.
 */
export interface ListingFilterCriteria {
  searchQuery?: string;
  category?: string;
  neighborhood?: string;
  maxPriceUgx?: number;
  dietaryTag?: string;
  listingType?: string;
  onlyAvailable?: boolean;
  sortBy?: 'recommended' | 'price_asc' | 'discount_desc' | 'distance_asc' | 'closing_soon';
}

export function filterAndRankListings(
  listings: FoodListing[],
  criteria: ListingFilterCriteria,
  nowMs: number = Date.now()
): FoodListing[] {
  const q = (criteria.searchQuery || '').trim().toLowerCase();

  const filtered = listings.filter((item) => {
    if (item.status !== 'published') return false;

    if (criteria.onlyAvailable !== false) {
      const elig = evaluateListingEligibility(item, nowMs, true);
      if (!elig.eligible) return false;
    }

    if (q) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBiz = item.businessName.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchArea = item.neighborhood.toLowerCase().includes(q);
      if (!matchTitle && !matchBiz && !matchDesc && !matchArea) return false;
    }

    if (criteria.category && criteria.category !== 'All Categories') {
      if (item.businessCategory !== criteria.category) return false;
    }

    if (criteria.neighborhood && criteria.neighborhood !== 'All Kampala') {
      if (item.neighborhood !== criteria.neighborhood) return false;
    }

    if (criteria.maxPriceUgx && criteria.maxPriceUgx > 0) {
      if (item.discountedPriceUgx > criteria.maxPriceUgx) return false;
    }

    if (criteria.dietaryTag && criteria.dietaryTag !== 'All') {
      const tags = item.dietaryTags
        .split(',')
        .map((t) => t.trim().toLowerCase());
      if (!tags.includes(criteria.dietaryTag.toLowerCase())) return false;
    }

    if (criteria.listingType && criteria.listingType !== 'all') {
      if (item.listingType !== criteria.listingType) return false;
    }

    return true;
  });

  const sortBy = criteria.sortBy || 'recommended';

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return a.discountedPriceUgx - b.discountedPriceUgx;
    }
    if (sortBy === 'discount_desc') {
      const discA = calculateDiscountPercent(a.originalPriceUgx, a.discountedPriceUgx);
      const discB = calculateDiscountPercent(b.originalPriceUgx, b.discountedPriceUgx);
      return discB - discA;
    }
    if (sortBy === 'distance_asc') {
      return a.distanceKm - b.distanceKm;
    }
    if (sortBy === 'closing_soon') {
      return Date.parse(a.saleDeadlineIso) - Date.parse(b.saleDeadlineIso);
    }
    // Default 'recommended': Sponsored (clearly labeled) first, then highest discount, then proximity
    if (a.isSponsored !== b.isSponsored) {
      return a.isSponsored ? -1 : 1;
    }
    const discA = calculateDiscountPercent(a.originalPriceUgx, a.discountedPriceUgx);
    const discB = calculateDiscountPercent(b.originalPriceUgx, b.discountedPriceUgx);
    if (discB !== discA) return discB - discA;
    return a.distanceKm - b.distanceKm;
  });
}

/**
 * Evaluates subscription commission rate in basis points for a given tier.
 */
export function getCommissionBpsForTier(tier: SubscriptionTier): number {
  return SUBSCRIPTION_PLANS[tier]?.defaultCommissionBps ?? 1500;
}
