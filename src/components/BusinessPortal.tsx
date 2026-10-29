import React, { useState } from 'react';
import {
  Store,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Package,
  TrendingUp,
  KeyRound,
  PauseCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import {
  BUSINESS_CATEGORIES,
  BundleType,
  BusinessCategory,
  BusinessProfile,
  COMMON_ALLERGENS,
  DIETARY_TAGS,
  FoodListing,
  KAMPALA_NEIGHBORHOODS,
  ListingStatus,
  OrderRecord,
  PlatformSettings,
  SubscriptionTier,
} from '../types/marketplace';
import {
  calculateOrderFinancials,
  formatUgx,
  verifyCollectionCode,
} from '../lib/domainLogic';

interface BusinessPortalProps {
  currentUserId: string;
  myBusiness: BusinessProfile | null;
  myListings: FoodListing[];
  businessOrders: OrderRecord[];
  platformSettings: PlatformSettings;
  onRegisterBusiness: (data: {
    name: string;
    category: BusinessCategory;
    neighborhood: string;
    address: string;
    phone: string;
    description: string;
    openingHours: string;
    verificationNumber: string;
    foodSafetyAccepted: boolean;
  }) => Promise<void>;
  onCreateListing: (data: {
    title: string;
    category: BusinessCategory;
    bundleType: BundleType;
    description: string;
    originalPriceUgx: number;
    discountedPriceUgx: number;
    quantityTotal: number;
    collectionWindowStart: string;
    collectionWindowEnd: string;
    saleDeadlineHours: number;
    safeUseDeadlineHours: number;
    ingredients: string;
    allergens: string[];
    dietaryTags: string[];
    storageInstructions: string;
    isSponsored: boolean;
    imageKey: string;
  }) => Promise<void>;
  onUpdateListingStatus: (
    listing: FoodListing,
    status: ListingStatus
  ) => Promise<void>;
  onUpdateOrderState: (
    order: OrderRecord,
    newStatus: 'ready_for_pickup' | 'collected' | 'cancelled',
    newPaymentStatus?: 'paid_verified' | 'refunded',
    reason?: string
  ) => Promise<void>;
  onUpdateSubscriptionTier: (
    business: BusinessProfile,
    tier: SubscriptionTier
  ) => Promise<void>;
}

export const BusinessPortal: React.FC<BusinessPortalProps> = ({
  myBusiness,
  myListings,
  businessOrders,
  platformSettings,
  onRegisterBusiness,
  onCreateListing,
  onUpdateListingStatus,
  onUpdateOrderState,
  onUpdateSubscriptionTier,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'listings' | 'orders' | 'subscription'
  >('overview');
  const [portalMessage, setPortalMessage] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Business Onboarding state
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState<BusinessCategory>(
    'Restaurants & Cafes'
  );
  const [bizNeighborhood, setBizNeighborhood] = useState('Kololo');
  const [bizAddress, setBizAddress] = useState('');
  const [bizPhone, setBizPhone] = useState('+256 772 ');
  const [bizDescription, setBizDescription] = useState('');
  const [bizHours, setBizHours] = useState('Mon–Sun: 07:30 – 21:00 EAT');
  const [bizLicense, setBizLicense] = useState('KCCA-FOOD-2026-');
  const [bizSafetyAccepted, setBizSafetyAccepted] = useState(false);

  // Listing Creation state
  const [title, setTitle] = useState('');
  const [bundleType, setBundleType] = useState<BundleType>('surprise_bundle');
  const [description, setDescription] = useState('');
  const [originalPriceUgx, setOriginalPriceUgx] = useState<number>(30000);
  const [discountedPriceUgx, setDiscountedPriceUgx] = useState<number>(14000);
  const [quantityTotal, setQuantityTotal] = useState<number>(6);
  const [windowStart, setWindowStart] = useState('18:00 EAT');
  const [windowEnd, setWindowEnd] = useState('20:30 EAT');
  const [saleDeadlineHours, setSaleDeadlineHours] = useState<number>(6);
  const [safeUseDeadlineHours, setSafeUseDeadlineHours] = useState<number>(24);
  const [ingredients, setIngredients] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [storageInstructions, setStorageInstructions] = useState(
    'Keep chilled below 4°C or consume within 3 hours of collection.'
  );
  const [isSponsored, setIsSponsored] = useState(false);
  const [imageKey, setImageKey] = useState('sourdough_pastry');

  // Collection code verification state
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});

  // Financial Metrics Calculations (Section 6)
  const completedOrders = businessOrders.filter(
    (o) => o.orderStatus === 'collected'
  );
  const grossSalesUgx = completedOrders.reduce(
    (sum, o) => sum + o.grossAmountUgx,
    0
  );
  const totalCommissionUgx = completedOrders.reduce(
    (sum, o) => sum + o.commissionAmountUgx,
    0
  );
  const netProceedsUgx = completedOrders.reduce(
    (sum, o) => sum + o.netSettlementUgx,
    0
  );
  const totalUnitsListed = myListings.reduce(
    (sum, l) => sum + l.quantityTotal,
    0
  );
  const totalUnitsAvailable = myListings.reduce(
    (sum, l) => sum + l.quantityAvailable,
    0
  );
  const sellThroughRate =
    totalUnitsListed > 0
      ? Math.round(
          ((totalUnitsListed - totalUnitsAvailable) / totalUnitsListed) * 100
        )
      : 0;

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError(null);
    if (!bizSafetyAccepted) {
      setPortalError(
        'You must accept the SurplusSaver Food Safety & Allergen Disclosure Terms.'
      );
      return;
    }
    try {
      await onRegisterBusiness({
        name: bizName,
        category: bizCategory,
        neighborhood: bizNeighborhood,
        address: bizAddress,
        phone: bizPhone,
        description: bizDescription,
        openingHours: bizHours,
        verificationNumber: bizLicense,
        foodSafetyAccepted: bizSafetyAccepted,
      });
      setPortalMessage(
        'Business registration submitted! Once approved by a Platform Administrator, you can publish live surplus food offers.'
      );
    } catch (err) {
      setPortalError(
        err instanceof Error ? err.message : 'Failed to register business.'
      );
    }
  };

  const handleListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalError(null);
    if (!myBusiness || myBusiness.status !== 'approved') {
      setPortalError(
        'Only approved businesses can publish surplus offers publicly.'
      );
      return;
    }
    if (discountedPriceUgx >= originalPriceUgx) {
      setPortalError('Discounted price must be lower than original price.');
      return;
    }
    if (saleDeadlineHours > safeUseDeadlineHours) {
      setPortalError('Sale deadline cannot exceed the safe-use deadline.');
      return;
    }
    try {
      await onCreateListing({
        title,
        category: myBusiness.category,
        bundleType,
        description,
        originalPriceUgx,
        discountedPriceUgx,
        quantityTotal,
        collectionWindowStart: windowStart,
        collectionWindowEnd: windowEnd,
        saleDeadlineHours,
        safeUseDeadlineHours,
        ingredients,
        allergens: selectedAllergens,
        dietaryTags: selectedDietary,
        storageInstructions,
        isSponsored,
        imageKey,
      });
      setTitle('');
      setDescription('');
      setIngredients('');
      setPortalMessage('Surplus food listing published to the Kampala marketplace.');
    } catch (err) {
      setPortalError(
        err instanceof Error ? err.message : 'Failed to create listing.'
      );
    }
  };

  const handleVerifyPickupCode = async (order: OrderRecord) => {
    setPortalError(null);
    const entered = codeInputs[order.id] || '';
    if (!verifyCollectionCode(order.collectionCode, entered)) {
      setPortalError(
        `Invalid collection code for ${order.orderNumber}. Ask customer for their 6-character SV-XXXXXX pass.`
      );
      return;
    }
    await onUpdateOrderState(order, 'collected', 'paid_verified');
    setPortalMessage(
      `Collection code verified! Order ${order.orderNumber} marked as Collected and settled.`
    );
  };

  if (!myBusiness) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs text-emerald-800 font-semibold">
              Kampala Food Partner Onboarding
            </p>
            <h1 className="text-2xl font-display font-bold text-zinc-900 mt-1">
              Register Your Food Business on SurplusSaver
            </h1>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              Recover revenue from unsold daily surplus while maintaining strict KCCA and UNBS food-safety compliance. All partner applications undergo verification before offers can be published.
            </p>
          </div>

          {portalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              {portalError}
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-zinc-800 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g., Kololo Sourdough Bakery"
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-800 mb-1">
                  Business Category
                </label>
                <select
                  value={bizCategory}
                  onChange={(e) =>
                    setBizCategory(e.target.value as BusinessCategory)
                  }
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-zinc-800 mb-1">
                  Kampala Neighborhood
                </label>
                <select
                  value={bizNeighborhood}
                  onChange={(e) => setBizNeighborhood(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                >
                  {KAMPALA_NEIGHBORHOODS.filter((n) => n !== 'All Kampala').map(
                    (n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-zinc-800 mb-1">
                  KCCA / URSB Verification Permit Number
                </label>
                <input
                  type="text"
                  required
                  value={bizLicense}
                  onChange={(e) => setBizLicense(e.target.value)}
                  placeholder="KCCA-FOOD-2026-XXXX"
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-800 mb-1">
                  Street Address & Pickup Landmark
                </label>
                <input
                  type="text"
                  required
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="Plot 22 Acacia Ave, next to..."
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-800 mb-1">
                  Business Contact Phone (Uganda)
                </label>
                <input
                  type="text"
                  required
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-800 mb-1">
                Opening Hours & Typical Collection Schedule
              </label>
              <input
                type="text"
                required
                value={bizHours}
                onChange={(e) => setBizHours(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-800 mb-1">
                Kitchen & Surplus Offer Description
              </label>
              <textarea
                rows={3}
                required
                value={bizDescription}
                onChange={(e) => setBizDescription(e.target.value)}
                placeholder="Describe the fresh food your business prepares daily..."
                className="w-full p-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3.5 bg-[#FAF8F5] border border-zinc-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={bizSafetyAccepted}
                onChange={(e) => setBizSafetyAccepted(e.target.checked)}
                className="mt-0.5 accent-[#14532D]"
              />
              <span className="text-zinc-700 leading-relaxed">
                <strong>Mandatory Food-Safety Undertaking:</strong> I certify that our business holds a valid KCCA hygiene permit, will never list expired or unsafe food, and will disclose all ingredients, allergens, cold-chain storage instructions, and safe-use deadlines on every listing.
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#14532D] hover:bg-[#166534] text-white font-semibold rounded-xl transition-colors"
            >
              Submit Business Verification Application
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Store className="w-3.5 h-3.5 text-[#14532D]" />
            <span>{myBusiness.category}</span>
            <span aria-hidden="true">·</span>
            <span>{myBusiness.neighborhood}</span>
            <span aria-hidden="true">·</span>
            <span>Permit: {myBusiness.verificationNumber}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold ${
                myBusiness.status === 'approved'
                  ? 'text-emerald-800'
                  : 'text-amber-800'
              }`}
            >
              Verification Status: {myBusiness.status.toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-zinc-900 mt-1">
            {myBusiness.name} — Merchant Portal
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-xl overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Revenue' },
            { id: 'listings', label: `Listings (${myListings.length})` },
            { id: 'orders', label: `Orders & Pickup Code (${businessOrders.length})` },
            { id: 'subscription', label: 'Plan & Commissions' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as 'overview' | 'listings' | 'orders' | 'subscription'
                )
              }
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {myBusiness.status !== 'approved' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
          <div>
            <strong>Verification Pending Approval:</strong> Your business profile is currently{' '}
            <span className="font-mono-num font-semibold">{myBusiness.status}</span>. Only approved businesses are permitted to publish offers publicly. An administrator can approve your application in the Admin Console.
          </div>
        </div>
      )}

      {portalMessage && (
        <div className="p-4 bg-emerald-950/5 border border-emerald-800/20 rounded-xl flex items-center justify-between text-xs text-emerald-950">
          <span>{portalMessage}</span>
          <button
            type="button"
            onClick={() => setPortalMessage(null)}
            className="font-semibold text-emerald-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {portalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-900">
          <span>{portalError}</span>
          <button
            type="button"
            onClick={() => setPortalError(null)}
            className="font-semibold text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & FINANCIAL SETTLEMENT METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Active Listings · Remaining Stock
              </span>
              <p className="text-2xl font-mono-num font-bold text-zinc-900 mt-1">
                {myListings.filter((l) => l.status === 'active').length} offers ·{' '}
                {totalUnitsAvailable} units
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Sell-through rate: {sellThroughRate}%
              </span>
            </div>
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Completed Collections
              </span>
              <p className="text-2xl font-mono-num font-bold text-zinc-900 mt-1">
                {completedOrders.length} of {businessOrders.length} orders
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Verified via 6-digit pickup code
              </span>
            </div>
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Gross Surplus Sales (Completed)
              </span>
              <p className="text-2xl font-mono-num font-bold text-zinc-900 mt-1">
                {formatUgx(grossSalesUgx)}
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Platform Fee ({(myBusiness.commissionRateBps / 100).toFixed(1)}%):{' '}
                {formatUgx(totalCommissionUgx)}
              </span>
            </div>
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Estimated Net Proceeds (UGX)
              </span>
              <p className="text-2xl font-mono-num font-bold text-[#14532D] mt-1">
                {formatUgx(netProceedsUgx)}
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Formula: Gross − Platform Commission
              </span>
            </div>
          </div>

          <div className="p-5 bg-white border border-zinc-200 rounded-2xl text-xs text-zinc-600 space-y-1.5">
            <p className="font-semibold text-zinc-900">
              Transparent Financial & Food-Surplus Reporting Methodology
            </p>
            <p>
              Net Settlement is calculated strictly in integer Ugandan Shillings (`netSettlementUgx = grossAmountUgx - floor(grossAmountUgx * commissionBps / 10000)`). We report exact surplus units sold and collected through the platform without making unverified carbon-emission claims.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: LISTING CREATION & INVENTORY MANAGEMENT */}
      {activeTab === 'listings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#14532D]" />
              Publish New Surplus Food Offer
            </h2>
            <form onSubmit={handleListingSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-800 mb-1">
                  Offer Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Evening Sourdough & 4 Butter Croissants"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Format / Bundle Type
                  </label>
                  <select
                    value={bundleType}
                    onChange={(e) =>
                      setBundleType(e.target.value as BundleType)
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  >
                    <option value="surprise_bundle">Surprise Food Bundle</option>
                    <option value="prepared">Prepared Meal</option>
                    <option value="packaged">Packaged Retail Food</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Visual Showcase Artwork
                  </label>
                  <select
                    value={imageKey}
                    onChange={(e) => setImageKey(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  >
                    <option value="sourdough_pastry">
                      Artisan Bakery & Croissants
                    </option>
                    <option value="luwombo_platter">
                      Luwombo & Matooke Platter
                    </option>
                    <option value="mango_avocado_crate">
                      Tropical Mango & Avocado Crate
                    </option>
                    <option value="rwenzori_coffee_samosa">
                      Samosas & Banana Bread
                    </option>
                    <option value="bugolobi_deli_basket">
                      Chilled Dairy & Supermarket Pack
                    </option>
                    <option value="muyenga_hotel_buffet">
                      Grilled Tilapia & Herb Potatoes
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Original (UGX)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    required
                    value={originalPriceUgx}
                    onChange={(e) =>
                      setOriginalPriceUgx(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Discounted (UGX)
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    required
                    value={discountedPriceUgx}
                    onChange={(e) =>
                      setDiscountedPriceUgx(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={quantityTotal}
                    onChange={(e) => setQuantityTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Collection Opens
                  </label>
                  <input
                    type="text"
                    required
                    value={windowStart}
                    onChange={(e) => setWindowStart(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Collection Closes
                  </label>
                  <input
                    type="text"
                    required
                    value={windowEnd}
                    onChange={(e) => setWindowEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Sale Cutoff (Hours from now)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={48}
                    required
                    value={saleDeadlineHours}
                    onChange={(e) =>
                      setSaleDeadlineHours(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Safe-Use Limit (Hours from now)
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={96}
                    required
                    value={safeUseDeadlineHours}
                    onChange={(e) =>
                      setSafeUseDeadlineHours(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-800 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is included in this offer and when was it prepared?"
                  className="w-full p-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-800 mb-1">
                  Full Ingredients Disclosure (Required)
                </label>
                <input
                  type="text"
                  required
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="e.g., Wheat flour, butter, eggs, milk, salt..."
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>

              <div>
                <span className="block font-medium text-zinc-800 mb-1">
                  Declared Allergens (Check all that apply)
                </span>
                <div className="flex flex-wrap gap-2">
                  {COMMON_ALLERGENS.map((alg) => (
                    <label
                      key={alg}
                      className="inline-flex items-center gap-1.5 text-[11px] text-zinc-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAllergens.includes(alg)}
                        onChange={(e) =>
                          setSelectedAllergens((prev) =>
                            e.target.checked
                              ? [...prev, alg]
                              : prev.filter((item) => item !== alg)
                          )
                        }
                        className="accent-[#14532D]"
                      />
                      {alg}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="block font-medium text-zinc-800 mb-1">
                  Verified Dietary Characteristics
                </span>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map((tag) => (
                    <label
                      key={tag}
                      className="inline-flex items-center gap-1.5 text-[11px] text-zinc-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDietary.includes(tag)}
                        onChange={(e) =>
                          setSelectedDietary((prev) =>
                            e.target.checked
                              ? [...prev, tag]
                              : prev.filter((item) => item !== tag)
                          )
                        }
                        className="accent-[#14532D]"
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-800 mb-1">
                  Storage & Handling Instructions (Required)
                </label>
                <input
                  type="text"
                  required
                  value={storageInstructions}
                  onChange={(e) => setStorageInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isSponsored}
                  onChange={(e) => setIsSponsored(e.target.checked)}
                  className="accent-[#14532D]"
                />
                <span>
                  Enable Sponsored Placement ({formatUgx(platformSettings.featuredPlacementDailyUgx)}/day · Clearly labeled “Sponsored”)
                </span>
              </label>

              <button
                type="submit"
                disabled={myBusiness.status !== 'approved'}
                className="w-full py-2.5 px-4 bg-[#14532D] hover:bg-[#166534] disabled:bg-zinc-300 text-white font-semibold rounded-xl transition-colors"
              >
                Publish Surplus Offer
              </button>
            </form>
          </div>

          {/* Right Column: Manage Active / Paused Listings */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              Your Published Surplus Offers ({myListings.length})
            </h2>
            {myListings.length === 0 ? (
              <div className="p-10 bg-white border border-zinc-200 rounded-2xl text-center text-xs text-zinc-500">
                <Package className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
                No listings created for your business yet. Use the form on the left to publish your first surplus offer.
              </div>
            ) : (
              myListings.map((lst) => (
                <div
                  key={lst.id}
                  className="p-5 bg-white border border-zinc-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-800">
                        Status: {lst.status.toUpperCase()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        {lst.quantityAvailable} / {lst.quantityTotal} available
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {lst.collectionWindowStart} – {lst.collectionWindowEnd}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {lst.title}
                    </h3>
                    <p className="text-xs font-mono-num text-[#14532D] font-semibold">
                      {formatUgx(lst.discountedPriceUgx)}{' '}
                      <span className="text-zinc-400 line-through font-normal">
                        {formatUgx(lst.originalPriceUgx)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {lst.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => onUpdateListingStatus(lst, 'paused')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-zinc-300 rounded-lg hover:bg-zinc-100"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        Pause
                      </button>
                    )}
                    {lst.status === 'paused' && (
                      <button
                        type="button"
                        onClick={() => onUpdateListingStatus(lst, 'active')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-emerald-700 text-emerald-800 rounded-lg hover:bg-emerald-50"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Resume
                      </button>
                    )}
                    {lst.status !== 'withdrawn' && (
                      <button
                        type="button"
                        onClick={() => onUpdateListingStatus(lst, 'withdrawn')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INCOMING ORDERS & COLLECTION CODE VERIFICATION */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          {businessOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-500">
              No incoming reservations for your listings yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {businessOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-mono-num font-semibold text-zinc-900">
                        {ord.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Customer: {ord.customerName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Window: {ord.collectionWindow}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-emerald-800">
                        Order: {ord.orderStatus}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {ord.listingTitle} (Qty: {ord.quantity})
                    </h3>
                    <p className="text-xs font-mono-num text-zinc-600">
                      Gross: {formatUgx(ord.grossAmountUgx)} · Platform Fee:{' '}
                      {formatUgx(ord.commissionAmountUgx)} · Net Settlement:{' '}
                      <strong className="text-[#14532D]">
                        {formatUgx(ord.netSettlementUgx)}
                      </strong>
                    </p>
                  </div>

                  {ord.orderStatus !== 'collected' &&
                    ord.orderStatus !== 'cancelled' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {ord.orderStatus === 'reserved' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateOrderState(ord, 'ready_for_pickup')
                            }
                            className="px-3 py-2 text-xs font-medium border border-zinc-300 rounded-lg hover:bg-zinc-100"
                          >
                            Mark Ready for Pickup
                          </button>
                        )}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Enter SV-XXXXXX"
                            value={codeInputs[ord.id] || ''}
                            onChange={(e) =>
                              setCodeInputs((prev) => ({
                                ...prev,
                                [ord.id]: e.target.value,
                              }))
                            }
                            className="w-36 px-2.5 py-1.5 text-xs font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyPickupCode(ord)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded-lg"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Verify & Hand Over
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateOrderState(
                              ord,
                              'cancelled',
                              'refunded',
                              'Merchant initiated refund'
                            )
                          }
                          className="px-2.5 py-1.5 text-xs text-red-700 hover:underline"
                        >
                          Refund & Cancel
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MONETIZATION MODELS & SUBSCRIPTIONS */}
      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-zinc-200 rounded-2xl space-y-3">
            <p className="text-xs text-zinc-500">Model 1 · Pay-As-You-Sell</p>
            <h3 className="text-lg font-display font-bold text-zinc-900">
              Standard Partner Plan
            </h3>
            <p className="text-2xl font-mono-num font-bold text-zinc-900">
              UGX 0 / month · {(myBusiness.commissionRateBps / 100).toFixed(1)}% Commission
            </p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              No monthly fixed fee. Platform commission is deducted only from completed, verified surplus collections.
            </p>
            <button
              type="button"
              disabled={myBusiness.subscriptionTier === 'standard'}
              onClick={() => onUpdateSubscriptionTier(myBusiness, 'standard')}
              className="px-4 py-2 text-xs font-semibold border border-zinc-300 rounded-lg disabled:opacity-50"
            >
              {myBusiness.subscriptionTier === 'standard'
                ? 'Current Active Plan'
                : 'Switch to Standard Plan'}
            </button>
          </div>

          <div className="p-6 bg-white border border-[#14532D] rounded-2xl space-y-3">
            <p className="text-xs text-emerald-800 font-semibold">
              Model 2 · Business Subscription
            </p>
            <h3 className="text-lg font-display font-bold text-zinc-900">
              Growth Plus Partner Plan
            </h3>
            <p className="text-2xl font-mono-num font-bold text-[#14532D]">
              {formatUgx(platformSettings.growthPlusMonthlyUgx)} / month
            </p>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Includes priority placement eligibility, multi-branch collection window scheduling, and repeat-customer retention reports.
            </p>
            <button
              type="button"
              disabled={myBusiness.subscriptionTier === 'growth_plus'}
              onClick={() =>
                onUpdateSubscriptionTier(myBusiness, 'growth_plus')
              }
              className="px-4 py-2 text-xs font-semibold bg-[#14532D] text-white rounded-lg disabled:opacity-50"
            >
              {myBusiness.subscriptionTier === 'growth_plus'
                ? 'Active Growth Plus Subscriber'
                : 'Upgrade to Growth Plus (Sandbox)'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
