import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  AlertOctagon,
  CheckCircle,
  Sliders,
  FileText,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { formatUgx, processIdempotentWebhook, WebhookEventPayload } from '../lib/domainLogic';
import { SUBSCRIPTION_PLANS } from '../types/marketplace';

export const AdminConsoleView: React.FC = () => {
  const {
    businesses,
    listings,
    orders,
    complaints,
    auditLogs,
    defaultCommissionBps,
    setDefaultCommissionBps,
    moderateBusinessVerification,
    moderateListingSafetyStatus,
    resolveSafetyComplaint,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<
    'businesses' | 'listings' | 'complaints' | 'economics' | 'audit'
  >('businesses');

  const [webhookTestLog, setWebhookTestLog] = useState<string | null>(null);

  // Comprehensive Section 13 Admin Metrics
  const approvedBusinessesCount = businesses.filter(
    (b) => b.verificationStatus === 'approved'
  ).length;
  const pendingBusinessesCount = businesses.filter(
    (b) => b.verificationStatus === 'pending'
  ).length;
  const activeListingsCount = listings.filter((l) => l.status === 'published').length;

  const completedOrders = orders.filter((o) => o.orderStatus === 'collected');
  const cancelledOrRefundedOrders = orders.filter(
    (o) => o.orderStatus === 'cancelled' || o.orderStatus === 'refunded'
  );
  const validOrders = orders.filter(
    (o) => o.orderStatus !== 'cancelled' && o.orderStatus !== 'refunded'
  );

  const gmvUgx = validOrders.reduce((acc, o) => acc + o.grossTotalUgx, 0);
  const earnedCommissionUgx = validOrders.reduce(
    (acc, o) => acc + o.platformCommissionUgx,
    0
  );
  const subscriptionRevenueUgx = businesses
    .filter((b) => b.verificationStatus === 'approved')
    .reduce((acc, b) => acc + (SUBSCRIPTION_PLANS[b.subscriptionTier]?.monthlyFeeUgx || 0), 0);

  const totalUnitsOffered = listings.reduce((acc, l) => acc + l.totalQuantity, 0);
  const totalUnitsRemaining = listings.reduce((acc, l) => acc + l.remainingQuantity, 0);
  const sellThroughRatePct =
    totalUnitsOffered > 0
      ? Math.round(((totalUnitsOffered - totalUnitsRemaining) / totalUnitsOffered) * 100)
      : 0;

  const complaintRatePct =
    orders.length > 0 ? Math.round((complaints.length / orders.length) * 100) : 0;

  const handleExportOperationalCsv = () => {
    const headers = [
      'OrderID',
      'CollectionCode',
      'BusinessName',
      'ListingTitle',
      'Quantity',
      'GrossUGX',
      'CommissionUGX',
      'NetProceedsUGX',
      'OrderStatus',
      'PaymentStatus',
      'CreatedAt',
    ];
    const rows = orders.map((o) => [
      o.id,
      o.collectionCode,
      `"${o.businessName}"`,
      `"${o.listingTitle}"`,
      o.quantity,
      o.grossTotalUgx,
      o.platformCommissionUgx,
      o.netBusinessProceedsUgx,
      o.orderStatus,
      o.paymentStatus,
      o.createdAt,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `surplussaver_kampala_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSimulateWebhookVerification = () => {
    const sampleSecret = 'flw_ug_live_verify_secret';
    const processedSet = new Set<string>();
    const dummyOrder = orders[0] || {
      id: 'ord_webhook_sim_1',
      customerUid: 'cust_1',
      customerName: 'Kampala Buyer',
      businessId: 'biz_endiro_kololo',
      businessOwnerUid: 'owner_1',
      businessName: 'Acacia Artisan Bakery',
      pickupAddress: 'Plot 24 Acacia Ave',
      listingId: 'lst_kololo_sourdough_pack',
      listingTitle: 'Artisan Country Sourdough',
      quantity: 1,
      unitPriceUgx: 16500,
      originalUnitPriceUgx: 38000,
      grossTotalUgx: 16500,
      savingsTotalUgx: 21500,
      commissionBps: 1000,
      platformCommissionUgx: 1650,
      netBusinessProceedsUgx: 14850,
      currency: 'UGX' as const,
      collectionWindow: 'Today 17:30 - 20:30',
      collectionDeadlineIso: new Date().toISOString(),
      collectionCode: 'SS-SIM991',
      paymentMethod: 'mtn_momo_sandbox' as const,
      paymentProviderRef: 'PENDING',
      paymentStatus: 'pending_verification' as const,
      orderStatus: 'reserved' as const,
      cancellationReason: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const payload: WebhookEventPayload = {
      eventId: 'evt_flw_ug_994812',
      orderId: dummyOrder.id,
      providerRef: 'FLW-MTN-UG-994812',
      amountUgx: dummyOrder.grossTotalUgx,
      currency: 'UGX',
      status: 'successful',
      signature: `sha256=${sampleSecret}:evt_flw_ug_994812:${dummyOrder.id}:${dummyOrder.grossTotalUgx}`,
    };

    const first = processIdempotentWebhook(processedSet, dummyOrder, payload, sampleSecret);
    const second = processIdempotentWebhook(
      processedSet,
      first.updatedOrder,
      payload,
      sampleSecret
    );

    setWebhookTestLog(
      `Webhook #1 (Signed SHA-256): Accepted=${first.accepted}, Status=${first.updatedOrder.paymentStatus} | Retry Webhook #2 (Same Event ID): DuplicateBlocked=${second.duplicate} (Zero double-charge)`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2DDD5]">
        <div>
          <div className="text-xs text-[#5A655D] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1B5E3A]" />
            <span>Platform Governance, KCCA Verification & Marketplace Intelligence</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#1C241E]">
            SurplusSaver Administration Console
          </h1>
        </div>
        <button
          type="button"
          onClick={handleExportOperationalCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1C241E] hover:bg-[#2E3830] text-white text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Authorized Operational CSV</span>
        </button>
      </div>

      {/* 4-Column Executive KPI Row */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Gross Merchandise Value (GMV)</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {formatUgx(gmvUgx)}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-[#1B5E3A]">
            Earned Commissions: {formatUgx(earnedCommissionUgx)}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Monthly Subscription Revenue</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {formatUgx(subscriptionRevenueUgx)}
          </div>
          <div className="mt-1 text-xs text-[#5A655D]">
            {approvedBusinessesCount} approved · {pendingBusinessesCount} pending review
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Marketplace Sell-Through & Orders</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {sellThroughRatePct}% sell-through
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-[#5A655D]">
            {orders.length} total · {completedOrders.length} collected ·{' '}
            {cancelledOrRefundedOrders.length} cancelled/refunded
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E2DDD5]">
          <div className="text-xs text-[#5A655D]">Safety & Dispute Rate</div>
          <div className="mt-1 text-2xl font-mono-tabular font-bold text-[#1C241E]">
            {complaints.length} ticket(s) ({complaintRatePct}%)
          </div>
          <div className="mt-1 text-xs text-[#5A655D]">
            {activeListingsCount} active published listings
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] rounded-lg w-fit">
        {[
          { id: 'businesses', label: `Business Verification (${businesses.length})` },
          { id: 'listings', label: `Listing Safety Moderation (${listings.length})` },
          { id: 'complaints', label: `Disputes & Safety Alerts (${complaints.length})` },
          { id: 'economics', label: 'Commissions & Payment Gateway' },
          { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? 'bg-white text-[#1C241E] shadow-xs'
                : 'text-[#5A655D] hover:text-[#1C241E]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Business Verification Queue */}
      {activeTab === 'businesses' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2DDD5] bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DDD5] bg-[#FAF8F5] text-[#5A655D]">
                <th className="py-3.5 px-4 font-semibold">Business & Category</th>
                <th className="py-3.5 px-4 font-semibold">Neighborhood & Address</th>
                <th className="py-3.5 px-4 font-semibold">KCCA Permit & URA TIN</th>
                <th className="py-3.5 px-4 font-semibold">Tier / Comm.</th>
                <th className="py-3.5 px-4 font-semibold">Verification Status</th>
                <th className="py-3.5 px-4 font-semibold">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD5]">
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#1C241E]">{b.name}</div>
                    <div className="text-[#5A655D]">{b.category}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#5A655D]">
                    <div>{b.neighborhood}</div>
                    <div>{b.address}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    <div className="font-semibold text-[#1C241E]">{b.kccaPermitNumber}</div>
                    <div className="text-[#5A655D]">TIN: {b.tinNumber}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    {b.subscriptionTier} ({(b.commissionBps / 100).toFixed(1)}%)
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-mono-tabular font-bold uppercase ${
                        b.verificationStatus === 'approved'
                          ? 'text-[#1B5E3A]'
                          : b.verificationStatus === 'pending'
                          ? 'text-[#B45309]'
                          : 'text-[#991B1B]'
                      }`}
                    >
                      {b.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {b.verificationStatus !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => moderateBusinessVerification(b.id, 'approved')}
                          className="px-2.5 py-1 rounded bg-[#1B5E3A] text-white font-semibold whitespace-nowrap shrink-0"
                        >
                          Approve
                        </button>
                      )}
                      {b.verificationStatus !== 'suspended' && (
                        <button
                          type="button"
                          onClick={() => moderateBusinessVerification(b.id, 'suspended')}
                          className="px-2.5 py-1 rounded bg-[#FEF2F2] text-[#991B1B] font-semibold whitespace-nowrap shrink-0"
                        >
                          Suspend
                        </button>
                      )}
                      {b.verificationStatus === 'pending' && (
                        <button
                          type="button"
                          onClick={() => moderateBusinessVerification(b.id, 'rejected')}
                          className="px-2.5 py-1 rounded border border-[#D5CFC4] text-[#5A655D] whitespace-nowrap shrink-0"
                        >
                          Reject
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

      {/* Tab 2: Listing Moderation */}
      {activeTab === 'listings' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2DDD5] bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DDD5] bg-[#FAF8F5] text-[#5A655D]">
                <th className="py-3.5 px-4 font-semibold">Offer & Business</th>
                <th className="py-3.5 px-4 font-semibold">Allergen & Storage Declarations</th>
                <th className="py-3.5 px-4 font-semibold">Price / Stock</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Safety Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD5]">
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#1C241E]">{l.title}</div>
                    <div className="text-[#5A655D]">{l.businessName}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#5A655D] max-w-md">
                    <div>
                      <strong className="text-[#9A3412]">Allergens:</strong> {l.allergens}
                    </div>
                    <div className="mt-0.5">
                      <strong>Storage:</strong> {l.storageInstructions}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular">
                    <div>{formatUgx(l.discountedPriceUgx)}</div>
                    <div className="text-[#5A655D]">
                      {l.remainingQuantity}/{l.totalQuantity} left
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono-tabular font-bold uppercase">
                    {l.status}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {l.status !== 'suspended_safety' ? (
                        <button
                          type="button"
                          onClick={() =>
                            moderateListingSafetyStatus(
                              l.id,
                              'suspended_safety',
                              'Admin food-safety inspection hold'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-[#FEF2F2] text-[#991B1B] font-semibold whitespace-nowrap shrink-0"
                        >
                          Safety Hold
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            moderateListingSafetyStatus(
                              l.id,
                              'published',
                              'Safety verification cleared by Admin'
                            )
                          }
                          className="px-2.5 py-1 rounded bg-[#1B5E3A] text-white font-semibold whitespace-nowrap shrink-0"
                        >
                          Reinstate
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

      {/* Tab 3: Complaints & Disputes */}
      {activeTab === 'complaints' && (
        <div className="mt-6 space-y-4">
          {complaints.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-[#E2DDD5] text-center text-xs text-[#5A655D]">
              Zero open food-safety complaints or customer disputes.
            </div>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-xl bg-white border border-[#E2DDD5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-[#991B1B]" />
                    <span className="font-mono-tabular font-bold uppercase text-[#991B1B]">
                      {c.severity} · {c.category}
                    </span>
                    <span className="text-[#5A655D]">· Status: {c.status.toUpperCase()}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-[#1C241E]">{c.description}</p>
                  <div className="mt-1 text-[#5A655D] font-mono-tabular">
                    Ticket: {c.id} · Order: {c.orderId} · Listing: {c.listingId || 'N/A'}
                  </div>
                </div>
                {c.status === 'open' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        resolveSafetyComplaint(
                          c.id,
                          'resolved_refunded',
                          'Admin approved full customer refund and notified business.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#1B5E3A] text-white font-semibold whitespace-nowrap shrink-0"
                    >
                      Resolve & Refund Order
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        resolveSafetyComplaint(
                          c.id,
                          'dismissed',
                          'Investigated with business; no policy violation found.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#D5CFC4] text-[#5A655D] whitespace-nowrap shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Commissions & Payment Gateway Verification */}
      {activeTab === 'economics' && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-white border border-[#E2DDD5] space-y-4 text-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1C241E]">
              <Sliders className="w-4 h-4 text-[#1B5E3A]" />
              <span>Configurable Platform Commission Rule</span>
            </div>
            <p className="text-[#5A655D]">
              Adjust the default transaction commission rate (in basis points; 1500 bps = 15.0%) without modifying application code.
            </p>
            <div>
              <label className="block font-semibold text-[#1C241E] mb-1">
                Default Commission Basis Points (Current: {(defaultCommissionBps / 100).toFixed(2)}%)
              </label>
              <input
                type="number"
                min={0}
                max={3500}
                step={50}
                value={defaultCommissionBps}
                onChange={(e) => setDefaultCommissionBps(Number(e.target.value))}
                className="rounded-lg border border-[#D5CFC4] bg-[#FAF8F5] px-3 py-2 font-mono-tabular font-bold"
              />
            </div>
          </div>

          <div className="p-6 rounded-xl bg-white border border-[#E2DDD5] space-y-4 text-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1C241E]">
              <CheckCircle className="w-4 h-4 text-[#1B5E3A]" />
              <span>Payment Webhook Signature & Idempotency Verifier</span>
            </div>
            <p className="text-[#5A655D]">
              Test the Flutterwave / Pesapal Uganda Mobile Money webhook verification and duplicate-delivery guard.
            </p>
            <button
              type="button"
              onClick={handleSimulateWebhookVerification}
              className="px-4 py-2 rounded-lg bg-[#1B5E3A] text-white font-semibold whitespace-nowrap shrink-0"
            >
              Run Signed Webhook & Duplicate Retry Test
            </button>
            {webhookTestLog && (
              <div className="p-3 rounded-lg bg-[#F0F7F3] border border-[#1B5E3A] font-mono-tabular text-[#1B5E3A]">
                {webhookTestLog}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Immutable Audit Logs */}
      {activeTab === 'audit' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E2DDD5] bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2DDD5] bg-[#FAF8F5] text-[#5A655D]">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor & Role</th>
                <th className="py-3 px-4 font-semibold">Action Type</th>
                <th className="py-3 px-4 font-semibold">Target ID</th>
                <th className="py-3 px-4 font-semibold">Audit Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD5]">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 px-4 font-mono-tabular text-[#5A655D]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular">
                    {log.actorRole} ({log.actorUid.slice(0, 10)})
                  </td>
                  <td className="py-3 px-4 font-mono-tabular font-bold text-[#1B5E3A]">
                    {log.actionType}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-[#5A655D]">{log.targetId}</td>
                  <td className="py-3 px-4 text-[#1C241E]">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
