import React from 'react';
import { X, ShieldCheck, Server, CreditCard, CheckCircle2 } from 'lucide-react';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arch-docs-title"
    >
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-[#FAF8F5] border-b border-zinc-200">
          <div>
            <p className="text-xs text-emerald-800 font-semibold">
              Production Readiness, Security & Architecture Deliverable
            </p>
            <h2
              id="arch-docs-title"
              className="text-lg font-display font-bold text-zinc-900"
            >
              SurplusSaver — System Architecture, Payment Boundary & Launch Checklist
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs text-zinc-700 max-h-[75vh] overflow-y-auto leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#FAF8F5] border border-zinc-200 rounded-xl space-y-2">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-[#14532D]" />
                1. Database, Auth & Atomic Inventory Architecture
              </h3>
              <p>
                Provisioned on Google Cloud Firestore Enterprise Edition (`firebase-blueprint.json` + zero-trust `firestore.rules`) with Firebase Google OAuth (`signInWithPopup`).
              </p>
              <p>
                <strong>Concurrency & Oversell Prevention:</strong> Reservations execute inside a Firestore `runTransaction()` block that reads the live `quantityAvailable`, validates `saleDeadlineIso` and `safeUseDeadlineIso`, decrements stock atomically, and writes the `OrderRecord` and immutable `AuditLogEntry` together.
              </p>
            </div>

            <div className="p-4 bg-[#FAF8F5] border border-zinc-200 rounded-xl space-y-2">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#14532D]" />
                2. Payment Gateway Boundary (Kampala Launch)
              </h3>
              <p>
                Implemented via `PaymentGatewayRegistry` in `src/lib/domainLogic.ts`, supporting MTN Mobile Money, Airtel Money, Visa/Mastercard, and Pay-at-Collection.
              </p>
              <p>
                <strong>Explicit Simulation Boundary:</strong> By default, `VITE_PAYMENT_PROVIDER="sandbox_simulator"` runs in clearly labeled <strong>Sandbox Test Mode</strong>. No raw card numbers or Mobile Money PINs are ever collected or stored. To switch to live Ugandan Mobile Money settlements, supply `FLUTTERWAVE_SECRET_KEY` + `FLUTTERWAVE_WEBHOOK_HASH` or `PESAPAL_CONSUMER_KEY` + `PESAPAL_CONSUMER_SECRET` in environment secrets.
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FAF8F5] border border-zinc-200 rounded-xl space-y-2">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#14532D]" />
              3. Required Third-Party Accounts & Launch Blockers Before Live Kampala Pilot
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Merchant Payment Account:</strong> Approved Flutterwave Uganda or Pesapal Uganda merchant account with MTN MoMo & Airtel Money collection enabled and webhook endpoint configured.
              </li>
              <li>
                <strong>Regulatory & Food Safety Review:</strong> KCCA (Kampala Capital City Authority) Directorate of Public Health & Environment onboarding checklist for participating restaurants and bakeries.
              </li>
              <li>
                <strong>Data Privacy Registration:</strong> Personal Data Protection Office (PDPO) Uganda data-collector registration and published privacy officer contact.
              </li>
              <li>
                <strong>SMS / Email Notification Gateway:</strong> Configure `AFRICASTALKING_API_KEY` (Uganda SMS alerts) and `SMTP_HOST` for automated transactional emails outside the in-app notification center.
              </li>
            </ul>
          </div>

          <div className="p-4 bg-white border border-zinc-200 rounded-xl space-y-2">
            <h3 className="font-semibold text-zinc-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
              4. Prioritized Post-MVP Roadmap
            </h3>
            <p>
              1. Native Android PWA offline pass caching for low-connectivity Kampala neighborhoods · 2. Automated Flutterwave Split-Subaccount T+1 payouts to verified merchant Mobile Money wallets · 3. Swahili and Luganda localization toggle · 4. Boda-boda last-mile collection partner dispatch integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
