import React, { useState } from 'react';
import { X, ShieldCheck, Clock, MapPin, AlertTriangle, CheckCircle2, Heart } from 'lucide-react';
import { FoodListing, OrderRecord, PaymentMethodId } from '../types/marketplace';
import {
  calculateDiscountPercent,
  calculateOrderEconomics,
  evaluateListingEligibility,
  formatUgx,
} from '../lib/domainLogic';
import { FoodArtwork } from '../lib/foodArtwork';
import { useMarketplace } from '../context/MarketplaceContext';

interface ProductDetailModalProps {
  listing: FoodListing | null;
  onClose: () => void;
  onOrderConfirmed: (order: OrderRecord) => void;
  onReportIssue: (listing: FoodListing) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  listing,
  onClose,
  onOrderConfirmed,
  onReportIssue,
}) => {
  const {
    businesses,
    reserveOfferAtomically,
    savedBusinessIds,
    toggleSavedBusiness,
    lowBandwidthMode,
    defaultCommissionBps,
  } = useMarketplace();

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedWindow, setSelectedWindow] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('mtn_momo_sandbox');
  const [payerIdentifier, setPayerIdentifier] = useState<string>('+256 772 550 129');
  const [acceptedSafetyTerms, setAcceptedSafetyTerms] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  if (!listing) return null;

  const parentBusiness = businesses.find((b) => b.id === listing.businessId);
  const isBizApproved = parentBusiness ? parentBusiness.verificationStatus === 'approved' : true;
  const eligibility = evaluateListingEligibility(listing, Date.now(), isBizApproved);
  const discountPct = calculateDiscountPercent(listing.originalPriceUgx, listing.discountedPriceUgx);
  const isSaved = savedBusinessIds.includes(listing.businessId);

  const safeQty = Math.max(1, Math.min(quantity, Math.max(1, listing.remainingQuantity)));
  const activeWindow = selectedWindow || listing.collectionWindowLabel;

  const economics = calculateOrderEconomics({
    quantity: safeQty,
    unitPriceUgx: listing.discountedPriceUgx,
    originalUnitPriceUgx: listing.originalPriceUgx,
    commissionBps: parentBusiness?.commissionBps ?? defaultCommissionBps,
  });

  const windowOptions = [
    listing.collectionWindowLabel,
    'Today · Early Window (First 45 mins)',
    'Today · Final Pickup Slot (Before Closing)',
  ];

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!acceptedSafetyTerms) {
      setErrorMsg('Please confirm the collection deadline and food handling instructions.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await reserveOfferAtomically({
        listingId: listing.id,
        quantity: safeQty,
        collectionWindow: activeWindow,
        paymentMethod,
        momoPhoneOrCardLast4: payerIdentifier,
      });
      setConfirmedOrder(order);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not complete reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeIso = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-UG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-listing-title"
    >
      <div className="relative w-full max-w-4xl rounded-xl bg-[#FAF8F5] text-[#1C241E] border border-[#E2DDD5] shadow-xl overflow-hidden my-8">
        {/* Top Close Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2DDD5] bg-white">
          <div className="flex items-center gap-2 text-xs text-[#5A655D]">
            <span>{listing.businessCategory}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.neighborhood}, Kampala</span>
            {listing.isSeedData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-[#8A5A00]">Sample Pilot Offer</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleSavedBusiness(listing.businessId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1C241E] bg-[#F2EFE9] hover:bg-[#E5E0D6] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#D97706] text-[#D97706]' : ''}`} />
              <span>{isSaved ? 'Saved Business' : 'Save Business'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close product details"
              className="p-2 text-[#5A655D] hover:text-[#1C241E] rounded-lg hover:bg-[#F2EFE9] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {confirmedOrder ? (
          /* Post-Reservation Confirmation Screen */
          <div className="p-6 md:p-8 bg-white">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-3 text-[#1B5E3A] mb-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Reservation Confirmed · Sandbox Payment Verified
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#1C241E]">
                Ready for Collection at {confirmedOrder.businessName}
              </h2>
              <p className="mt-2 text-sm text-[#5A655D]">
                Present your verification code below to staff at{' '}
                <strong className="text-[#1C241E]">{confirmedOrder.pickupAddress}</strong> during{' '}
                <strong className="text-[#1C241E]">{confirmedOrder.collectionWindow}</strong>.
              </p>

              {/* Collection Pass Box */}
              <div className="mt-6 p-6 rounded-xl bg-[#FAF8F5] border border-[#D5CFC4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-[#5A655D]">Collection Verification Code</div>
                  <div className="mt-1 text-3xl font-mono-tabular font-bold tracking-wider text-[#1B5E3A]">
                    {confirmedOrder.collectionCode}
                  </div>
                  <div className="mt-2 text-xs text-[#5A655D]">
                    Order ID: <span className="font-mono-tabular">{confirmedOrder.id}</span> · Ref:{' '}
                    <span className="font-mono-tabular">{confirmedOrder.paymentProviderRef}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E2DDD5] w-full sm:w-auto">
                  <div className="text-xs text-[#5A655D]">Total Paid (Sandbox)</div>
                  <div className="text-xl font-mono-tabular font-bold text-[#1C241E]">
                    {formatUgx(confirmedOrder.grossTotalUgx)}
                  </div>
                  <div className="text-xs font-mono-tabular text-[#1B5E3A]">
                    You saved {formatUgx(confirmedOrder.savingsTotalUgx)}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onOrderConfirmed(confirmedOrder);
                    onClose();
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1B5E3A] hover:bg-[#14472B] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  View in My Orders & Pickup Pass
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Split Contiguous Purchase Module */
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Column: Media, Description, Allergens, & 3 Safety Deadlines */}
            <div className="lg:col-span-7 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-[#E2DDD5]">
              <div className="aspect-4/3 w-full rounded-lg overflow-hidden border border-[#E2DDD5] bg-[#F2EFE9]">
                <FoodArtwork
                  imageKey={listing.imageKey}
                  customImageDataUrl={listing.customImageDataUrl}
                  title={listing.title}
                  lowBandwidth={lowBandwidthMode}
                />
              </div>

              <div className="mt-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A655D]">
                  <span className="font-medium text-[#1B5E3A]">{listing.businessName}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {listing.listingType === 'surprise_bundle'
                      ? 'Surprise Surplus Bundle'
                      : listing.listingType === 'prepared'
                      ? 'Prepared Hot/Chilled Meal'
                      : 'Packaged Bakery / Grocery'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{listing.distanceKm.toFixed(1)} km away</span>
                </div>

                <h2
                  id="modal-listing-title"
                  className="mt-1.5 text-2xl font-display font-bold text-[#1C241E]"
                >
                  {listing.title}
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-[#3A433C]">{listing.description}</p>
              </div>

              {/* Mandatory Food Safety & Allergen Disclosures */}
              <div className="mt-6 pt-6 border-t border-[#E2DDD5] space-y-4">
                <h3 className="text-sm font-semibold text-[#1C241E] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1B5E3A]" />
                  <span>Food Safety, Ingredients & Allergen Disclosures</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-white border border-[#E2DDD5]">
                    <div className="font-semibold text-[#1C241E]">Declared Ingredients</div>
                    <p className="mt-1 text-[#5A655D] leading-relaxed">{listing.ingredients}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-white border border-[#E2DDD5]">
                    <div className="font-semibold text-[#9A3412]">Declared Allergens</div>
                    <p className="mt-1 text-[#5A655D] leading-relaxed">{listing.allergens}</p>
                    {listing.dietaryTags && (
                      <div className="mt-2 text-[#1B5E3A] font-medium">
                        Dietary: {listing.dietaryTags.split(',').join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-white border border-[#E2DDD5] text-xs">
                  <div className="font-semibold text-[#1C241E]">Storage & Handling Instructions</div>
                  <p className="mt-1 text-[#5A655D]">{listing.storageInstructions}</p>
                </div>

                {/* Strict 3-Deadline Separation required by Section 5.C */}
                <div className="p-4 rounded-lg bg-[#F2EFE9] border border-[#E2DDD5] text-xs space-y-2">
                  <div className="font-semibold text-[#1C241E] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1B5E3A]" />
                    <span>Verified Time Windows & Safety Deadlines</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <div className="text-[#5A655D]">1. Sale Cutoff</div>
                      <div className="font-mono-tabular font-semibold text-[#1C241E]">
                        {formatTimeIso(listing.saleDeadlineIso)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#5A655D]">2. Collection Deadline</div>
                      <div className="font-mono-tabular font-semibold text-[#1C241E]">
                        {formatTimeIso(listing.collectionDeadlineIso)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#5A655D]">3. Safe-Use Guideline</div>
                      <div className="font-mono-tabular font-semibold text-[#1C241E]">
                        {formatTimeIso(listing.safeUseDeadlineIso)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5A655D] pt-1">
                    Safety Notice: SurplusSaver never infers food safety solely from a calendar date. Participating businesses verify physical food quality at packing and handover.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5A655D] pt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {listing.pickupAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => onReportIssue(listing)}
                    className="text-[#9A3412] hover:underline font-medium whitespace-nowrap shrink-0"
                  >
                    Report Food Safety Concern
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Contiguous Purchase & Reservation Checkout */}
            <div className="lg:col-span-5 p-6 md:p-8 bg-white flex flex-col justify-between">
              <form onSubmit={handleConfirmReservation} className="space-y-5">
                <div>
                  <div className="text-xs text-[#5A655D]">Discounted Surplus Price</div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl font-mono-tabular font-bold text-[#1B5E3A]">
                      {formatUgx(listing.discountedPriceUgx)}
                    </span>
                    <span className="text-base font-mono-tabular line-through text-[#7A847D]">
                      {formatUgx(listing.originalPriceUgx)}
                    </span>
                    <span className="text-xs font-mono-tabular font-semibold text-[#B45309]">
                      Save {discountPct}%
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs font-mono-tabular text-[#5A655D]">
                    {listing.remainingQuantity > 0
                      ? `${listing.remainingQuantity} of ${listing.totalQuantity} units available for reservation`
                      : 'Sold out'}
                  </div>
                </div>

                {!eligibility.eligible && (
                  <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{eligibility.reason}</span>
                  </div>
                )}

                {/* Step 1: Quantity Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                    1. Select Quantity (Max {listing.remainingQuantity})
                  </label>
                  <div className="inline-flex items-center rounded-lg border border-[#D5CFC4] bg-[#FAF8F5]">
                    <button
                      type="button"
                      disabled={safeQty <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3.5 py-2 text-sm font-mono-tabular font-semibold text-[#1C241E] disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-sm font-mono-tabular font-semibold text-[#1C241E]">
                      {safeQty}
                    </span>
                    <button
                      type="button"
                      disabled={safeQty >= listing.remainingQuantity}
                      onClick={() => setQuantity((q) => Math.min(listing.remainingQuantity, q + 1))}
                      className="px-3.5 py-2 text-sm font-mono-tabular font-semibold text-[#1C241E] disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Step 2: Collection Window */}
                <div>
                  <label
                    htmlFor="collection-window-select"
                    className="block text-xs font-semibold text-[#1C241E] mb-1.5"
                  >
                    2. Choose Collection Window
                  </label>
                  <select
                    id="collection-window-select"
                    value={activeWindow}
                    onChange={(e) => setSelectedWindow(e.target.value)}
                    className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 text-sm text-[#1C241E] focus:outline-none focus:ring-2 focus:ring-[#1B5E3A]"
                  >
                    {windowOptions.map((win) => (
                      <option key={win} value={win}>
                        {win}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Payment Method (Clearly Labeled Sandbox Mode) */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                    3. Payment Method (Verified Sandbox Mode)
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'mtn_momo_sandbox' as PaymentMethodId,
                        label: 'MTN Mobile Money Uganda (Sandbox)',
                        sub: 'Instant server-verified test push · Zero customer fee',
                      },
                      {
                        id: 'airtel_money_sandbox' as PaymentMethodId,
                        label: 'Airtel Money Uganda (Sandbox)',
                        sub: 'Instant server-verified test push · Zero customer fee',
                      },
                      {
                        id: 'card_sandbox' as PaymentMethodId,
                        label: 'Visa / Mastercard (Flutterwave/Pesapal Sandbox)',
                        sub: 'Tokenized test checkout · No raw card numbers stored',
                      },
                      {
                        id: 'pay_on_collection_verified' as PaymentMethodId,
                        label: 'Reserve Hold · Pay at Collection Counter',
                        sub: '15-minute inventory hold · Verify code at shop',
                      },
                    ].map((pm) => (
                      <label
                        key={pm.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          paymentMethod === pm.id
                            ? 'border-[#1B5E3A] bg-[#F0F7F3]'
                            : 'border-[#E2DDD5] bg-[#FAF8F5]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === pm.id}
                          onChange={() => setPaymentMethod(pm.id)}
                          className="mt-1 accent-[#1B5E3A]"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-[#1C241E]">{pm.label}</div>
                          <div className="text-[#5A655D]">{pm.sub}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentMethod !== 'pay_on_collection_verified' && (
                  <div>
                    <label
                      htmlFor="sandbox-payer-input"
                      className="block text-xs font-medium text-[#5A655D] mb-1"
                    >
                      {paymentMethod === 'card_sandbox'
                        ? 'Sandbox Test Reference (No real card details collected)'
                        : 'Sandbox Mobile Money Number (Test simulation only)'}
                    </label>
                    <input
                      id="sandbox-payer-input"
                      type="text"
                      value={payerIdentifier}
                      onChange={(e) => setPayerIdentifier(e.target.value)}
                      className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 text-xs font-mono-tabular text-[#1C241E]"
                    />
                  </div>
                )}

                {/* Step 4: Price & Savings Review */}
                <div className="p-3.5 rounded-lg bg-[#FAF8F5] border border-[#E2DDD5] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5A655D]">
                    <span>Original Retail Value ({safeQty}x)</span>
                    <span className="font-mono-tabular line-through">
                      {formatUgx(economics.originalGrossUgx)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#1B5E3A] font-medium">
                    <span>Surplus Discount Savings</span>
                    <span className="font-mono-tabular">− {formatUgx(economics.savingsTotalUgx)}</span>
                  </div>
                  <div className="flex justify-between text-[#5A655D]">
                    <span>Customer Platform Fee</span>
                    <span className="font-mono-tabular">UGX 0</span>
                  </div>
                  <div className="pt-2 border-t border-[#E2DDD5] flex justify-between text-sm font-bold text-[#1C241E]">
                    <span>Total to Pay</span>
                    <span className="font-mono-tabular">{formatUgx(economics.grossTotalUgx)}</span>
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs text-[#5A655D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedSafetyTerms}
                    onChange={(e) => setAcceptedSafetyTerms(e.target.checked)}
                    className="mt-0.5 accent-[#1B5E3A]"
                  />
                  <span>
                    I have reviewed the declared allergens ({listing.allergens}) and agree to collect before{' '}
                    <strong className="text-[#1C241E]">{formatTimeIso(listing.collectionDeadlineIso)}</strong>. Free cancellation is available up to 45 minutes before collection closes.
                  </span>
                </label>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!eligibility.eligible || submitting}
                  className="w-full py-3 px-4 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {submitting
                    ? 'Verifying Stock & Reserving...'
                    : `Confirm Reservation · ${formatUgx(economics.grossTotalUgx)}`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
