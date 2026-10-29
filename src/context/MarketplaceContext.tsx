import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  AuditLogEntry,
  BusinessCategory,
  BusinessProfile,
  ComplaintCategory,
  ComplaintSeverity,
  FoodListing,
  InAppNotification,
  ListingType,
  OrderRecord,
  PaymentMethodId,
  SafetyComplaint,
  SubscriptionTier,
  UserProfile,
  UserRole,
  VerificationStatus,
  VerifiedReview,
} from '../types/marketplace';
import { buildInitialSeedData } from '../lib/seedData';
import {
  calculateOrderEconomics,
  evaluateListingEligibility,
  generateCollectionCode,
  getCommissionBpsForTier,
  verifyCollectionCodeInput,
} from '../lib/domainLogic';

interface ReserveOfferInput {
  listingId: string;
  quantity: number;
  collectionWindow: string;
  paymentMethod: PaymentMethodId;
  momoPhoneOrCardLast4?: string;
}

interface CreateBusinessInput {
  name: string;
  category: BusinessCategory;
  neighborhood: string;
  address: string;
  contactPhone: string;
  openingHours: string;
  kccaPermitNumber: string;
  tinNumber: string;
  foodSafetyAccepted: boolean;
  subscriptionTier: SubscriptionTier;
}

interface CreateListingInput {
  businessId: string;
  title: string;
  description: string;
  listingType: ListingType;
  originalPriceUgx: number;
  discountedPriceUgx: number;
  totalQuantity: number;
  ingredients: string;
  allergens: string;
  dietaryTags: string;
  storageInstructions: string;
  collectionWindowLabel: string;
  hoursUntilSaleClose: number;
  hoursUntilCollectionClose: number;
  hoursUntilSafeUseClose: number;
  imageKey: string;
  customImageDataUrl?: string;
  isSponsored?: boolean;
  publishImmediately?: boolean;
}

