import React, { useState } from 'react';
import {
  CheckCircle2,
  PlusCircle,
  KeyRound,
  Package,
  TrendingUp,
  Upload,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  BUSINESS_CATEGORIES,
  BusinessCategory,
  KAMPALA_NEIGHBORHOODS,
  ListingType,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../types/marketplace';
import { formatUgx } from '../lib/domainLogic';

export const BusinessPortalView: React.FC = () => {
  const {
    businesses,
    listings,
    orders,
    verifyAndCompleteCollection,
    markOrderReadyForPickup,
    issueOrderRefund,
    registerBusinessApplication,
    createOrPublishListing,
    updateListingStatusOrStock,
  } = useMarketplace();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    businesses[0]?.id || 'biz_endiro_kololo'
  );
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'create_listing' | 'register_business' | 'settlements'
  >('overview');

  // Collection code verification state
  const [verifyOrderId, setVerifyOrderId] = useState<string>('');
  const [staffCodeInput, setStaffCodeInput] = useState<string>('');
  const [verificationFeedback, setVerificationFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Create Listing state
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [listingType, setListingType] = useState<ListingType>('prepared');
  const [originalPriceUgx, setOriginalPriceUgx] = useState<number>(35000);
  const [discountedPriceUgx, setDiscountedPriceUgx] = useState<number>(15000);
  const [totalQuantity, setTotalQuantity] = useState<number>(6);
  const [ingredients, setIngredients] = useState<string>(
    'Fresh local Ugandan ingredients prepared today.'
  );
  const [allergens, setAllergens] = useState<string>('Wheat (Gluten), Dairy.');
  const [dietaryTags, setDietaryTags] = useState<string>('Halal,Vegetarian');
  const [storageInstructions, setStorageInstructions] = useState<string>(
    'Keep chilled below 5°C; reheat thoroughly to 75°C before consumption.'
  );
  const [collectionWindowLabel, setCollectionWindowLabel] = useState<string>(
    'Today · 18:00 – 21:00'
  );
  const [hoursUntilSaleClose, setHoursUntilSaleClose] = useState<number>(5);
  const [hoursUntilCollectionClose, setHoursUntilCollectionClose] = useState<number>(6);
  const [hoursUntilSafeUseClose, setHoursUntilSafeUseClose] = useState<number>(24);
  const [imageKey, setImageKey] = useState<string>('bakery_sourdough');
  const [customImageDataUrl, setCustomImageDataUrl] = useState<string>('');
  const [isSponsored, setIsSponsored] = useState<boolean>(false);
  const [publishImmediately, setPublishImmediately] = useState<boolean>(true);
  const [listingFeedback, setListingFeedback] = useState<string | null>(null);

  // Register Business state
  const [bizName, setBizName] = useState<string>('');
  const [bizCategory, setBizCategory] = useState<BusinessCategory>('Restaurants & Cafés');
  const [bizNeighborhood, setBizNeighborhood] = useState<string>('Kololo');
  const [bizAddress, setBizAddress] = useState<string>('');
  const [bizPhone, setBizPhone] = useState<string>('+256 772 ');
  const [bizHours, setBizHours] = useState<string>('07:30 – 21:30 Daily');
  const [bizKcca, setBizKcca] = useState<string>('KCCA-FD-2026-');
  const [bizTin, setBizTin] = useState<string>('101');
  const [bizTier, setBizTier] = useState<SubscriptionTier>('standard');
  const [bizSafetyAccepted, setBizSafetyAccepted] = useState<boolean>(true);
  const [bizRegFeedback, setBizRegFeedback] = useState<string | null>(null);

  const activeBusiness =
    businesses.find((b) => b.id === selectedBusinessId) || businesses[0];

  const businessListings = listings.filter((l) => l.businessId === activeBusiness?.id);
  const businessOrders = orders.filter((o) => o.businessId === activeBusiness?.id);

  // Documented Financial Metrics
  const activePublishedCount = businessListings.filter((l) => l.status === 'published').length;
  const totalUnitsAvailable = businessListings
    .filter((l) => l.status === 'published')
    .reduce((acc, l) => acc + l.remainingQuantity, 0);
  const totalUnitsListed = businessListings.reduce((acc, l) => acc + l.totalQuantity, 0);
  const totalUnitsSold = totalUnitsListed - totalUnitsAvailable;
  const sellThroughPct =
    totalUnitsListed > 0 ? Math.round((totalUnitsSold / totalUnitsListed) * 100) : 0;

  const billableOrders = businessOrders.filter(
    (o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded'
  );
  const completedCollectionsCount = businessOrders.filter(
    (o) => o.orderStatus === 'collected'
  ).length;
  const grossSalesUgx = billableOrders.reduce((acc, o) => acc + o.grossTotalUgx, 0);
  const platformCommissionUgx = billableOrders.reduce(
    (acc, o) => acc + o.platformCommissionUgx,
    0
  );
  const estimatedNetProceedsUgx = billableOrders.reduce(
    (acc, o) => acc + o.netBusinessProceedsUgx,
    0
  );

  // Client-side image compression for custom food photograph upload
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
          setCustomImageDataUrl(dataUrl);
        }
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyOrderId || !staffCodeInput.trim()) return;
    const res = await verifyAndCompleteCollection(verifyOrderId, staffCodeInput);
    setVerificationFeedback(res);
    if (res.ok) {
      setStaffCodeInput('');
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setListingFeedback(null);
    try {
      const created = await createOrPublishListing({
        businessId: activeBusiness.id,
        title,
        description,
        listingType,
        originalPriceUgx,
        discountedPriceUgx,
        totalQuantity,
        ingredients,
        allergens,
        dietaryTags,
        storageInstructions,
        collectionWindowLabel,
        hoursUntilSaleClose,
        hoursUntilCollectionClose,
        hoursUntilSafeUseClose,
        imageKey,
        customImageDataUrl,
        isSponsored,
        publishImmediately,
      });
      setListingFeedback(
        `Success: "${created.title}" saved with status "${created.status.toUpperCase()}".`
      );
      setTitle('');
      setDescription('');
      setActiveTab('overview');
    } catch (err: any) {
      setListingFeedback(`Error: ${err?.message || 'Failed to create listing.'}`);
    }
  };

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBizRegFeedback(null);
    try {
      const created = await registerBusinessApplication({
        name: bizName,
        category: bizCategory,
        neighborhood: bizNeighborhood,
        address: bizAddress,
        contactPhone: bizPhone,
        openingHours: bizHours,
        kccaPermitNumber: bizKcca,
        tinNumber: bizTin,
        foodSafetyAccepted: bizSafetyAccepted,
        subscriptionTier: bizTier,
      });
      setSelectedBusinessId(created.id);
      setBizRegFeedback(
        `Application submitted for ${created.name}. Status is PENDING administrator KCCA verification.`
      );
      setBizName('');
      setBizAddress('');
    } catch (err: any) {
      setBizRegFeedback(`Error: ${err?.message || 'Failed to submit business application.'}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Partner Selector & Verification Status Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E2DDD5]">
        <div>
          <div className="text-xs text-[#5A655D]">
            Business Partner Management Portal · KCCA Permit: {activeBusiness?.kccaPermitNumber}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#1C241E]">
            {activeBusiness?.name}
          </h1>
          <div className="mt-1 text-xs text-[#5A655D]">
            {activeBusiness?.address} · Verification Status:{' '}
            <strong
              className={
                activeBusiness?.verificationStatus === 'approved'
                  ? 'text-[#1B5E3A]'
                  : 'text-[#B45309]'
              }
            >
              {activeBusiness?.verificationStatus.toUpperCase()}
            </strong>{' '}
            · Plan: {SUBSCRIPTION_PLANS[activeBusiness?.subscriptionTier || 'standard'].name} (
            {((activeBusiness?.commissionBps || 1500) / 100).toFixed(1)}% Commission)
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="biz-switcher" className="text-xs font-semibold text-[#5A655D]">
            Active Storefront:
          </label>
          <select
            id="biz-switcher"
            value={activeBusiness?.id}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="rounded-lg border border-[#D5CFC4] bg-white px-3 py-2 text-xs font-semibold text-[#1C241E]"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.verificationStatus})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Warning banner if business is not yet approved */}
      {activeBusiness?.verificationStatus !== 'approved' && (
        <div className="mt-4 p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Verification Pending / Restricted:</strong> Only approved food businesses can publish offers publicly on SurplusSaver. You may prepare draft listings now, or switch to the <strong>Platform Admin</strong> role in the top bar to approve this business’s KCCA permit.
          </div>
        </div>
      )}

      {/* KPI Strip (Full-Width 4-Column Row) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Active Listings & Inventory</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {activePublishedCount} offers · {totalUnitsAvailable} units
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-[#1B5E3A]">
            Sell-through rate: {sellThroughPct}%
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Orders & Verified Handovers</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {businessOrders.length} orders · {completedCollectionsCount} collected
          </div>
          <div className="mt-1 text-xs text-[#5A655D]">
            6-char pickup code verified
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Gross Surplus Sales</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {formatUgx(grossSalesUgx)}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-[#5A655D]">
            Platform Fee ({((activeBusiness?.commissionBps || 1500) / 100).toFixed(1)}%):{' '}
            {formatUgx(platformCommissionUgx)}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Estimated Net Proceeds</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1B5E3A]">
            {formatUgx(estimatedNetProceedsUgx)}
          </div>
          <div className="mt-1 text-xs text-[#5A655D]">
            Formula: Gross − Commission
          </div>
        </div>
      </div>

      {/* Portal Navigation Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] rounded-lg w-fit">
        {[
          { id: 'overview', label: `Listings & Inventory (${businessListings.length})` },
          { id: 'orders', label: `Order Handover & Code Check (${businessOrders.length})` },
          { id: 'create_listing', label: '+ Create Surplus Offer' },
          { id: 'settlements', label: 'Settlements & Subscriptions' },
          { id: 'register_business', label: 'Onboard New Business' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-white text-[#1C241E] shadow-xs'
                : 'text-[#5A655D] hover:text-[#1C241E]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {listingFeedback && (
        <div className="mt-4 p-3.5 rounded-lg bg-[#F0F7F3] border border-[#1B5E3A] text-xs font-medium text-[#1B5E3A]">
          {listingFeedback}
        </div>
      )}

      {/* Tab 1: Listings & Inventory Management */}
      {activeTab === 'overview' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2DDD5] bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DDD5] bg-[#FAF8F5] text-[#5A655D]">
                <th className="py-3.5 px-4 font-semibold">Listing Title & Type</th>
                <th className="py-3.5 px-4 font-semibold">Pricing (UGX)</th>
                <th className="py-3.5 px-4 font-semibold">Remaining Stock</th>
                <th className="py-3.5 px-4 font-semibold">Collection Window</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Inventory & State Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD5]">
              {businessListings.map((lst) => (
                <tr key={lst.id}>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#1C241E]">{lst.title}</div>
                    <div className="text-[#5A655D]">
                      {lst.listingType} · Allergens: {lst.allergens}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    <div className="font-bold text-[#1B5E3A]">
                      {formatUgx(lst.discountedPriceUgx)}
                    </div>
                    <div className="line-through text-[#5A655D]">
                      {formatUgx(lst.originalPriceUgx)}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    <span className="font-bold text-[#1C241E]">
                      {lst.remainingQuantity} / {lst.totalQuantity}
                    </span>{' '}
                    units
                  </td>
                  <td className="py-3.5 px-4 text-[#5A655D]">{lst.collectionWindowLabel}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono-tabular font-semibold uppercase text-[#1C241E]">
                      {lst.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={lst.remainingQuantity <= 0}
                        onClick={() =>
                          updateListingStatusOrStock(lst.id, {
                            remainingQuantity: Math.max(0, lst.remainingQuantity - 1),
                          })
                        }
                        className="px-2 py-1 rounded border border-[#D5CFC4] text-[#1C241E] hover:bg-[#FAF8F5] font-mono-tabular whitespace-nowrap shrink-0"
                      >
                        −1 Stock
                      </button>
                      <button
                        type="button"
                        disabled={lst.remainingQuantity >= lst.totalQuantity}
                        onClick={() =>
                          updateListingStatusOrStock(lst.id, {
                            remainingQuantity: Math.min(lst.totalQuantity, lst.remainingQuantity + 1),
                          })
                        }
                        className="px-2 py-1 rounded border border-[#D5CFC4] text-[#1C241E] hover:bg-[#FAF8F5] font-mono-tabular whitespace-nowrap shrink-0"
                      >
                        +1 Stock
                      </button>
                      {lst.status === 'published' ? (
                        <button
                          type="button"
                          onClick={() => updateListingStatusOrStock(lst.id, { status: 'paused' })}
                          className="px-2.5 py-1 rounded bg-[#EFECE6] text-[#1C241E] font-medium whitespace-nowrap shrink-0"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={activeBusiness?.verificationStatus !== 'approved'}
                          onClick={() =>
                            updateListingStatusOrStock(lst.id, { status: 'published' })
                          }
                          className="px-2.5 py-1 rounded bg-[#1B5E3A] text-white font-medium disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                          Publish
                        </button>
                      )}
                      {lst.status !== 'withdrawn' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateListingStatusOrStock(lst.id, { status: 'withdrawn' })
                          }
                          className="px-2.5 py-1 rounded text-[#991B1B] hover:bg-[#FEF2F2] font-medium whitespace-nowrap shrink-0"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Order Handover & Collection Code Verification */}
      {activeTab === 'orders' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 p-6 rounded-xl bg-white border border-[#E2DDD5] h-fit">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1B5E3A]">
              <KeyRound className="w-4 h-4" />
              <span>Counter Handover Verification Terminal</span>
            </div>
            <h2 className="mt-1 text-xl font-display font-bold text-[#1C241E]">
              Verify Customer Collection Code
            </h2>
            <p className="mt-1 text-xs text-[#5A655D]">
              Select an incoming order and enter the customer&apos;s 6-character code (`SS-XXXXXX`) to confirm handover and release settlement proceeds.
            </p>

            <form onSubmit={handleVerifyPickup} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  1. Select Incoming Reservation
                </label>
                <select
                  required
                  value={verifyOrderId}
                  onChange={(e) => setVerifyOrderId(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  <option value="">Choose order to verify...</option>
                  {businessOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.customerName} — {o.quantity}x {o.listingTitle} ({o.orderStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  2. Enter Customer Pickup Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SS-8K4P2M"
                  value={staffCodeInput}
                  onChange={(e) => setStaffCodeInput(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2.5 font-mono-tabular text-base font-bold uppercase tracking-wider"
                />
              </div>

              {verificationFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs font-medium ${
                    verificationFeedback.ok
                      ? 'bg-[#F0F7F3] border-[#1B5E3A] text-[#1B5E3A]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  }`}
                >
                  {verificationFeedback.message}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] text-white font-semibold whitespace-nowrap shrink-0"
              >
                Verify Code & Complete Handover
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-base font-display font-bold text-[#1C241E]">
              Incoming & Recent Reservations ({businessOrders.length})
            </h3>
            {businessOrders.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-[#E2DDD5] text-center text-xs text-[#5A655D]">
                No orders received for {activeBusiness?.name} yet. Reserve an offer from the Discover view to test live handover!
              </div>
            ) : (
              businessOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-5 rounded-xl bg-white border border-[#E2DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="font-mono-tabular text-[#5A655D]">
                      Order {ord.id} · Expected Code:{' '}
                      <strong className="text-[#1B5E3A]">{ord.collectionCode}</strong>
                    </div>
                    <div className="mt-1 text-sm font-bold text-[#1C241E]">
                      {ord.customerName} · {ord.quantity}x {ord.listingTitle}
                    </div>
                    <div className="mt-1 text-[#5A655D]">
                      Gross: <span className="font-mono-tabular">{formatUgx(ord.grossTotalUgx)}</span> · Net Proceeds:{' '}
                      <span className="font-mono-tabular font-semibold text-[#1B5E3A]">
                        {formatUgx(ord.netBusinessProceedsUgx)}
                      </span>{' '}
                      · Status: <strong className="uppercase">{ord.orderStatus}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {ord.orderStatus === 'reserved' && (
                      <button
                        type="button"
                        onClick={() => markOrderReadyForPickup(ord.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#EFECE6] hover:bg-[#E2DDD5] text-[#1C241E] font-semibold whitespace-nowrap shrink-0"
                      >
                        Mark Ready
                      </button>
                    )}
                    {(ord.orderStatus === 'reserved' || ord.orderStatus === 'ready_for_pickup') && (
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyOrderId(ord.id);
                          setStaffCodeInput(ord.collectionCode);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#1B5E3A] text-white font-semibold whitespace-nowrap shrink-0"
                      >
                        Select & Fill Code
                      </button>
                    )}
                    {ord.orderStatus !== 'refunded' && ord.orderStatus !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          issueOrderRefund(ord.id, 'Business initiated customer refund')
                        }
                        className="px-2.5 py-1.5 rounded-lg text-[#991B1B] hover:bg-[#FEF2F2] font-medium whitespace-nowrap shrink-0"
                      >
                        Issue Refund
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Create New Surplus Offer */}
      {activeTab === 'create_listing' && (
        <div className="mt-6 max-w-3xl p-6 sm:p-8 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1B5E3A]">
            <PlusCircle className="w-4 h-4" />
            <span>New Surplus Listing · Mandatory Allergen & Deadline Controls</span>
          </div>
          <h2 className="mt-1 text-xl font-display font-bold text-[#1C241E]">
            Publish Surplus Food for {activeBusiness?.name}
          </h2>

          <form onSubmit={handleCreateListing} className="mt-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Offer Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Evening Bakery Sourdough & Pastry Bundle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Product Format</label>
                <select
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value as ListingType)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  <option value="prepared">Prepared Meal (Hot / Chilled)</option>
                  <option value="packaged">Packaged Bakery / Grocery Item</option>
                  <option value="surprise_bundle">Surprise Surplus Bundle</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#1C241E] mb-1">
                Accurate Description & Portion Size
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe exact contents, portion weight, and why it is surplus today..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] p-3"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Original Retail Price (UGX)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={500}
                  value={originalPriceUgx}
                  onChange={(e) => setOriginalPriceUgx(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Discounted Surplus Price (UGX)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  step={500}
                  value={discountedPriceUgx}
                  onChange={(e) => setDiscountedPriceUgx(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Available Quantity (Units)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={500}
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Ingredients List (Required)
                </label>
                <input
                  type="text"
                  required
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#9A3412] mb-1">
                  Declared Allergens (Mandatory Safety Field)
                </label>
                <input
                  type="text"
                  required
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Storage & Handling Instructions (Required)
                </label>
                <input
                  type="text"
                  required
                  value={storageInstructions}
                  onChange={(e) => setStorageInstructions(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Dietary Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={dietaryTags}
                  onChange={(e) => setDietaryTags(e.target.value)}
                  placeholder="Halal,Vegetarian,Gluten-Free"
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
            </div>

            {/* 3 Deadlines Configuration */}
            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E2DDD5] grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Collection Window Label
                </label>
                <input
                  type="text"
                  required
                  value={collectionWindowLabel}
                  onChange={(e) => setCollectionWindowLabel(e.target.value)}
                  className="w-full rounded border border-[#D5CFC4] bg-white px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Sale Cutoff (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={hoursUntilSaleClose}
                  onChange={(e) => setHoursUntilSaleClose(Number(e.target.value))}
                  className="w-full rounded border border-[#D5CFC4] bg-white px-2.5 py-1.5 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Collection Close (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={hoursUntilCollectionClose}
                  onChange={(e) => setHoursUntilCollectionClose(Number(e.target.value))}
                  className="w-full rounded border border-[#D5CFC4] bg-white px-2.5 py-1.5 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Safe-Use Limit (Hours)
                </label>
                <input
                  type="number"
                  min={2}
                  max={120}
                  value={hoursUntilSafeUseClose}
                  onChange={(e) => setHoursUntilSafeUseClose(Number(e.target.value))}
                  className="w-full rounded border border-[#D5CFC4] bg-white px-2.5 py-1.5 font-mono-tabular"
                />
              </div>
            </div>

            {/* Artwork or Custom Photo Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Category Visual Preset
                </label>
                <select
                  value={imageKey}
                  onChange={(e) => setImageKey(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  <option value="bakery_sourdough">Artisan Bakery & Sourdough</option>
                  <option value="kampala_luwombo">Kampala Restaurant / Luwombo Meal</option>
                  <option value="fresh_produce_box">Fresh Fruit & Vegetable Harvest Box</option>
                  <option value="cafe_pastry_box">Café Pastry & Samosa Assortment</option>
                  <option value="hotel_buffet_pack">Hotel & Catering Executive Platter</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Or Upload Food Photograph (Auto-Compressed)
                </label>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] hover:bg-[#EFECE6] cursor-pointer">
                  <Upload className="w-4 h-4 text-[#1B5E3A]" />
                  <span>{customImageDataUrl ? 'Custom Photo Attached ✓' : 'Choose Image File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="accent-[#1B5E3A]"
                />
                <span>Publish immediately (requires Approved business verification)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSponsored}
                  onChange={(e) => setIsSponsored(e.target.checked)}
                  className="accent-[#1B5E3A]"
                />
                <span>Enable Sponsored Placement (clearly labeled in marketplace)</span>
              </label>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] text-white font-semibold whitespace-nowrap shrink-0"
            >
              {publishImmediately ? 'Publish Surplus Offer' : 'Save as Draft'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Settlements & Subscription Tiers */}
      {activeTab === 'settlements' && (
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionTier[]).map((tierKey) => {
              const plan = SUBSCRIPTION_PLANS[tierKey];
              const isCurrent = activeBusiness?.subscriptionTier === tierKey;
              return (
                <div
                  key={tierKey}
                  className={`p-6 rounded-xl bg-white border flex flex-col justify-between ${
                    isCurrent ? 'border-[#1B5E3A]' : 'border-[#E2DDD5]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-[#1B5E3A]">
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <span className="font-mono-tabular font-semibold text-[#1B5E3A]">
                          Active Plan
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-2xl font-mono-tabular font-bold text-[#1C241E]">
                      {plan.monthlyFeeUgx === 0
                        ? 'UGX 0 / month'
                        : `${formatUgx(plan.monthlyFeeUgx)} / month`}
                    </div>
                    <div className="mt-1 text-xs font-mono-tabular text-[#5A655D]">
                      Transaction Commission: {(plan.defaultCommissionBps / 100).toFixed(1)}%
                    </div>
                    <ul className="mt-4 space-y-2 text-xs text-[#3A433C]">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#1B5E3A] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Onboard New Food Business */}
      {activeTab === 'register_business' && (
        <div className="mt-6 max-w-2xl p-6 sm:p-8 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1B5E3A]">
            <Building2 className="w-4 h-4" />
            <span>Kampala Food Business Onboarding & KCCA Verification</span>
          </div>
          <h2 className="mt-1 text-xl font-display font-bold text-[#1C241E]">
            Register a Participating Food Business
          </h2>

          <form onSubmit={handleRegisterBusiness} className="mt-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Makerere Green Café"
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Category</label>
                <select
                  value={bizCategory}
                  onChange={(e) => setBizCategory(e.target.value as BusinessCategory)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Kampala Neighborhood
                </label>
                <select
                  value={bizNeighborhood}
                  onChange={(e) => setBizNeighborhood(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  {KAMPALA_NEIGHBORHOODS.filter((n) => n !== 'All Kampala').map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Street Address / Plot Number
                </label>
                <input
                  type="text"
                  required
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="Plot 18 Wandegeya Road, Kampala"
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  KCCA Food Hygiene Permit No.
                </label>
                <input
                  type="text"
                  required
                  value={bizKcca}
                  onChange={(e) => setBizKcca(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  URA Tax Identification Number (TIN)
                </label>
                <input
                  type="text"
                  required
                  value={bizTin}
                  onChange={(e) => setBizTin(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Opening Hours</label>
                <input
                  type="text"
                  required
                  value={bizHours}
                  onChange={(e) => setBizHours(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">Subscription Plan</label>
                <select
                  value={bizTier}
                  onChange={(e) => setBizTier(e.target.value as SubscriptionTier)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  <option value="standard">Standard Partner (15% Comm.)</option>
                  <option value="growth">Growth Kitchen (10% Comm.)</option>
                  <option value="enterprise">Enterprise (7.5% Comm.)</option>
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={bizSafetyAccepted}
                onChange={(e) => setBizSafetyAccepted(e.target.checked)}
                className="mt-0.5 accent-[#1B5E3A]"
              />
              <span className="text-[#5A655D]">
                I certify that our establishment holds a valid KCCA hygiene certificate, adheres to cold/hot holding temperature rules, and discloses all allergens accurately.
              </span>
            </label>

            {bizRegFeedback && (
              <div className="p-3 rounded-lg bg-[#F0F7F3] border border-[#1B5E3A] text-[#1B5E3A] font-medium">
                {bizRegFeedback}
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] text-white font-semibold whitespace-nowrap shrink-0"
            >
              Submit Business Verification Application
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
