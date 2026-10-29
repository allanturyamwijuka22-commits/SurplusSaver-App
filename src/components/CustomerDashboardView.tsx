import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  Heart,
  Star,
  Bell,
  Wifi,
  ShieldAlert,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { formatUgx } from '../lib/domainLogic';
import { ComplaintCategory, ComplaintSeverity, FoodListing } from '../types/marketplace';

interface CustomerDashboardViewProps {
  onSelectListing: (listing: FoodListing) => void;
}

export const CustomerDashboardView: React.FC<CustomerDashboardViewProps> = ({
  onSelectListing,
}) => {
  const {
    firebaseUser,
    userProfile,
    orders,
    businesses,
    listings,
    savedBusinessIds,
    toggleSavedBusiness,
    cancelCustomerOrder,
    submitSafetyComplaint,
    submitVerifiedReview,
    notifications,
    markAllNotificationsRead,
    lowBandwidthMode,
    toggleLowBandwidthMode,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<
    'reservations' | 'saved' | 'support' | 'notifications' | 'settings'
  >('reservations');

  const [reviewOrderId, setReviewOrderId] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewStatusMsg, setReviewStatusMsg] = useState<string | null>(null);

  const [complaintOrderId, setComplaintOrderId] = useState<string>('');
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>('food_safety_urgent');
  const [complaintSeverity, setComplaintSeverity] = useState<ComplaintSeverity>('high');
  const [complaintDesc, setComplaintDesc] = useState<string>('');
  const [complaintSubmittedMsg, setComplaintSubmittedMsg] = useState<string | null>(null);

  const activeOrders = orders.filter(
    (o) => o.orderStatus === 'reserved' || o.orderStatus === 'ready_for_pickup'
  );
  const historicalOrders = orders.filter(
    (o) => o.orderStatus !== 'reserved' && o.orderStatus !== 'ready_for_pickup'
  );

  const savedBusinessesList = businesses.filter((b) => savedBusinessIds.includes(b.id));

  const totalCustomerSavingsUgx = orders
    .filter((o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded')
    .reduce((acc, o) => acc + o.savingsTotalUgx, 0);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderId || !reviewComment.trim()) return;
    try {
      await submitVerifiedReview({
        orderId: reviewOrderId,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewStatusMsg('Verified post-collection review published!');
      setReviewOrderId('');
      setReviewComment('');
    } catch (err: any) {
      setReviewStatusMsg(err?.message || 'Could not submit review.');
    }
  };

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDesc.trim()) return;
    const matchedOrder = orders.find((o) => o.id === complaintOrderId);
    await submitSafetyComplaint({
      orderId: complaintOrderId || 'general',
      listingId: matchedOrder?.listingId || '',
      businessId: matchedOrder?.businessId || '',
      category: complaintCategory,
      severity: complaintSeverity,
      description: complaintDesc,
    });
    setComplaintDesc('');
    setComplaintSubmittedMsg(
      complaintSeverity === 'critical_safety'
        ? 'Urgent safety alert logged. Any linked active listing has been automatically suspended pending KCCA / Admin inspection.'
        : 'Support ticket logged. Our Kampala operations team will respond shortly.'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2DDD5]">
        <div>
          <div className="text-xs text-[#5A655D]">
            Customer Account · {userProfile?.neighborhood || 'Kololo, Kampala'}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#1C241E]">
            {userProfile?.displayName || firebaseUser?.displayName || 'Kampala Customer Portal'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <div className="text-xs text-[#5A655D]">Active Pickup Passes</div>
            <div className="text-lg font-mono-tabular font-bold text-[#1B5E3A]">
              {activeOrders.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#5A655D]">Verified Savings to Date</div>
            <div className="text-lg font-mono-tabular font-bold text-[#1C241E]">
              {formatUgx(totalCustomerSavingsUgx)}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] rounded-lg w-fit">
        {[
          { id: 'reservations', label: `Orders & Pickup Passes (${orders.length})` },
          { id: 'saved', label: `Saved Businesses (${savedBusinessesList.length})` },
          { id: 'support', label: 'Safety & Support' },
          { id: 'notifications', label: `Notifications (${notifications.filter((n) => !n.read).length})` },
          { id: 'settings', label: 'Preferences & Privacy' },
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

      {/* Tab 1: Reservations & Order History */}
      {activeTab === 'reservations' && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-display font-bold text-[#1C241E]">
              Active Reservations & Collection Codes
            </h2>
            <p className="text-xs text-[#5A655D] mt-0.5">
              Show your 6-character code to business staff during the collection window.
            </p>

            {activeOrders.length === 0 ? (
              <div className="mt-4 p-8 rounded-xl bg-white border border-[#E2DDD5] text-center">
                <p className="text-sm text-[#5A655D]">
                  You have no active reservations awaiting pickup right now.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-6 rounded-xl bg-white border border-[#E2DDD5] flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#5A655D]">
                        <span className="font-semibold text-[#1B5E3A]">
                          {ord.orderStatus === 'ready_for_pickup'
                            ? 'Packed & Ready for Pickup'
                            : 'Reserved · Inventory Held'}
                        </span>
                        <span className="font-mono-tabular">{ord.paymentStatus}</span>
                      </div>

                      <h3 className="mt-1.5 text-lg font-bold text-[#1C241E]">
                        {ord.quantity}x {ord.listingTitle}
                      </h3>
                      <div className="mt-1 text-xs text-[#5A655D] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {ord.businessName} · {ord.pickupAddress}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#5A655D] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Window: {ord.collectionWindow}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#D5CFC4] flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-[#5A655D]">Collection Verification Code</div>
                        <div className="text-2xl font-mono-tabular font-bold text-[#1B5E3A] tracking-wider">
                          {ord.collectionCode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-[#5A655D]">Amount</div>
                        <div className="text-base font-mono-tabular font-bold text-[#1C241E]">
                          {formatUgx(ord.grossTotalUgx)}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#1B5E3A]">
                          Saved {formatUgx(ord.savingsTotalUgx)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E2DDD5]">
                      <span className="text-xs font-mono-tabular text-[#5A655D]">
                        Ref: {ord.paymentProviderRef}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          cancelCustomerOrder(ord.id, 'Customer cancelled before collection deadline')
                        }
                        className="px-3 py-1.5 text-xs font-medium text-[#991B1B] hover:bg-[#FEF2F2] rounded-lg transition-colors whitespace-nowrap shrink-0"
                      >
                        Cancel Reservation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past & Completed Orders + Verified Review Form */}
          <section className="pt-6 border-t border-[#E2DDD5]">
            <h2 className="text-lg font-display font-bold text-[#1C241E]">
              Completed, Cancelled & Refunded Orders
            </h2>

            {historicalOrders.length === 0 ? (
              <p className="mt-3 text-xs text-[#5A655D]">
                Completed pickups and receipts will appear here once staff verify your collection code.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-[#E2DDD5] bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2DDD5] bg-[#FAF8F5] text-[#5A655D]">
                      <th className="py-3 px-4 font-semibold">Order / Code</th>
                      <th className="py-3 px-4 font-semibold">Item & Business</th>
                      <th className="py-3 px-4 font-semibold">Total Paid</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD5]">
                    {historicalOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-3 px-4 font-mono-tabular">
                          <div className="font-bold text-[#1C241E]">{ord.collectionCode}</div>
                          <div className="text-[#5A655D]">{ord.paymentProviderRef}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1C241E]">
                            {ord.quantity}x {ord.listingTitle}
                          </div>
                          <div className="text-[#5A655D]">{ord.businessName}</div>
                        </td>
                        <td className="py-3 px-4 font-mono-tabular font-semibold text-[#1C241E]">
                          {formatUgx(ord.grossTotalUgx)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-[#1C241E]">
                            {ord.orderStatus} · {ord.paymentStatus}
                          </span>
                          {ord.cancellationReason && (
                            <div className="text-[#5A655D]">{ord.cancellationReason}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {ord.orderStatus === 'collected' && (
                            <button
                              type="button"
                              onClick={() => setReviewOrderId(ord.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1B5E3A] bg-[#F0F7F3] rounded-md hover:bg-[#E1F0E7] whitespace-nowrap shrink-0"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span>Write Verified Review</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reviewOrderId && (
              <form
                onSubmit={handleReviewSubmit}
                className="mt-6 p-5 rounded-xl bg-white border border-[#1B5E3A] max-w-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1C241E]">
                    Submit Verified Post-Collection Review (Order {reviewOrderId})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setReviewOrderId('')}
                    className="text-xs text-[#5A655D]"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                    Rating (1 to 5 Stars)
                  </label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="rounded-lg border border-[#D5CFC4] px-3 py-1.5 text-xs font-mono-tabular"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                    Your Experience (Food freshness, portion accuracy & pickup speed)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your honest feedback from this pickup..."
                    className="w-full rounded-lg border border-[#D5CFC4] p-2.5 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1B5E3A] rounded-lg whitespace-nowrap shrink-0"
                >
                  Publish Verified Review
                </button>
              </form>
            )}
            {reviewStatusMsg && (
              <p className="mt-3 text-xs font-medium text-[#1B5E3A]">{reviewStatusMsg}</p>
            )}
          </section>
        </div>
      )}

      {/* Tab 2: Saved Businesses */}
      {activeTab === 'saved' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedBusinessesList.map((biz) => {
            const activeBizListings = listings.filter(
              (l) => l.businessId === biz.id && l.status === 'published' && l.remainingQuantity > 0
            );
            return (
              <div
                key={biz.id}
                className="p-6 rounded-xl bg-white border border-[#E2DDD5] flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="text-xs text-[#5A655D]">
                    {biz.category} · {biz.neighborhood}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-[#1C241E]">{biz.name}</h3>
                  <p className="mt-1 text-xs text-[#5A655D]">{biz.address}</p>
                  <p className="mt-1 text-xs font-mono-tabular text-[#5A655D]">
                    Hours: {biz.openingHours} · Permit: {biz.kccaPermitNumber}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E2DDD5] flex items-center justify-between">
                  <span className="text-xs font-medium text-[#1B5E3A]">
                    {activeBizListings.length} active surplus offer(s)
                  </span>
                  <div className="flex items-center gap-2">
                    {activeBizListings[0] && (
                      <button
                        type="button"
                        onClick={() => onSelectListing(activeBizListings[0])}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#1B5E3A] rounded-lg whitespace-nowrap shrink-0"
                      >
                        View Offer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleSavedBusiness(biz.id)}
                      className="p-1.5 text-[#D97706] hover:bg-[#FAF8F5] rounded-lg"
                      title="Remove from saved"
                    >
                      <Heart className="w-4 h-4 fill-[#D97706]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Safety & Support */}
      {activeTab === 'support' && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 p-6 rounded-xl bg-white border border-[#E2DDD5]">
            <div className="flex items-center gap-2 text-[#9A3412] text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>Food Safety & Order Dispute Escalation</span>
            </div>
            <h2 className="mt-1 text-xl font-display font-bold text-[#1C241E]">
              Report a Problem or Urgent Food Safety Issue
            </h2>
            <p className="mt-1 text-xs text-[#5A655D]">
              Critical safety reports (undeclared allergens, improper temperature, or spoiled items) automatically place an immediate safety suspension on the listing pending administrator inspection.
            </p>

            <form onSubmit={handleComplaintSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Related Order (Optional)
                </label>
                <select
                  value={complaintOrderId}
                  onChange={(e) => setComplaintOrderId(e.target.value)}
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                >
                  <option value="">General Marketplace / Listing Inquiry</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.collectionCode} — {o.listingTitle} ({o.businessName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1C241E] mb-1">Issue Category</label>
                  <select
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value as ComplaintCategory)}
                    className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                  >
                    <option value="food_safety_urgent">Food Safety / Hygiene Issue</option>
                    <option value="allergen_mismatch">Undeclared Allergen / Ingredient</option>
                    <option value="collection_closed">Store Closed During Collection Window</option>
                    <option value="quality_issue">Portion or Quality Discrepancy</option>
                    <option value="billing_refund">Payment or Refund Request</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#1C241E] mb-1">Urgency / Severity</label>
                  <select
                    value={complaintSeverity}
                    onChange={(e) => setComplaintSeverity(e.target.value as ComplaintSeverity)}
                    className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2"
                  >
                    <option value="normal">Normal Support Request</option>
                    <option value="high">High Priority (Refund Requested)</option>
                    <option value="critical_safety">
                      Critical Food Safety Hazard (Suspend Listing)
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1C241E] mb-1">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  placeholder="Describe what happened, including collection time and specific food items..."
                  className="w-full rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] p-3"
                />
              </div>

              {complaintSubmittedMsg && (
                <div className="p-3 rounded-lg bg-[#F0F7F3] border border-[#1B5E3A] text-[#1B5E3A] font-medium">
                  {complaintSubmittedMsg}
                </div>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#1B5E3A] hover:bg-[#14472B] text-white font-semibold whitespace-nowrap shrink-0"
              >
                Submit Official Report
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 p-6 rounded-xl bg-[#EFECE6] border border-[#E2DDD5] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[#1C241E]">
              Cancellation, Refund & Kampala Food Safety Charter
            </h3>
            <p className="text-[#5A655D] leading-relaxed">
              1. <strong>Customer Cancellation</strong>: Reservations may be cancelled free of charge up to 45 minutes before the stated collection deadline. Inventory is automatically returned to the listing.
            </p>
            <p className="text-[#5A655D] leading-relaxed">
              2. <strong>Store Closure or Sold-Out Guarantee</strong>: If a participating business is closed during its published collection window or cannot fulfill a verified reservation, a 100% refund is issued.
            </p>
            <p className="text-[#5A655D] leading-relaxed">
              3. <strong>Food Safety Zero-Tolerance</strong>: Every business partner must hold a valid KCCA Food Hygiene Permit and disclose allergens and storage temperatures.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Notifications */}
      {activeTab === 'notifications' && (
        <div className="mt-8 bg-white rounded-xl border border-[#E2DDD5] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2DDD5]">
            <div>
              <h2 className="text-lg font-display font-bold text-[#1C241E]">
                Event Notification Center & Delivery Log
              </h2>
              <p className="text-xs text-[#5A655D]">
                In-app alerts are live. External SMTP Email and Africa&apos;s Talking Uganda SMS gateways display explicit setup status until production API keys are added in `.env`.
              </p>
            </div>
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-3 py-1.5 text-xs font-semibold text-[#1B5E3A] bg-[#F0F7F3] rounded-lg whitespace-nowrap shrink-0"
            >
              Mark All Read
            </button>
          </div>
          <div className="divide-y divide-[#E2DDD5] mt-2">
            {notifications.map((n) => (
              <div key={n.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <Bell className="w-4 h-4 text-[#1B5E3A] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#1C241E]">{n.title}</div>
                    <p className="text-[#5A655D] mt-0.5">{n.body}</p>
                  </div>
                </div>
                <div className="text-right font-mono-tabular text-[11px] text-[#5A655D] shrink-0">
                  <div>{n.deliveryStatus === 'delivered_in_app' ? 'Delivered (In-App)' : 'Gateway Unconfigured'}</div>
                  <div>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Preferences & PDPO Uganda Privacy */}
      {activeTab === 'settings' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-white border border-[#E2DDD5] space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1C241E]">
              <Wifi className="w-4 h-4 text-[#1B5E3A]" />
              <span>Low-Bandwidth Mode (3G / Modest Smartphones)</span>
            </div>
            <p className="text-xs text-[#5A655D] leading-relaxed">
              Replaces product photographs with ultra-lightweight typographic cards to minimize mobile data usage across Kampala networks.
            </p>
            <button
              type="button"
              onClick={toggleLowBandwidthMode}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1B5E3A] text-white whitespace-nowrap shrink-0"
            >
              {lowBandwidthMode ? 'Disable Low-Bandwidth Mode' : 'Enable Low-Bandwidth Mode'}
            </button>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#E2DDD5] space-y-3 text-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1C241E]">
              <CheckCircle2 className="w-4 h-4 text-[#1B5E3A]" />
              <span>Uganda PDPO Data Protection & PII Isolation</span>
            </div>
            <p className="text-[#5A655D] leading-relaxed">
              In compliance with the Uganda Data Protection and Privacy Act (PDPO framework), your email address and phone number are stored in a strictly isolated sub-collection (`/users/&#123;uid&#125;/private/info`) inaccessible to other customers or competing businesses.
            </p>
            <div className="font-mono-tabular text-[#1C241E]">
              Consent Version: UG-PDPO-2026.1 · DPO Contact: privacy@surplussaver.ug
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