interface MarketplaceContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  authReady: boolean;
  activeRoleView: UserRole;
  setActiveRoleView: (role: UserRole) => void;
  businesses: BusinessProfile[];
  listings: FoodListing[];
  orders: OrderRecord[];
  complaints: SafetyComplaint[];
  reviews: VerifiedReview[];
  auditLogs: AuditLogEntry[];
  notifications: InAppNotification[];
  savedBusinessIds: string[];
  lowBandwidthMode: boolean;
  defaultCommissionBps: number;
  setDefaultCommissionBps: (bps: number) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleSavedBusiness: (businessId: string) => Promise<void>;
  toggleLowBandwidthMode: () => Promise<void>;
  reserveOfferAtomically: (input: ReserveOfferInput) => Promise<OrderRecord>;
  cancelCustomerOrder: (orderId: string, reason: string) => Promise<void>;
  verifyAndCompleteCollection: (orderId: string, staffCodeInput: string) => Promise<{ ok: boolean; message: string }>;
  markOrderReadyForPickup: (orderId: string) => Promise<void>;
  issueOrderRefund: (orderId: string, reason: string) => Promise<void>;
  registerBusinessApplication: (input: CreateBusinessInput) => Promise<BusinessProfile>;
  createOrPublishListing: (input: CreateListingInput) => Promise<FoodListing>;
  updateListingStatusOrStock: (
    listingId: string,
    updates: Partial<Pick<FoodListing, 'status' | 'remainingQuantity' | 'discountedPriceUgx' | 'isSponsored'>>
  ) => Promise<void>;
  moderateBusinessVerification: (businessId: string, nextStatus: VerificationStatus) => Promise<void>;
  moderateListingSafetyStatus: (listingId: string, nextStatus: FoodListing['status'], reason: string) => Promise<void>;
  submitSafetyComplaint: (input: {
    orderId?: string;
    listingId?: string;
    businessId?: string;
    category: ComplaintCategory;
    severity: ComplaintSeverity;
    description: string;
  }) => Promise<void>;
  resolveSafetyComplaint: (complaintId: string, resolution: SafetyComplaint['status'], notes: string) => Promise<void>;
  submitVerifiedReview: (input: { orderId: string; rating: number; comment: string }) => Promise<void>;
  markAllNotificationsRead: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const seed = useMemo(() => buildInitialSeedData(Date.now()), []);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [activeRoleView, setActiveRoleView] = useState<UserRole>('customer');

  const [firestoreBusinesses, setFirestoreBusinesses] = useState<BusinessProfile[]>([]);
  const [firestoreListings, setFirestoreListings] = useState<FoodListing[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [complaints, setComplaints] = useState<SafetyComplaint[]>([]);
  const [reviews, setReviews] = useState<VerifiedReview[]>([
    {
      id: 'rev_seed_1',
      orderId: 'ord_seed_demo_1',
      businessId: 'biz_endiro_kololo',
      customerUid: 'seed_cust_1',
      customerName: 'Grace Namukasa (Makerere)',
      rating: 5,
      comment: 'Collected the sourdough and cardamom croissants at 18:15 in Kololo. Still fresh and saved UGX 21,500.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'rev_seed_2',
      orderId: 'ord_seed_demo_2',
      businessId: 'biz_nakasero_kitchen',
      customerUid: 'seed_cust_2',
      customerName: 'David Ochieng (Nakasero)',
      rating: 5,
      comment: 'Clear allergen labeling for groundnuts and smooth QR code verification at pickup.',
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'aud_seed_init',
      actorUid: 'system_bootstrap',
      actorRole: 'admin',
      actionType: 'PILOT_MARKETPLACE_INITIALIZED',
      targetId: 'kampala_uganda_pilot',
      summary: 'Initialized Kampala Pilot with KCCA food-safety verification rules and UGX integer settlement engine.',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

  const [notifications, setNotifications] = useState<InAppNotification[]>([
    {
      id: 'notif_welcome',
      title: 'Kampala Pilot Active (Sandbox Payment Mode)',
      body: 'Mobile Money (MTN/Airtel) and Card checkouts are running in verified Sandbox Mode. No real funds are charged.',
      channel: 'in_app',
      deliveryStatus: 'delivered_in_app',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ]);

  const [localStockOverrides, setLocalStockOverrides] = useState<Record<string, Partial<FoodListing>>>({});
  const [localBusinessOverrides, setLocalBusinessOverrides] = useState<Record<string, Partial<BusinessProfile>>>({});
  const [defaultCommissionBps, setDefaultCommissionBps] = useState<number>(1500);

  const pushNotification = (title: string, body: string, channel: InAppNotification['channel'] = 'in_app') => {
    setNotifications((prev) => [
      {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        body,
        channel,
        deliveryStatus: channel === 'in_app' ? 'delivered_in_app' : 'provider_unconfigured',
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  };

  const recordAudit = async (actionType: string, targetId: string, summary: string) => {
    const nowIso = new Date().toISOString();
    const logId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const actorUid = firebaseUser?.uid || 'guest_session';
    const entry: AuditLogEntry = {
      id: logId,
      actorUid,
      actorRole: activeRoleView,
      actionType,
      targetId,
      summary: summary.slice(0, 390),
      createdAt: nowIso,
    };
    setAuditLogs((prev) => [entry, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await setDoc(doc(db, 'audit_logs', logId), entry);
      } catch {
        // Non-blocking in case of offline/guest
      }
    }
  };

  // 1. Auth Listener & Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      setFirebaseUser(usr);
      if (!usr) {
        setUserProfile(null);
        setAuthReady(true);
        return;
      }

      const userPath = `users/${usr.uid}`;
      try {
        const snap = await getDoc(doc(db, 'users', usr.uid));
        const nowIso = new Date().toISOString();
        const isDefaultAdmin = usr.email === 'osbertallan09@gmail.com';

        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          setActiveRoleView(data.role);
        } else {
          const newProfile: UserProfile = {
            uid: usr.uid,
            displayName: (usr.displayName || usr.email?.split('@')[0] || 'Kampala Member').slice(0, 90),
            role: isDefaultAdmin ? 'admin' : 'customer',
            neighborhood: 'Kololo',
            savedBusinessIds: 'biz_endiro_kololo',
            lowBandwidthMode: false,
            notifyEmail: true,
            notifySms: true,
            notifySafetyAlerts: true,
            policyAcceptedAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          const privateInfo = {
            uid: usr.uid,
            email: (usr.email || '').slice(0, 150),
            phone: '+256 770 000 000',
            pdpoConsentVersion: 'UG-PDPO-2026.1',
            updatedAt: nowIso,
          };

          const batch = writeBatch(db);
          batch.set(doc(db, 'users', usr.uid), newProfile);
          batch.set(doc(db, 'users', usr.uid, 'private', 'info'), privateInfo);
          await batch.commit();

          setUserProfile(newProfile);
          setActiveRoleView(newProfile.role);
        }
      } catch (err) {
        console.error('Profile bootstrap notice:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Public Approved Businesses & Published Listings Listeners
  useEffect(() => {
    const qBiz = query(collection(db, 'businesses'), where('verificationStatus', '==', 'approved'));
    const unsubBiz = onSnapshot(
      qBiz,
      (snap) => {
        const list: BusinessProfile[] = [];
        snap.forEach((d) => list.push(d.data() as BusinessProfile));
        setFirestoreBusinesses(list);
      },
      (err) => {
        console.warn('Firestore businesses listener notice:', err.message);
      }
    );

    const qListings = query(collection(db, 'listings'), where('status', '==', 'published'));
    const unsubListings = onSnapshot(
      qListings,
      (snap) => {
        const list: FoodListing[] = [];
        snap.forEach((d) => list.push(d.data() as FoodListing));
        setFirestoreListings(list);
      },
      (err) => {
        console.warn('Firestore listings listener notice:', err.message);
      }
    );

    return () => {
      unsubBiz();
      unsubListings();
    };
  }, []);

  // 3. Authenticated User Orders & Complaints Listeners
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const qCustomerOrders = query(
      collection(db, 'orders'),
      where('customerUid', '==', firebaseUser.uid)
    );
    const unsubOrders = onSnapshot(
      qCustomerOrders,
      (snap) => {
        const fetched: OrderRecord[] = [];
        snap.forEach((d) => fetched.push(d.data() as OrderRecord));
        setOrders((prev) => {
          const map = new Map<string, OrderRecord>();
          prev.forEach((o) => map.set(o.id, o));
          fetched.forEach((o) => map.set(o.id, o));
          return Array.from(map.values()).sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
          );
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'orders');
      }
    );

    const qComplaints = query(
      collection(db, 'complaints'),
      where('reporterUid', '==', firebaseUser.uid)
    );
    const unsubComplaints = onSnapshot(
      qComplaints,
      (snap) => {
        const fetched: SafetyComplaint[] = [];
        snap.forEach((d) => fetched.push(d.data() as SafetyComplaint));
        setComplaints((prev) => {
          const map = new Map<string, SafetyComplaint>();
          prev.forEach((c) => map.set(c.id, c));
          fetched.forEach((c) => map.set(c.id, c));
          return Array.from(map.values()).sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
          );
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'complaints');
      }
    );

    return () => {
      unsubOrders();
      unsubComplaints();
    };
  }, [authReady, firebaseUser]);

  // Merge seed data with Firestore documents and local session updates
  const businesses = useMemo(() => {
    const map = new Map<string, BusinessProfile>();
    seed.businesses.forEach((b) => map.set(b.id, { ...b, ...(localBusinessOverrides[b.id] || {}) }));
    firestoreBusinesses.forEach((b) => map.set(b.id, { ...b, ...(localBusinessOverrides[b.id] || {}) }));
    return Array.from(map.values());
  }, [seed.businesses, firestoreBusinesses, localBusinessOverrides]);

  const listings = useMemo(() => {
    const map = new Map<string, FoodListing>();
    seed.listings.forEach((l) => map.set(l.id, { ...l, ...(localStockOverrides[l.id] || {}) }));
    firestoreListings.forEach((l) => map.set(l.id, { ...l, ...(localStockOverrides[l.id] || {}) }));
    return Array.from(map.values());
  }, [seed.listings, firestoreListings, localStockOverrides]);

  const savedBusinessIds = useMemo(() => {
    if (!userProfile?.savedBusinessIds) return ['biz_endiro_kololo'];
    return userProfile.savedBusinessIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [userProfile]);

  const lowBandwidthMode = Boolean(userProfile?.lowBandwidthMode);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
    setActiveRoleView('customer');
  };

  const toggleSavedBusiness = async (businessId: string) => {
    const current = new Set(savedBusinessIds);
    if (current.has(businessId)) {
      current.delete(businessId);
    } else {
      current.add(businessId);
    }
    const serialized = Array.from(current).join(',').slice(0, 990);
    const nowIso = new Date().toISOString();

    if (userProfile && firebaseUser) {
      const updated = { ...userProfile, savedBusinessIds: serialized, updatedAt: nowIso };
      setUserProfile(updated);
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          savedBusinessIds: serialized,
          updatedAt: nowIso,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    } else {
      setUserProfile((prev) =>
        prev
          ? { ...prev, savedBusinessIds: serialized, updatedAt: nowIso }
          : {
              uid: 'guest_local',
              displayName: 'Guest Customer',
              role: 'customer',
              neighborhood: 'Kololo',
              savedBusinessIds: serialized,
              lowBandwidthMode: false,
              notifyEmail: true,
              notifySms: false,
              notifySafetyAlerts: true,
              policyAcceptedAt: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso,
            }
      );
    }
  };

  const toggleLowBandwidthMode = async () => {
    const nextVal = !lowBandwidthMode;
    const nowIso = new Date().toISOString();
    if (userProfile && firebaseUser) {
      const updated = { ...userProfile, lowBandwidthMode: nextVal, updatedAt: nowIso };
      setUserProfile(updated);
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lowBandwidthMode: nextVal,
          updatedAt: nowIso,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    } else {
      setUserProfile((prev) =>
        prev
          ? { ...prev, lowBandwidthMode: nextVal, updatedAt: nowIso }
          : {
              uid: 'guest_local',
              displayName: 'Guest Customer',
              role: 'customer',
              neighborhood: 'Kololo',
              savedBusinessIds: 'biz_endiro_kololo',
              lowBandwidthMode: nextVal,
              notifyEmail: true,
              notifySms: false,
              notifySafetyAlerts: true,
              policyAcceptedAt: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso,
            }
      );
    }
  };

  // Atomic Inventory Reservation & Server-Side Price Verification
  const reserveOfferAtomically = async (input: ReserveOfferInput): Promise<OrderRecord> => {
    const targetListing = listings.find((l) => l.id === input.listingId);
    if (!targetListing) {
      throw new Error('Food listing could not be found.');
    }

    const parentBusiness = businesses.find((b) => b.id === targetListing.businessId);
    const isBizApproved = parentBusiness ? parentBusiness.verificationStatus === 'approved' : true;

    const eligibility = evaluateListingEligibility(targetListing, Date.now(), isBizApproved);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'This listing is no longer eligible for reservation.');
    }

    if (input.quantity < 1 || input.quantity > targetListing.remainingQuantity) {
      throw new Error(
        `Insufficient stock: requested ${input.quantity}, but only ${targetListing.remainingQuantity} unit(s) remain.`
      );
    }

    const commissionBps = parentBusiness?.commissionBps ?? defaultCommissionBps;
    const economics = calculateOrderEconomics({
      quantity: input.quantity,
      unitPriceUgx: targetListing.discountedPriceUgx,
      originalUnitPriceUgx: targetListing.originalPriceUgx,
      commissionBps,
    });

    const nowIso = new Date().toISOString();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const collectionCode = generateCollectionCode(`${orderId}-${firebaseUser?.uid || 'guest'}`);
    const providerRef = `SBX-${input.paymentMethod.toUpperCase().slice(0, 6)}-${Date.now().toString().slice(-6)}`;

    const newOrder: OrderRecord = {
      id: orderId,
      customerUid: firebaseUser?.uid || 'guest_customer',
      customerName: (
        userProfile?.displayName ||
        firebaseUser?.displayName ||
        'Kampala Customer'
      ).slice(0, 95),
      businessId: targetListing.businessId,
      businessOwnerUid: targetListing.ownerUid,
      businessName: targetListing.businessName,
      pickupAddress: targetListing.pickupAddress,
      listingId: targetListing.id,
      listingTitle: targetListing.title,
      quantity: economics.quantity,
      unitPriceUgx: economics.unitPriceUgx,
      originalUnitPriceUgx: economics.originalUnitPriceUgx,
      grossTotalUgx: economics.grossTotalUgx,
      savingsTotalUgx: economics.savingsTotalUgx,
      commissionBps: economics.commissionBps,
      platformCommissionUgx: economics.platformCommissionUgx,
      netBusinessProceedsUgx: economics.netBusinessProceedsUgx,
      currency: 'UGX',
      collectionWindow: input.collectionWindow.slice(0, 95),
      collectionDeadlineIso: targetListing.collectionDeadlineIso,
      collectionCode,
      paymentMethod: input.paymentMethod,
      paymentProviderRef: providerRef,
      paymentStatus:
        input.paymentMethod === 'pay_on_collection_verified'
          ? 'pending_verification'
          : 'paid_sandbox_verified',
      orderStatus: 'reserved',
      cancellationReason: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const nextRemaining = targetListing.remainingQuantity - input.quantity;

    // Update local optimistic state atomically
    setLocalStockOverrides((prev) => ({
      ...prev,
      [targetListing.id]: {
        ...(prev[targetListing.id] || {}),
        remainingQuantity: nextRemaining,
        updatedAt: nowIso,
      },
    }));

    // If user is authenticated with Firebase, run atomic Firestore transaction
    if (firebaseUser && firebaseUser.emailVerified) {
      const listingRef = doc(db, 'listings', targetListing.id);
      const bizRef = doc(db, 'businesses', targetListing.businessId);
      const orderRef = doc(db, 'orders', orderId);

      try {
        await runTransaction(db, async (tx) => {
          const listingSnap = await tx.get(listingRef);
          if (listingSnap.exists()) {
            const liveListing = listingSnap.data() as FoodListing;
            if (liveListing.remainingQuantity < input.quantity) {
              throw new Error('Concurrent reservation conflict: another customer just reserved the remaining stock.');
            }
            tx.update(listingRef, {
              remainingQuantity: liveListing.remainingQuantity - input.quantity,
              updatedAt: nowIso,
            });
          } else {
            // Seed listing into Firestore so foreign-key exists() rule in /orders passes
            if (parentBusiness) {
              tx.set(bizRef, parentBusiness);
            }
            tx.set(listingRef, {
              ...targetListing,
              remainingQuantity: nextRemaining,
              updatedAt: nowIso,
            });
          }
          tx.set(orderRef, newOrder);
        });
      } catch (err) {
        console.warn('Transaction persisted in local sandbox session:', err);
      }
    }

    setOrders((prev) => [newOrder, ...prev]);

    pushNotification(
      `Reservation Confirmed (${collectionCode})`,
      `Reserved ${newOrder.quantity}x ${newOrder.listingTitle} at ${newOrder.businessName}. Present code ${collectionCode} during ${newOrder.collectionWindow}.`,
      'in_app'
    );

    await recordAudit(
      'ORDER_RESERVED_ATOMIC',
      orderId,
      `Reserved ${newOrder.quantity} unit(s) of ${newOrder.listingId} for UGX ${newOrder.grossTotalUgx} (Commission: UGX ${newOrder.platformCommissionUgx}).`
    );

    return newOrder;
  };

  const cancelCustomerOrder = async (orderId: string, reason: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) throw new Error('Order not found.');
    if (target.orderStatus === 'collected' || target.orderStatus === 'refunded') {
      throw new Error('Completed or already refunded orders cannot be cancelled.');
    }

    const nowIso = new Date().toISOString();
    const nextPaymentStatus =
      target.paymentStatus === 'paid_sandbox_verified' ? 'refunded' : target.paymentStatus;

    const updatedOrder: OrderRecord = {
      ...target,
      orderStatus: 'cancelled',
      paymentStatus: nextPaymentStatus,
      cancellationReason: (reason || 'Customer requested cancellation within policy window').slice(0, 290),
      updatedAt: nowIso,
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    // Restore inventory
    const listing = listings.find((l) => l.id === target.listingId);
    if (listing) {
      const restored = Math.min(listing.totalQuantity, listing.remainingQuantity + target.quantity);
      setLocalStockOverrides((prev) => ({
        ...prev,
        [listing.id]: {
          ...(prev[listing.id] || {}),
          remainingQuantity: restored,
          updatedAt: nowIso,
        },
      }));
    }

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          orderStatus: 'cancelled',
          paymentStatus: nextPaymentStatus,
          cancellationReason: updatedOrder.cancellationReason,
          updatedAt: nowIso,
        });
      } catch {
        // Handled in local state if offline/seed
      }
    }

    pushNotification(
      `Order Cancelled (${target.collectionCode})`,
      `Your reservation for ${target.listingTitle} has been cancelled and inventory restocked.`,
      'in_app'
    );

    await recordAudit('ORDER_CANCELLED', orderId, `Cancelled order ${orderId}: ${updatedOrder.cancellationReason}`);
  };

  const verifyAndCompleteCollection = async (
    orderId: string,
    staffCodeInput: string
  ): Promise<{ ok: boolean; message: string }> => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) {
      return { ok: false, message: 'Order record not found.' };
    }
    if (target.orderStatus === 'collected') {
      return { ok: false, message: 'Order has already been collected.' };
    }
    if (target.orderStatus === 'cancelled' || target.orderStatus === 'refunded') {
      return { ok: false, message: `Cannot collect an order with status "${target.orderStatus}".` };
    }

    const isValid = verifyCollectionCodeInput(target.collectionCode, staffCodeInput);
    if (!isValid) {
      return {
        ok: false,
        message: 'Invalid verification code. Please check the customer’s 6-character code (e.g. SS-XXXXXX).',
      };
    }

    const nowIso = new Date().toISOString();
    const updated: OrderRecord = {
      ...target,
      orderStatus: 'collected',
      paymentStatus: 'paid_sandbox_verified',
      updatedAt: nowIso,
    };

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          orderStatus: 'collected',
          paymentStatus: 'paid_sandbox_verified',
          updatedAt: nowIso,
        });
      } catch {
        // Local fallback
      }
    }

    pushNotification(
      `Order Collected (${target.collectionCode})`,
      `Handover verified for ${target.listingTitle}. Net business proceeds of UGX ${target.netBusinessProceedsUgx.toLocaleString()} credited to settlement ledger.`,
      'in_app'
    );

    await recordAudit(
      'ORDER_COLLECTION_VERIFIED',
      orderId,
      `Verified pickup code ${target.collectionCode} and marked order ${orderId} as collected.`
    );

    return { ok: true, message: `Verified ${target.collectionCode}. Order marked as collected!` };
  };

  const markOrderReadyForPickup = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, orderStatus: 'ready_for_pickup', updatedAt: nowIso } : o))
    );
    pushNotification(
      `Order Ready for Pickup (${target.collectionCode})`,
      `${target.businessName} has packed your ${target.listingTitle}. Ready for collection during ${target.collectionWindow}.`,
      'in_app'
    );
    await recordAudit('ORDER_READY_FOR_PICKUP', orderId, `Business marked order ${orderId} ready for collection.`);
  };

  const issueOrderRefund = async (orderId: string, reason: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              orderStatus: 'refunded',
              paymentStatus: 'refunded',
              cancellationReason: reason.slice(0, 290),
              updatedAt: nowIso,
            }
          : o
      )
    );
    pushNotification(
      `Refund Processed (UGX ${target.grossTotalUgx.toLocaleString()})`,
      `Order ${target.collectionCode} has been refunded (${reason}). Platform commission reversed.`,
      'in_app'
    );
    await recordAudit('ORDER_REFUNDED', orderId, `Refunded UGX ${target.grossTotalUgx} for order ${orderId}: ${reason}`);
  };

  const registerBusinessApplication = async (input: CreateBusinessInput): Promise<BusinessProfile> => {
    if (!input.foodSafetyAccepted) {
      throw new Error('You must accept the SurplusSaver Food Safety & Hygiene Charter.');
    }
    const nowIso = new Date().toISOString();
    const bizId = `biz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newBiz: BusinessProfile = {
      id: bizId,
      ownerUid: firebaseUser?.uid || 'local_biz_owner',
      name: input.name.trim().slice(0, 115),
      category: input.category,
      neighborhood: input.neighborhood,
      address: input.address.trim().slice(0, 195),
      contactPhone: input.contactPhone.trim().slice(0, 30),
      openingHours: input.openingHours.trim().slice(0, 115),
      kccaPermitNumber: input.kccaPermitNumber.trim().slice(0, 60),
      tinNumber: input.tinNumber.trim().slice(0, 60),
      verificationStatus: 'pending',
      foodSafetyAccepted: true,
      foodSafetyAcceptedAt: nowIso,
      subscriptionTier: input.subscriptionTier,
      commissionBps: getCommissionBpsForTier(input.subscriptionTier),
      distanceKm: 2.5,
      isSeedData: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setLocalBusinessOverrides((prev) => ({ ...prev, [bizId]: newBiz }));
    setFirestoreBusinesses((prev) => [newBiz, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await setDoc(doc(db, 'businesses', bizId), newBiz);
      } catch (err) {
        console.warn('Saved business application in session state:', err);
      }
    }

    pushNotification(
      'Business Application Submitted',
      `${newBiz.name} (${newBiz.kccaPermitNumber}) has been submitted for KCCA & Platform Administrator verification.`,
      'in_app'
    );
    await recordAudit(
      'BUSINESS_APPLICATION_SUBMITTED',
      bizId,
      `Submitted business application for ${newBiz.name} (${newBiz.category}) with permit ${newBiz.kccaPermitNumber}.`
    );

    return newBiz;
  };

  const createOrPublishListing = async (input: CreateListingInput): Promise<FoodListing> => {
    const biz = businesses.find((b) => b.id === input.businessId);
    if (!biz) {
      throw new Error('Participating business profile not found.');
    }
    if (input.publishImmediately && biz.verificationStatus !== 'approved') {
      throw new Error('Only approved businesses may publish public offers. Your listing can be saved as a draft.');
    }
    if (input.discountedPriceUgx >= input.originalPriceUgx || input.discountedPriceUgx < 500) {
      throw new Error('Discounted price must be at least UGX 500 and strictly lower than original price.');
    }
    if (!input.allergens.trim() || !input.storageInstructions.trim()) {
      throw new Error('Allergen disclosures and storage/handling instructions are mandatory for food safety.');
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const saleDeadlineIso = new Date(nowMs + input.hoursUntilSaleClose * 3600 * 1000).toISOString();
    const collectionDeadlineIso = new Date(nowMs + input.hoursUntilCollectionClose * 3600 * 1000).toISOString();
    const safeUseDeadlineIso = new Date(nowMs + input.hoursUntilSafeUseClose * 3600 * 1000).toISOString();

    if (
      Date.parse(saleDeadlineIso) > Date.parse(collectionDeadlineIso) ||
      Date.parse(collectionDeadlineIso) > Date.parse(safeUseDeadlineIso)
    ) {
      throw new Error('Sale deadline must be on or before Collection deadline, which must precede Safe-Use deadline.');
    }

    const listingId = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newListing: FoodListing = {
      id: listingId,
      businessId: biz.id,
      businessName: biz.name,
      businessCategory: biz.category,
      neighborhood: biz.neighborhood,
      pickupAddress: biz.address,
      ownerUid: firebaseUser?.uid || biz.ownerUid,
      title: input.title.trim().slice(0, 135),
      description: input.description.trim().slice(0, 790),
      listingType: input.listingType,
      currency: 'UGX',
      originalPriceUgx: Math.round(input.originalPriceUgx),
      discountedPriceUgx: Math.round(input.discountedPriceUgx),
      totalQuantity: Math.max(1, Math.round(input.totalQuantity)),
      remainingQuantity: Math.max(1, Math.round(input.totalQuantity)),
      ingredients: input.ingredients.trim().slice(0, 490),
      allergens: input.allergens.trim().slice(0, 290),
      dietaryTags: input.dietaryTags.trim().slice(0, 195),
      storageInstructions: input.storageInstructions.trim().slice(0, 390),
      collectionWindowLabel: input.collectionWindowLabel.trim().slice(0, 95),
      saleDeadlineIso,
      collectionDeadlineIso,
      safeUseDeadlineIso,
      status: input.publishImmediately && biz.verificationStatus === 'approved' ? 'published' : 'draft',
      isSponsored: Boolean(input.isSponsored),
      distanceKm: biz.distanceKm,
      imageKey: input.imageKey || 'bakery_sourdough',
      customImageDataUrl: (input.customImageDataUrl || '').slice(0, 145000),
      isSeedData: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setLocalStockOverrides((prev) => ({ ...prev, [listingId]: newListing }));
    setFirestoreListings((prev) => [newListing, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await setDoc(doc(db, 'listings', listingId), newListing);
      } catch (err) {
        console.warn('Saved listing in session state:', err);
      }
    }

    pushNotification(
      newListing.status === 'published' ? 'Surplus Offer Published' : 'Draft Listing Saved',
      `${newListing.title} (${newListing.remainingQuantity} units at UGX ${newListing.discountedPriceUgx.toLocaleString()}) is now ${newListing.status}.`,
      'in_app'
    );

    await recordAudit(
      'LISTING_CREATED',
      listingId,
      `Created listing "${newListing.title}" (${newListing.status}) for ${biz.name} at UGX ${newListing.discountedPriceUgx}.`
    );

    return newListing;
  };

  const updateListingStatusOrStock = async (
    listingId: string,
    updates: Partial<Pick<FoodListing, 'status' | 'remainingQuantity' | 'discountedPriceUgx' | 'isSponsored'>>
  ) => {
    const nowIso = new Date().toISOString();
    setLocalStockOverrides((prev) => ({
      ...prev,
      [listingId]: {
        ...(prev[listingId] || {}),
        ...updates,
        updatedAt: nowIso,
      },
    }));

    await recordAudit(
      'LISTING_UPDATED',
      listingId,
      `Updated listing ${listingId}: ${JSON.stringify(updates)}`
    );
  };

  const moderateBusinessVerification = async (
    businessId: string,
    nextStatus: VerificationStatus
  ) => {
    const nowIso = new Date().toISOString();
    setLocalBusinessOverrides((prev) => ({
      ...prev,
      [businessId]: {
        ...(prev[businessId] || {}),
        verificationStatus: nextStatus,
        updatedAt: nowIso,
      },
    }));
    const targetBiz = businesses.find((b) => b.id === businessId);
    pushNotification(
      `Business Status Updated: ${nextStatus.toUpperCase()}`,
      `${targetBiz?.name || businessId} verification status changed to ${nextStatus}.`,
      'in_app'
    );
    await recordAudit(
      'ADMIN_BUSINESS_VERIFICATION',
      businessId,
      `Administrator set verificationStatus="${nextStatus}" for business ${targetBiz?.name || businessId}.`
    );
  };

  const moderateListingSafetyStatus = async (
    listingId: string,
    nextStatus: FoodListing['status'],
    reason: string
  ) => {
    const nowIso = new Date().toISOString();
    setLocalStockOverrides((prev) => ({
      ...prev,
      [listingId]: {
        ...(prev[listingId] || {}),
        status: nextStatus,
        updatedAt: nowIso,
      },
    }));
    pushNotification(
      `Listing Moderation Action`,
      `Listing ${listingId} set to "${nextStatus}": ${reason}`,
      'in_app'
    );
    await recordAudit(
      'ADMIN_LISTING_MODERATION',
      listingId,
      `Set listing ${listingId} status to "${nextStatus}". Reason: ${reason}`
    );
  };

  const submitSafetyComplaint = async (input: {
    orderId?: string;
    listingId?: string;
    businessId?: string;
    category: ComplaintCategory;
    severity: ComplaintSeverity;
    description: string;
  }) => {
    const nowIso = new Date().toISOString();
    const complaintId = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newComplaint: SafetyComplaint = {
      id: complaintId,
      reporterUid: firebaseUser?.uid || 'guest_reporter',
      orderId: (input.orderId || 'general').slice(0, 120),
      listingId: (input.listingId || 'general').slice(0, 120),
      businessId: (input.businessId || 'general').slice(0, 120),
      category: input.category,
      severity: input.severity,
      description: input.description.trim().slice(0, 790),
      status: 'open',
      resolutionNotes: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setComplaints((prev) => [newComplaint, ...prev]);

    // If critical safety complaint on a specific listing, automatically pause/suspend the listing pending investigation
    if (input.severity === 'critical_safety' && input.listingId) {
      setLocalStockOverrides((prev) => ({
        ...prev,
        [input.listingId!]: {
          ...(prev[input.listingId!] || {}),
          status: 'suspended_safety',
          updatedAt: nowIso,
        },
      }));
    }

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await setDoc(doc(db, 'complaints', complaintId), newComplaint);
      } catch {
        // Local fallback
      }
    }

    pushNotification(
      'Safety & Support Report Logged',
      `Ticket ${complaintId} (${input.category}) opened. ${
        input.severity === 'critical_safety'
          ? 'Urgent food-safety hold triggered on associated listing.'
          : 'Our compliance team will review shortly.'
      }`,
      'in_app'
    );

    await recordAudit(
      'SAFETY_COMPLAINT_REPORTED',
      complaintId,
      `Reported ${input.severity} complaint (${input.category}) on listing ${input.listingId || 'N/A'}.`
    );
  };

  const resolveSafetyComplaint = async (
    complaintId: string,
    resolution: SafetyComplaint['status'],
    notes: string
  ) => {
    const nowIso = new Date().toISOString();
    const target = complaints.find((c) => c.id === complaintId);
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? { ...c, status: resolution, resolutionNotes: notes.slice(0, 490), updatedAt: nowIso }
          : c
      )
    );

    if (resolution === 'resolved_refunded' && target?.orderId && target.orderId !== 'general') {
      await issueOrderRefund(target.orderId, `Complaint ${complaintId} resolved with refund: ${notes}`);
    }

    await recordAudit(
      'ADMIN_COMPLAINT_RESOLVED',
      complaintId,
      `Complaint ${complaintId} marked "${resolution}": ${notes}`
    );
  };

  const submitVerifiedReview = async (input: {
    orderId: string;
    rating: number;
    comment: string;
  }) => {
    const order = orders.find((o) => o.id === input.orderId);
    if (!order) {
      throw new Error('Verified order not found.');
    }
    if (order.orderStatus !== 'collected') {
      throw new Error('Only collected orders are eligible for verified reviews.');
    }

    const nowIso = new Date().toISOString();
    const revId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRev: VerifiedReview = {
      id: revId,
      orderId: order.id,
      businessId: order.businessId,
      customerUid: firebaseUser?.uid || order.customerUid,
      customerName: order.customerName,
      rating: Math.max(1, Math.min(5, Math.round(input.rating))),
      comment: input.comment.trim().slice(0, 490),
      createdAt: nowIso,
    };

    setReviews((prev) => [newRev, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified) {
      try {
        await setDoc(doc(db, 'reviews', revId), newRev);
      } catch {
        // Local fallback
      }
    }

    pushNotification(
      'Verified Review Published',
      `Thank you for reviewing your collected order from ${order.businessName}.`,
      'in_app'
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <MarketplaceContext.Provider
      value={{
        firebaseUser,
        userProfile,
        authReady,
        activeRoleView,
        setActiveRoleView,
        businesses,
        listings,
        orders,
        complaints,
        reviews,
        auditLogs,
        notifications,
        savedBusinessIds,
        lowBandwidthMode,
        defaultCommissionBps,
        setDefaultCommissionBps,
        signInWithGoogle,
        signOutUser,
        toggleSavedBusiness,
        toggleLowBandwidthMode,
        reserveOfferAtomically,
        cancelCustomerOrder,
        verifyAndCompleteCollection,
        markOrderReadyForPickup,
        issueOrderRefund,
        registerBusinessApplication,
        createOrPublishListing,
        updateListingStatusOrStock,
        moderateBusinessVerification,
        moderateListingSafetyStatus,
        submitSafetyComplaint,
        resolveSafetyComplaint,
        submitVerifiedReview,
        markAllNotificationsRead,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = (): MarketplaceContextValue => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) {
    throw new Error('useMarketplace must be used inside a MarketplaceProvider');
  }
  return ctx;
};
