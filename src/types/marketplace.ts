export type UserRole = 'customer' | 'business' | 'admin' | 'delivery_partner';

export type BusinessCategory =
  | 'Restaurants & Cafés'
  | 'Bakeries & Pastry'
  | 'Supermarkets & Grocery'
  | 'Hotels & Catering'
  | 'Fruit & Vegetable'
  | 'Approved Retailers';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type SubscriptionTier = 'standard' | 'growth' | 'enterprise';

export type ListingType = 'packaged' | 'prepared' | 'surprise_bundle';

export type ListingStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'withdrawn'
  | 'expired'
  | 'suspended_safety';

export type PaymentMethodId =
  | 'mtn_momo_sandbox'
  | 'airtel_money_sandbox'
  | 'card_sandbox'
  | 'bank_transfer_sandbox'
  | 'pay_on_collection_verified';

export const UGANDAN_PARTNER_BANKS = [
  'Stanbic Bank Uganda',
  'Centenary Bank',
  'dfcu Bank',
  'Equity Bank Uganda',
  'Absa Bank Uganda',
  'Standard Chartered Uganda',
] as const;

export type PaymentStatus =
  | 'pending_verification'
  | 'paid_sandbox_verified'
  | 'failed'
  | 'refunded';

export type OrderStatus =
  | 'reserved'
  | 'ready_for_pickup'
  | 'collected'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type ComplaintCategory =
  | 'food_safety_urgent'
  | 'allergen_mismatch'
  | 'collection_closed'
  | 'quality_issue'
  | 'billing_refund';

export type ComplaintSeverity = 'normal' | 'high' | 'critical_safety';

export type ComplaintStatus = 'open' | 'investigating' | 'resolved_refunded' | 'dismissed';

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  neighborhood: string;
  savedBusinessIds?: string;
  lowBandwidthMode: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifySafetyAlerts: boolean;
  policyAcceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phone: string;
  pdpoConsentVersion: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  ownerUid: string;
  name: string;
  category: BusinessCategory;
  neighborhood: string;
  address: string;
  contactPhone: string;
  openingHours: string;
  kccaPermitNumber: string;
  tinNumber: string;
  verificationStatus: VerificationStatus;
  foodSafetyAccepted: boolean;
  foodSafetyAcceptedAt: string;
  subscriptionTier: SubscriptionTier;
  commissionBps: number; // e.g. 1500 = 15.00%
  distanceKm: number;
  isSeedData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodListing {
  id: string;
  businessId: string;
  businessName: string;
  businessCategory: string;
  neighborhood: string;
  pickupAddress: string;
  ownerUid: string;
  title: string;
  description: string;
  listingType: ListingType;
  currency: 'UGX';
  originalPriceUgx: number;
  discountedPriceUgx: number;
  totalQuantity: number;
  remainingQuantity: number;
  ingredients: string;
  allergens: string;
  dietaryTags: string; // comma-separated e.g. "Halal,Vegetarian,Dairy-Free"
  storageInstructions: string;
  collectionWindowLabel: string;
  saleDeadlineIso: string;
  collectionDeadlineIso: string;
  safeUseDeadlineIso: string;
  status: ListingStatus;
  isSponsored: boolean;
  distanceKm: number;
  imageKey: string;
  customImageDataUrl: string;
  isSeedData: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRecord {
  id: string;
  customerUid: string;
  customerName: string;
  businessId: string;
  businessOwnerUid: string;
  businessName: string;
  pickupAddress: string;
  listingId: string;
  listingTitle: string;
  quantity: number;
  unitPriceUgx: number;
  originalUnitPriceUgx: number;
  grossTotalUgx: number;
  savingsTotalUgx: number;
  commissionBps: number;
  platformCommissionUgx: number;
  netBusinessProceedsUgx: number;
  currency: 'UGX';
  collectionWindow: string;
  collectionDeadlineIso: string;
  collectionCode: string;
  paymentMethod: PaymentMethodId;
  paymentProviderRef: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  cancellationReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyComplaint {
  id: string;
  reporterUid: string;
  orderId: string;
  listingId: string;
  businessId: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  description: string;
  status: ComplaintStatus;
  resolutionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedReview {
  id: string;
  orderId: string;
  businessId: string;
  customerUid: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorRole: string;
  actionType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  channel: 'in_app' | 'email_simulated' | 'sms_simulated';
  deliveryStatus: 'delivered_in_app' | 'provider_unconfigured';
  createdAt: string;
  read: boolean;
}

export const KAMPALA_NEIGHBORHOODS = [
  'All Kampala',
  'Kololo',
  'Nakasero',
  'Bugolobi',
  'Ntinda',
  'Muyenga',
  'Kabalagala',
  'Makerere & Wandegeya',
  'Acacia / Kamwokya',
] as const;

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  'Restaurants & Cafés',
  'Bakeries & Pastry',
  'Supermarkets & Grocery',
  'Hotels & Catering',
  'Fruit & Vegetable',
  'Approved Retailers',
];

export const DIETARY_FILTERS = [
  'Halal',
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
] as const;

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionTier,
  {
    name: string;
    monthlyFeeUgx: number;
    defaultCommissionBps: number;
    features: string[];
  }
> = {
  standard: {
    name: 'Standard Partner',
    monthlyFeeUgx: 0,
    defaultCommissionBps: 1500, // 15%
    features: [
      'Publish unlimited daily surplus listings',
      'Standard 15% commission on completed orders only',
      'QR / 6-digit collection code verification',
      'Weekly Mobile Money or bank settlement report',
    ],
  },
  growth: {
    name: 'Growth Kitchen',
    monthlyFeeUgx: 85000,
    defaultCommissionBps: 1000, // 10%
    features: [
      'Reduced 10% commission on completed orders',
      '1 Sponsored placement slot included weekly',
      'Sell-through & repeat-customer analytics',
      'Priority KCCA compliance & safety support',
    ],
  },
  enterprise: {
    name: 'Multi-Branch Enterprise',
    monthlyFeeUgx: 240000,
    defaultCommissionBps: 750, // 7.5%
    features: [
      'Lowest 7.5% commission rate across branches',
      'Multi-location Kampala & Entebbe management',
      'Custom CSV financial & settlement reconciliation',
      'Dedicated account manager & API webhook sync',
    ],
  },
};
