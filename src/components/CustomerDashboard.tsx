import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  FileText,
  Heart,
  Star,
  Bell,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  BusinessProfile,
  ComplaintCategory,
  KAMPALA_NEIGHBORHOODS,
  OrderRecord,
  SafetyComplaint,
  UserProfile,
} from '../types/marketplace';
import { formatUgx } from '../lib/domainLogic';

interface CustomerDashboardProps {
  userProfile: UserProfile;
  orders: OrderRecord[];
  complaints: SafetyComplaint[];
  savedBusinesses: BusinessProfile[];
  onCancelOrder: (order: OrderRecord, reason: string) => Promise<void>;
  onSubmitComplaint: (params: {
    order: OrderRecord;
    category: ComplaintCategory;
    severity: 'normal' | 'urgent_safety';
    description: string;
  }) => Promise<void>;
  onSubmitReview: (params: {
    order: OrderRecord;
    rating: number;
    comment: string;
  }) => Promise<void>;
  onUpdatePreferences: (updates: {
    displayName: string;
    neighborhood: string;
    notifyOrderUpdates: boolean;
    notifySafetyAlerts: boolean;
  }) => Promise<void>;
  onSelectBusinessFilter: (businessName: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  userProfile,
  orders,
  complaints,
  savedBusinesses,
  onCancelOrder,
  onSubmitComplaint,
  onSubmitReview,
  onUpdatePreferences,
  onSelectBusinessFilter,
}) => {
  const [activeTab, setActiveTab] = useState<
    'reservations' | 'history' | 'saved' | 'support' | 'settings'
  >('reservations');

  // Review state
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');

  // Complaint state
  const [complaintOrderId, setComplaintOrderId] = useState<string>(
    orders[0]?.id || ''
  );
  const [complaintCategory, setComplaintCategory] =
    useState<ComplaintCategory>('food_safety');
  const [complaintSeverity, setComplaintSeverity] = useState<
    'normal' | 'urgent_safety'
  >('normal');
  const [complaintDescription, setComplaintDescription] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Settings state
  const [displayName, setDisplayName] = useState<string>(
    userProfile.displayName
  );
  const [neighborhood, setNeighborhood] = useState<string>(
    userProfile.neighborhood
  );
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState<boolean>(
    userProfile.notifyOrderUpdates
  );
  const [notifySafetyAlerts, setNotifySafetyAlerts] = useState<boolean>(
    userProfile.notifySafetyAlerts
  );

  const activeOrders = orders.filter(
    (o) => o.orderStatus === 'reserved' || o.orderStatus === 'ready_for_pickup'
  );
  const pastOrders = orders.filter(
    (o) =>
      o.orderStatus === 'collected' ||
      o.orderStatus === 'cancelled' ||
      o.orderStatus === 'disputed'
  );

  const handleCancelClick = async (order: OrderRecord) => {
    await onCancelOrder(
      order,
      'Customer cancelled within permitted cutoff window'
    );
    setStatusBanner(
      `Order ${order.orderNumber} cancelled and ${order.quantity} unit(s) returned to inventory.`
    );
  };

  const handleReviewSubmit = async (e: React.FormEvent, order: OrderRecord) => {
    e.preventDefault();
    if (reviewComment.trim().length < 3) return;
    await onSubmitReview({
      order,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    setReviewOrderId(null);
    setReviewComment('');
    setStatusBanner('Verified post-purchase review published.');
  };

  const handleComplaintForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOrder =
      orders.find((o) => o.id === complaintOrderId) || orders[0];
    if (!targetOrder || complaintDescription.trim().length < 5) return;
    await onSubmitComplaint({
      order: targetOrder,
      category: complaintCategory,
      severity: complaintSeverity,
      description: complaintDescription.trim(),
    });
    setComplaintDescription('');
    setStatusBanner(
      'Safety / support ticket recorded and escalated to platform moderation.'
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePreferences({
      displayName,
      neighborhood,
      notifyOrderUpdates,
      notifySafetyAlerts,
    });
    setStatusBanner('Account and notification preferences updated.');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="text-xs text-zinc-500">
            Customer Account · {userProfile.email} · {userProfile.neighborhood}
          </p>
          <h1 className="text-3xl font-display font-bold text-zinc-900 mt-1">
            My SurplusReservations & Receipts
          </h1>
        </div>
        <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-xl overflow-x-auto">
          {[
            {
              id: 'reservations',
              label: `Active Pickups (${activeOrders.length})`,
            },
            { id: 'history', label: `Order History (${pastOrders.length})` },
            {
              id: 'saved',
              label: `Saved Partners (${savedBusinesses.length})`,
            },
            { id: 'support', label: `Safety & Support (${complaints.length})` },
            { id: 'settings', label: 'Preferences & Privacy' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | 'reservations'
                    | 'history'
                    | 'saved'
                    | 'support'
                    | 'settings'
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

      {statusBanner && (
        <div className="p-4 bg-emerald-950/5 border border-emerald-800/20 rounded-xl flex items-center justify-between text-xs text-emerald-950">
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-800 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: ACTIVE RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="p-10 bg-white border border-zinc-200 rounded-2xl text-center space-y-2">
              <Clock className="w-8 h-8 text-zinc-400 mx-auto" />
              <h2 className="text-base font-semibold text-zinc-900">
                No Active Reservations
              </h2>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                When you reserve a surplus meal or bakery box, your 6-character collection pass and pickup instructions will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="font-mono-num font-semibold text-zinc-800">
                        {order.orderNumber}
                      </span>
                      <span className="text-emerald-800 font-semibold">
                        {order.orderStatus === 'ready_for_pickup'
                          ? 'Ready for Collection'
                          : 'Confirmed Reservation'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {order.listingTitle}
                    </h3>
                    <p className="text-xs text-zinc-600">
                      {order.businessName} · Qty: {order.quantity} · Window:{' '}
                      <strong className="text-zinc-900">
                        {order.collectionWindow}
                      </strong>
                    </p>
                  </div>

                  {/* Collection Verification Pass */}
                  <div className="p-4 bg-[#FAF8F5] border border-zinc-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-500 block">
                        Present Collection Code to Staff
                      </span>
                      <span className="text-2xl font-mono-num font-bold tracking-wider text-[#14532D]">
                        {order.collectionCode}
                      </span>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">
                        Payment: {order.paymentStatus.replace('_', ' ')} (
                        {formatUgx(order.grossAmountUgx)})
                      </span>
                    </div>
                    <div className="p-3 bg-white border border-zinc-200 rounded-xl text-center">
                      <QrCode className="w-10 h-10 text-zinc-800 mx-auto" />
                      <span className="text-[10px] font-mono-num text-zinc-500 block mt-1">
                        PASS VERIFIED
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                    <span className="text-zinc-500">
                      Ref: {order.paymentReference}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelClick(order)}
                      className="inline-flex items-center gap-1 text-red-700 hover:text-red-900 font-medium whitespace-nowrap"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Reservation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDER HISTORY & RECEIPTS */}
      {activeTab === 'history' && (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          {pastOrders.length === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-500">
              No completed or cancelled orders yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {pastOrders.map((order) => (
                <div key={order.id} className="p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="font-mono-num font-semibold text-zinc-900">
                          {order.orderNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{order.businessName}</span>
                        <span aria-hidden="true">·</span>
                        <span>Status: {order.orderStatus}</span>
                        <span aria-hidden="true">·</span>
                        <span>Payment: {order.paymentStatus}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 mt-1">
                        {order.listingTitle} (×{order.quantity})
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-mono-num font-bold text-zinc-900 block">
                        {formatUgx(order.grossAmountUgx)}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono-num">
                        Code: {order.collectionCode}
                      </span>
                    </div>
                  </div>

                  {order.orderStatus === 'collected' && (
                    <div className="pt-2">
                      {reviewOrderId === order.id ? (
                        <form
                          onSubmit={(e) => handleReviewSubmit(e, order)}
                          className="p-4 bg-[#FAF8F5] border border-zinc-200 rounded-xl space-y-3 max-w-lg"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-zinc-800">
                              Rate Food Quality & Pickup Experience
                            </label>
                            <select
                              value={reviewRating}
                              onChange={(e) =>
                                setReviewRating(Number(e.target.value))
                              }
                              className="px-2 py-1 text-xs border border-zinc-300 rounded-md bg-white"
                            >
                              {[5, 4, 3, 2, 1].map((r) => (
                                <option key={r} value={r}>
                                  {r} Stars
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            rows={2}
                            required
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share honest feedback on freshness and pickup speed..."
                            className="w-full p-2.5 text-xs border border-zinc-300 rounded-lg bg-white"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-[#14532D] text-white text-xs font-medium rounded-lg"
                            >
                              Submit Verified Review
                            </button>
                            <button
                              type="button"
                              onClick={() => setReviewOrderId(null)}
                              className="px-3 py-1.5 text-xs text-zinc-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewOrderId(order.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#14532D] hover:underline"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Leave Verified Post-Collection Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED BUSINESSES */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {savedBusinesses.length === 0 ? (
            <div className="col-span-3 p-10 bg-white border border-zinc-200 rounded-2xl text-center text-xs text-zinc-500">
              <Heart className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
              You have not saved any favorite businesses yet. Click “Save Partner” on any food offer to bookmark it here.
            </div>
          ) : (
            savedBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="p-5 bg-white border border-zinc-200 rounded-2xl space-y-3 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs text-zinc-500">
                    {biz.category} · {biz.neighborhood}
                  </p>
                  <h3 className="text-base font-semibold text-zinc-900 mt-1">
                    {biz.name}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    {biz.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">{biz.openingHours}</span>
                  <button
                    type="button"
                    onClick={() => onSelectBusinessFilter(biz.name)}
                    className="font-semibold text-[#14532D] hover:underline"
                  >
                    View Offers →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: SAFETY & SUPPORT COMPLAINTS */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              Report a Food Safety, Allergen or Refund Issue
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Urgent food-safety or undeclared allergen reports immediately alert platform administrators for listing withdrawal and refund investigation.
            </p>
            {orders.length === 0 ? (
              <p className="text-xs text-zinc-500 p-4 bg-[#FAF8F5] rounded-xl">
                Reserve an order first to attach a verified order reference to a complaint or refund request.
              </p>
            ) : (
              <form onSubmit={handleComplaintForm} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Select Related Order
                  </label>
                  <select
                    value={complaintOrderId}
                    onChange={(e) => setComplaintOrderId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {o.listingTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-800 mb-1">
                      Issue Category
                    </label>
                    <select
                      value={complaintCategory}
                      onChange={(e) =>
                        setComplaintCategory(
                          e.target.value as ComplaintCategory
                        )
                      }
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                    >
                      <option value="food_safety">Food Safety / Hygiene</option>
                      <option value="allergen_undeclared">
                        Undeclared Allergen
                      </option>
                      <option value="quality_issue">Spoilage / Quality</option>
                      <option value="collection_dispute">
                        Store Closed / Collection Issue
                      </option>
                      <option value="refund_request">Refund Request</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-800 mb-1">
                      Severity Level
                    </label>
                    <select
                      value={complaintSeverity}
                      onChange={(e) =>
                        setComplaintSeverity(
                          e.target.value as 'normal' | 'urgent_safety'
                        )
                      }
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                    >
                      <option value="normal">Standard Support</option>
                      <option value="urgent_safety">
                        Urgent Food Safety Alert
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-zinc-800 mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    placeholder="Describe the issue clearly so our food safety team can investigate..."
                    className="w-full p-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-colors"
                >
                  Submit Official Report
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              Submitted Tickets & Refund Status ({complaints.length})
            </h3>
            {complaints.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No complaints or support tickets submitted.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 text-xs">
                {complaints.map((c) => (
                  <div key={c.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900">
                        {c.businessName} · {c.category.replace('_', ' ')}
                      </span>
                      <span className="font-mono-num text-zinc-600">
                        Status: {c.status}
                      </span>
                    </div>
                    <p className="text-zinc-600">{c.description}</p>
                    {c.resolutionNotes && (
                      <p className="text-emerald-800 font-medium">
                        Admin Resolution: {c.resolutionNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PREFERENCES & UGANDA PDPO PRIVACY */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#14532D]" />
              Personal Information & Notification Preferences
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-zinc-800 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-800 mb-1">
                  Default Kampala Neighborhood
                </label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                >
                  {KAMPALA_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOrderUpdates}
                  onChange={(e) => setNotifyOrderUpdates(e.target.checked)}
                  className="accent-[#14532D]"
                />
                <span>
                  Receive reservation confirmation, order readiness, and collection deadline alerts
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySafetyAlerts}
                  onChange={(e) => setNotifySafetyAlerts(e.target.checked)}
                  className="accent-[#14532D]"
                />
                <span>
                  Receive urgent food-safety recall notices for reserved items (Mandatory for active orders)
                </span>
              </label>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#14532D] text-white font-semibold rounded-lg"
            >
              Save Preferences
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-200 text-xs text-zinc-500 space-y-1.5">
            <p className="font-semibold text-zinc-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Uganda Personal Data Protection Office (PDPO) Privacy Notice
            </p>
            <p>
              SurplusSaver collects only your display name, verified email address, neighborhood preference, and order history to process surplus food reservations and food-safety notifications. Your private orders are isolated by strict zero-trust server rules and are never visible to other customers.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
