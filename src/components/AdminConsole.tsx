import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  Settings,
  FileSpreadsheet,
  Database,
} from 'lucide-react';
import {
  AuditLogEntry,
  BusinessProfile,
  BusinessStatus,
  FoodListing,
  ListingStatus,
  OrderRecord,
  PaymentProvider,
  PlatformSettings,
  SafetyComplaint,
} from '../types/marketplace';
import { formatUgx } from '../lib/domainLogic';

interface AdminConsoleProps {
  isAdminUser: boolean;
  businesses: BusinessProfile[];
  listings: FoodListing[];
  orders: OrderRecord[];
  complaints: SafetyComplaint[];
  auditLogs: AuditLogEntry[];
  platformSettings: PlatformSettings;
  onUpdateBusinessStatus: (
    business: BusinessProfile,
    status: BusinessStatus
  ) => Promise<void>;
  onModerateListing: (
    listing: FoodListing,
    status: ListingStatus
  ) => Promise<void>;
  onResolveComplaint: (
    complaint: SafetyComplaint,
    status: 'investigating' | 'resolved_refunded' | 'dismissed',
    resolutionNotes: string
  ) => Promise<void>;
  onSavePlatformSettings: (settings: PlatformSettings) => Promise<void>;
  onSeedSampleDataToFirestore: () => Promise<void>;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  isAdminUser,
  businesses,
  listings,
  orders,
  complaints,
  auditLogs,
  platformSettings,
  onUpdateBusinessStatus,
  onModerateListing,
  onResolveComplaint,
  onSavePlatformSettings,
  onSeedSampleDataToFirestore,
}) => {
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'businesses' | 'listings' | 'complaints' | 'config' | 'audit'
  >('analytics');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [resolutionNotesMap, setResolutionNotesMap] = useState<
    Record<string, string>
  >({});

  // Configurable platform settings state
  const [commissionBps, setCommissionBps] = useState<number>(
    platformSettings.defaultCommissionBps
  );
  const [growthPlusUgx, setGrowthPlusUgx] = useState<number>(
    platformSettings.growthPlusMonthlyUgx
  );
  const [featuredUgx, setFeaturedUgx] = useState<number>(
    platformSettings.featuredPlacementDailyUgx
  );
  const [maxUnits, setMaxUnits] = useState<number>(
    platformSettings.maxReservationUnits
  );
  const [cutoffMins, setCutoffMins] = useState<number>(
    platformSettings.cancellationCutoffMinutes
  );
  const [gateway, setGateway] = useState<PaymentProvider>(
    platformSettings.activePaymentGateway
  );
  const [safetyBanner, setSafetyBanner] = useState<string>(
    platformSettings.safetyNoticeBanner
  );

  // BI & Analytics Calculations (Section 13)
  const approvedBusinesses = businesses.filter((b) => b.status === 'approved');
  const pendingBusinesses = businesses.filter((b) => b.status === 'pending');
  const activeListings = listings.filter((l) => l.status === 'active');
  const completedOrders = orders.filter((o) => o.orderStatus === 'collected');
  const cancelledRefundedOrders = orders.filter(
    (o) => o.orderStatus === 'cancelled' || o.paymentStatus === 'refunded'
  );

  const gmvUgx = completedOrders.reduce((sum, o) => sum + o.grossAmountUgx, 0);
  const earnedCommissionsUgx = completedOrders.reduce(
    (sum, o) => sum + o.commissionAmountUgx,
    0
  );
  const growthSubscribersCount = businesses.filter(
    (b) => b.status === 'approved' && b.subscriptionTier === 'growth_plus'
  ).length;
  const subscriptionRevenueUgx =
    growthSubscribersCount * platformSettings.growthPlusMonthlyUgx;

  const totalUnitsListed = listings.reduce(
    (sum, l) => sum + l.quantityTotal,
    0
  );
  const totalUnitsRemaining = listings.reduce(
    (sum, l) => sum + l.quantityAvailable,
    0
  );
  const sellThroughPercent =
    totalUnitsListed > 0
      ? Math.round(
          ((totalUnitsListed - totalUnitsRemaining) / totalUnitsListed) * 100
        )
      : 0;

  const complaintRatePercent =
    orders.length > 0
      ? Number(((complaints.length / orders.length) * 100).toFixed(1))
      : 0;

  const handleExportCsv = () => {
    const headers = [
      'OrderNumber',
      'BusinessName',
      'ListingTitle',
      'Quantity',
      'GrossUGX',
      'CommissionUGX',
      'NetSettlementUGX',
      'PaymentStatus',
      'OrderStatus',
      'CollectionCode',
    ];
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        `"${o.businessName.replace(/"/g, '""')}"`,
        `"${o.listingTitle.replace(/"/g, '""')}"`,
        o.quantity,
        o.grossAmountUgx,
        o.commissionAmountUgx,
        o.netSettlementUgx,
        o.paymentStatus,
        o.orderStatus,
        o.collectionCode,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `surplussaver-kampala-report-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePlatformSettings({
      id: 'global',
      defaultCommissionBps: commissionBps,
      growthPlusMonthlyUgx: growthPlusUgx,
      featuredPlacementDailyUgx: featuredUgx,
      maxReservationUnits: maxUnits,
      cancellationCutoffMinutes: cutoffMins,
      activePaymentGateway: gateway,
      safetyNoticeBanner: safetyBanner,
      updatedBy: 'admin_console',
    });
    setAdminNotice('Platform commission, subscription, and gateway rules saved.');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="text-xs text-zinc-500">
            Platform Governance · Role-Based Access Control · Kampala Operations
          </p>
          <h1 className="text-3xl font-display font-bold text-zinc-900 mt-1">
            SurplusSaver Administration & Moderation Console
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await onSeedSampleDataToFirestore();
              setAdminNotice(
                'Sample pilot businesses and listings synced to live Firestore database.'
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-zinc-300 bg-white hover:bg-zinc-50 rounded-xl whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-[#14532D]" />
            Sync Pilot Seed Data
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV Report
          </button>
        </div>
      </div>

      {!isAdminUser && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
          <strong>Read-Only Audit Preview:</strong> Elevated write actions (business approvals, refunds, commission rule changes) are enforced server-side in `firestore.rules` for the verified platform administrator (`osbertallan09@gmail.com`).
        </div>
      )}

      {adminNotice && (
        <div className="p-4 bg-emerald-950/5 border border-emerald-800/20 rounded-xl flex items-center justify-between text-xs text-emerald-950">
          <span>{adminNotice}</span>
          <button
            type="button"
            onClick={() => setAdminNotice(null)}
            className="font-semibold text-emerald-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-xl overflow-x-auto">
        {[
          { id: 'analytics', label: 'BI & Revenue Metrics' },
          {
            id: 'businesses',
            label: `Business Verification (${businesses.length})`,
          },
          {
            id: 'listings',
            label: `Listing Moderation (${listings.length})`,
          },
          {
            id: 'complaints',
            label: `Safety & Disputes (${complaints.length})`,
          },
          { id: 'config', label: 'Commission & Gateway Rules' },
          { id: 'audit', label: `Audit Logs (${auditLogs.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              setActiveTab(
                t.id as
                  | 'analytics'
                  | 'businesses'
                  | 'listings'
                  | 'complaints'
                  | 'config'
                  | 'audit'
              )
            }
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: BI & REVENUE METRICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Gross Merchandise Value (GMV)
              </span>
              <p className="text-2xl font-mono-num font-bold text-zinc-900 mt-1">
                {formatUgx(gmvUgx)}
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Completed orders: {completedOrders.length} · Cancelled/Refunded:{' '}
                {cancelledRefundedOrders.length}
              </span>
            </div>
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Earned Platform Commissions
              </span>
              <p className="text-2xl font-mono-num font-bold text-[#14532D] mt-1">
                {formatUgx(earnedCommissionsUgx)}
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Default rate:{' '}
                {(platformSettings.defaultCommissionBps / 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Monthly Subscription MRR
              </span>
              <p className="text-2xl font-mono-num font-bold text-zinc-900 mt-1">
                {formatUgx(subscriptionRevenueUgx)}
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                {growthSubscribersCount} Growth Plus businesses
              </span>
            </div>
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl">
              <span className="text-xs text-zinc-500">
                Marketplace Health & Trust
              </span>
              <p className="text-2xl font-mono-num font-bold text-zinc-900 mt-1">
                {sellThroughPercent}% Sell-Through
              </p>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Approved Partners: {approvedBusinesses.length} · Complaint Rate:{' '}
                {complaintRatePercent}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUSINESS VERIFICATION & APPROVAL */}
      {activeTab === 'businesses' && (
        <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-200">
          {businesses.map((biz) => (
            <div
              key={biz.id}
              className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-mono-num font-semibold text-zinc-900">
                    {biz.verificationNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{biz.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{biz.neighborhood}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-emerald-800">
                    Status: {biz.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  {biz.name}
                </h3>
                <p className="text-xs text-zinc-600">
                  {biz.address} · {biz.phone} · Plan: {biz.subscriptionTier}
                </p>
              </div>
              {!biz.isSampleData && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!isAdminUser || biz.status === 'approved'}
                    onClick={() => onUpdateBusinessStatus(biz, 'approved')}
                    className="px-3 py-1.5 bg-[#14532D] text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                  >
                    Approve Partner
                  </button>
                  <button
                    type="button"
                    disabled={!isAdminUser || biz.status === 'suspended'}
                    onClick={() => onUpdateBusinessStatus(biz, 'suspended')}
                    className="px-3 py-1.5 border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg disabled:opacity-40"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    disabled={!isAdminUser || biz.status === 'rejected'}
                    onClick={() => onUpdateBusinessStatus(biz, 'rejected')}
                    className="px-3 py-1.5 border border-red-200 text-red-700 text-xs font-semibold rounded-lg disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: LISTING & FOOD SAFETY MODERATION */}
      {activeTab === 'listings' && (
        <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-200">
          {listings.map((lst) => (
            <div
              key={lst.id}
              className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-800">
                    {lst.businessName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {lst.status.toUpperCase()}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">
                    Stock: {lst.quantityAvailable}/{lst.quantityTotal}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {lst.title}
                </h3>
                <p className="text-xs text-zinc-600">
                  Allergens:{' '}
                  {lst.allergens.length > 0 ? lst.allergens.join(', ') : 'None'}{' '}
                  · Storage: {lst.storageInstructions}
                </p>
              </div>
              {!lst.isSampleData && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!isAdminUser || lst.status === 'active'}
                    onClick={() => onModerateListing(lst, 'active')}
                    className="px-3 py-1.5 border border-emerald-700 text-emerald-800 text-xs font-medium rounded-lg disabled:opacity-40"
                  >
                    Approve / Activate
                  </button>
                  <button
                    type="button"
                    disabled={!isAdminUser || lst.status === 'suspended'}
                    onClick={() => onModerateListing(lst, 'suspended')}
                    className="px-3 py-1.5 border border-red-200 text-red-700 text-xs font-medium rounded-lg disabled:opacity-40"
                  >
                    Safety Suspend
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: SAFETY COMPLAINTS & DISPUTE RESOLUTION */}
      {activeTab === 'complaints' && (
        <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-200">
          {complaints.length === 0 ? (
            <div className="p-10 text-center text-xs text-zinc-500">
              Zero open food-safety complaints or order disputes.
            </div>
          ) : (
            complaints.map((cmp) => (
              <div key={cmp.id} className="p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">
                    {cmp.businessName} · {cmp.category.replace('_', ' ')} (
                    {cmp.severity})
                  </span>
                  <span className="font-mono-num text-zinc-600">
                    Status: {cmp.status}
                  </span>
                </div>
                <p className="text-zinc-600">{cmp.description}</p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Enter resolution or refund audit notes..."
                    value={resolutionNotesMap[cmp.id] || ''}
                    onChange={(e) =>
                      setResolutionNotesMap((prev) => ({
                        ...prev,
                        [cmp.id]: e.target.value,
                      }))
                    }
                    className="flex-1 min-w-[220px] px-3 py-1.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
                  />
                  <button
                    type="button"
                    disabled={!isAdminUser}
                    onClick={() =>
                      onResolveComplaint(
                        cmp,
                        'resolved_refunded',
                        resolutionNotesMap[cmp.id] ||
                          'Verified and refunded by administrator'
                      )
                    }
                    className="px-3 py-1.5 bg-[#14532D] text-white font-semibold rounded-lg disabled:opacity-40"
                  >
                    Resolve & Refund
                  </button>
                  <button
                    type="button"
                    disabled={!isAdminUser}
                    onClick={() =>
                      onResolveComplaint(
                        cmp,
                        'dismissed',
                        resolutionNotesMap[cmp.id] ||
                          'Investigated — no policy violation found'
                      )
                    }
                    className="px-3 py-1.5 border border-zinc-300 rounded-lg disabled:opacity-40"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: COMMISSION, SUBSCRIPTION & GATEWAY RULES */}
      {activeTab === 'config' && (
        <form
          onSubmit={handleSaveConfig}
          className="max-w-2xl bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 text-xs"
        >
          <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#14532D]" />
            Configurable Monetization & Marketplace Rules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-zinc-800 mb-1">
                Default Transaction Commission (Basis Points, 1200 = 12%)
              </label>
              <input
                type="number"
                min={0}
                max={4000}
                value={commissionBps}
                onChange={(e) => setCommissionBps(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-800 mb-1">
                Growth Plus Subscription (UGX / Month)
              </label>
              <input
                type="number"
                min={0}
                value={growthPlusUgx}
                onChange={(e) => setGrowthPlusUgx(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-800 mb-1">
                Sponsored Placement Fee (UGX / Day)
              </label>
              <input
                type="number"
                min={0}
                value={featuredUgx}
                onChange={(e) => setFeaturedUgx(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-800 mb-1">
                Active Payment Gateway Provider
              </label>
              <select
                value={gateway}
                onChange={(e) => setGateway(e.target.value as PaymentProvider)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              >
                <option value="sandbox_simulator">
                  Sandbox Simulator (Labeled Test Mode)
                </option>
                <option value="flutterwave">
                  Flutterwave Uganda (MTN/Airtel/Cards)
                </option>
                <option value="pesapal">
                  Pesapal Uganda API 3.0 (Mobile Money/Cards)
                </option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-zinc-800 mb-1">
                Max Units Per Reservation
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxUnits}
                onChange={(e) => setMaxUnits(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>
            <div>
              <label className="block font-medium text-zinc-800 mb-1">
                Cancellation Cutoff (Minutes before close)
              </label>
              <input
                type="number"
                min={0}
                max={1440}
                value={cutoffMins}
                onChange={(e) => setCutoffMins(Number(e.target.value))}
                className="w-full px-3 py-2 font-mono-num border border-zinc-300 rounded-lg bg-[#FAF8F5]"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-zinc-800 mb-1">
              Marketplace Food-Safety Notice Banner
            </label>
            <textarea
              rows={2}
              value={safetyBanner}
              onChange={(e) => setSafetyBanner(e.target.value)}
              className="w-full p-2.5 border border-zinc-300 rounded-lg bg-[#FAF8F5]"
            />
          </div>
          <button
            type="submit"
            disabled={!isAdminUser}
            className="px-4 py-2.5 bg-[#14532D] text-white font-semibold rounded-xl disabled:opacity-40"
          >
            Save Platform Configuration
          </button>
        </form>
      )}

      {/* TAB 6: IMMUTABLE AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-200 text-xs">
          {auditLogs.length === 0 ? (
            <div className="p-10 text-center text-zinc-500">
              No operational audit events recorded yet.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-mono-num font-semibold text-zinc-900">
                    [{log.actionType}]
                  </span>{' '}
                  <span className="text-zinc-700">{log.summary}</span>
                </div>
                <div className="text-zinc-500 font-mono-num">
                  Actor: {log.actorRole} ({log.actorId.slice(0, 8)}) · Target:{' '}
                  {log.targetType}/{log.targetId.slice(0, 10)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};
