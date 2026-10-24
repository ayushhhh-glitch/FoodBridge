/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Building2,
  PlusCircle,
  Scale,
  CalendarClock,
  Layers,
  Activity,
  BarChart3,
  Globe,
  RotateCcw,
  ShieldCheck,
  Database,
} from 'lucide-react';
import {
  type DonationFormInput,
  type DonationStatus,
  type DonorVerificationProfile,
  type FoodDonation,
  type NGOProfile,
  type FirestoreDonationDoc,
  type FirestoreReservationDoc,
  type FirestorePickupScheduleDoc,
  PUNE_NEIGHBORHOOD_COORDS,
  advanceDonationStatus,
  getRankedNgoMatches,
  hydrateDonationsFromFirestore,
  reserveDonationQuantity,
  scheduleDonationPickup,
} from './utils/matchingEngine';
import { createPuneNgos, createPuneSampleDonations } from './data/puneSeedData';
import { LandingWebsite } from './components/LandingWebsite';
import { DonorDashboardView, NgoDashboardView } from './components/RoleDashboards';
import { CreateDonationView } from './components/CreateDonationView';
import { MatchingAndScheduleView } from './components/MatchingAndScheduleView';
import {
  ImpactDashboardView,
  InventoryDashboardView,
} from './components/InventoryAndImpactView';
import {
  auth,
  onAuthStateChanged,
  fetchUserProfile,
  createOrEnsureUserProfile,
  updateUserVerificationInFirestore,
  testFirestoreConnection,
  createDonationInFirestore,
  ensureDonationExistsInFirestore,
  reserveDonationWithTransaction,
  schedulePickupWithTransaction,
  collectDonationWithTransaction,
  subscribeToLiveFoodBridgeCollections,
  FIREBASE_PROJECT_ID,
  type FirebaseUser,
  type FoodBridgeUserProfile,
  type ConnectionCheckResult,
} from './firebase';
import { FirebaseAuthModal } from './components/FirebaseAuthModal';

const STORAGE_KEY_DONATIONS = 'foodbridge_delhi_ncr_donations_v3';
const STORAGE_KEY_NGOS = 'foodbridge_delhi_ncr_ngos_v3';
const STORAGE_KEY_VERIFICATION = 'foodbridge_delhi_verification_v3';

const DEFAULT_DONOR_VERIFICATION: DonorVerificationProfile = {
  organizationCategory: 'Institutional',
  documentType: 'Authorized College / Hostel ID',
  documentNumber: 'INST-DU-DELHI-2026-8841',
  documentFileName: 'du_central_hostel_compliance_certificate.pdf',
  documentPreviewUrl: '',
  verificationStatus: 'verified',
  contactPerson: 'Prof. Arvind Sharma',
  contactPhone: '+91 98110 44210',
  contactEmail: 'arvind.sharma@du-hostel.edu.in',
  pickupGateAddress: 'Gate 2 Mess Loading Bay, Chhatra Marg, University Enclave, Delhi 110007',
  updatedAtISO: new Date().toISOString(),
};

export type WorkspaceTab =
  | 'donor-dashboard'
  | 'ngo-dashboard'
  | 'create-donation'
  | 'matching'
  | 'pickup-scheduling'
  | 'inventory'
  | 'status-tracking'
  | 'impact';

export default function App() {
  const [surface, setSurface] = useState<'website' | 'app'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? 'app' : 'website';
  });

  const [role, setRole] = useState<'donor' | 'ngo'>('donor');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('donor-dashboard');

  // Firebase Auth & Connection Verification State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<FoodBridgeUserProfile | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionCheckResult | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Data Source Mode: 'firestore' (live onSnapshot + runTransaction when signed in) vs 'demo' (localStorage fallback)
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Live Firestore Collection Snapshots (Step 2)
  const [liveDonationDocs, setLiveDonationDocs] = useState<FirestoreDonationDoc[]>([]);
  const [liveReservationDocs, setLiveReservationDocs] = useState<FirestoreReservationDoc[]>([]);
  const [liveScheduleDocs, setLiveScheduleDocs] = useState<FirestorePickupScheduleDoc[]>([]);
  const [firestoreSyncError, setFirestoreSyncError] = useState<string | null>(null);

  const runFirestorePing = async () => {
    const res = await testFirestoreConnection();
    setConnectionStatus(res);
  };

  useEffect(() => {
    runFirestorePing();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsDemoMode(false);
        try {
          let profile = await fetchUserProfile(user.uid);
          if (!profile) {
            profile = await createOrEnsureUserProfile({
              uid: user.uid,
              email: user.email || 'partner@foodbridge.org',
              displayName:
                user.displayName || user.email?.split('@')[0] || 'FoodBridge Partner',
              organizationName: 'Delhi NCR Community Partner',
              accountRole: 'donor',
              area: 'Connaught Place, Central Delhi',
            });
          }
          setUserProfile(profile);
          if (profile?.accountRole) {
            setRole(profile.accountRole);
          }
        } catch {
          // Profile can be completed in modal if needed
        }
      } else {
        setUserProfile(null);
        setIsDemoMode(true);
        setLiveDonationDocs([]);
        setLiveReservationDocs([]);
        setLiveScheduleDocs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Step 2: Real-Time onSnapshot Listeners for donations, reservations, and pickupSchedules
  useEffect(() => {
    if (!firebaseUser) return;
    setFirestoreSyncError(null);
    const unsubscribeSnapshots = subscribeToLiveFoodBridgeCollections(
      firebaseUser.uid,
      (payload) => {
        setLiveDonationDocs(payload.donations);
        setLiveReservationDocs(payload.reservations);
        setLiveScheduleDocs(payload.schedules);
      }
    );
    return () => {
      unsubscribeSnapshots();
    };
  }, [firebaseUser]);

  const [ngos, setNgos] = useState<NGOProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NGOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return createPuneNgos();
  });

  const [donorVerificationProfile, setDonorVerificationProfile] =
    useState<DonorVerificationProfile>(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_VERIFICATION);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.verificationStatus) return parsed;
        }
      } catch {
        // ignore storage errors
      }
      return DEFAULT_DONOR_VERIFICATION;
    });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_VERIFICATION,
        JSON.stringify(donorVerificationProfile)
      );
    } catch {
      // ignore quota errors
    }
  }, [donorVerificationProfile]);

  const handleUpdateDonorVerification = (updated: DonorVerificationProfile) => {
    setDonorVerificationProfile(updated);
    // Mirror verification status & contact details onto active donor batches
    setLocalDonations((prev) =>
      prev.map((d) => ({
        ...d,
        donorVerificationStatus: updated.verificationStatus,
        donorOrganizationCategory: updated.organizationCategory,
        donorDocumentType: updated.documentType,
        donorDocumentNumber: updated.documentNumber,
        donorPhone: updated.contactPhone,
        donorEmail: updated.contactEmail,
        pickupGateAddress: updated.pickupGateAddress,
      }))
    );

    if (firebaseUser) {
      updateUserVerificationInFirestore(firebaseUser.uid, updated).catch((err) => {
        setFirestoreSyncError(
          err instanceof Error
            ? err.message
            : 'Could not sync verification profile to Firestore.'
        );
      });
    }
  };

  const [localDonations, setLocalDonations] = useState<FoodDonation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DONATIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return createPuneSampleDonations(Date.now());
  });

  // Hydrate Firestore snapshots into FoodDonation objects and merge with /users/{donorId} profile & fallback catalog
  const hydratedFirestoreDonations = useMemo(() => {
    return hydrateDonationsFromFirestore(
      liveDonationDocs,
      liveReservationDocs,
      liveScheduleDocs,
      ngos,
      Date.now(),
      userProfile
    );
  }, [liveDonationDocs, liveReservationDocs, liveScheduleDocs, ngos, userProfile]);

  const donations = useMemo(() => {
    if (isDemoMode || !firebaseUser) {
      return localDonations;
    }
    // In Live Firestore Mode: live Firestore documents take precedence by ID,
    // followed by any remaining Pune seed batches so the map/charts remain rich.
    const liveIds = new Set(hydratedFirestoreDonations.map((d) => d.id));
    const remainingLocal = localDonations.filter((d) => !liveIds.has(d.id));
    return [...hydratedFirestoreDonations, ...remainingLocal];
  }, [isDemoMode, firebaseUser, hydratedFirestoreDonations, localDonations]);

  const [selectedDonationId, setSelectedDonationId] = useState<string>(
    () => donations[0]?.id || 'don-pune-101'
  );
  const [activeNgoId, setActiveNgoId] = useState<string>(
    () => ngos[0]?.id || 'ngo-pune-1'
  );

  // Persist localDonations to localStorage & listen for cross-tab storage events
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(localDonations));
    } catch {
      // ignore quota errors
    }
  }, [localDonations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NGOS, JSON.stringify(ngos));
    } catch {
      // ignore quota errors
    }
  }, [ngos]);

  useEffect(() => {
    const onStorageSync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DONATIONS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setLocalDonations(parsed);
        } catch {
          // ignore parse error
        }
      }
    };
    window.addEventListener('storage', onStorageSync);
    return () => window.removeEventListener('storage', onStorageSync);
  }, []);

  // Live ticker every 30s to refresh countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleEnterApp = (
    targetRole: 'donor' | 'ngo',
    targetTab?: string,
    donationId?: string,
    ngoId?: string
  ) => {
    setRole(targetRole);
    if (donationId) {
      setSelectedDonationId(donationId);
    }
    if (ngoId) {
      setActiveNgoId(ngoId);
    }
    if (targetTab) {
      setActiveTab(targetTab as WorkspaceTab);
    } else {
      setActiveTab(targetRole === 'donor' ? 'donor-dashboard' : 'ngo-dashboard');
    }
    setSurface('app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleSwitch = (newRole: 'donor' | 'ngo') => {
    setRole(newRole);
    setActiveTab(newRole === 'donor' ? 'donor-dashboard' : 'ngo-dashboard');
  };

  const handleResetDemoData = () => {
    const freshNgos = createPuneNgos();
    const freshDonations = createPuneSampleDonations(Date.now());
    setNgos(freshNgos);
    setLocalDonations(freshDonations);
    setSelectedDonationId(freshDonations[0].id);
    setActiveNgoId(freshNgos[0].id);
    localStorage.setItem(STORAGE_KEY_NGOS, JSON.stringify(freshNgos));
    localStorage.setItem(STORAGE_KEY_DONATIONS, JSON.stringify(freshDonations));
  };

  const handleCreateDonation = (input: DonationFormInput): FoodDonation => {
    const nowMs = Date.now();
    const donationId = `don_pune_${nowMs}`;
    const coords = PUNE_NEIGHBORHOOD_COORDS[input.locationArea] || {
      lat: 28.6139,
      lng: 77.2090,
    };

    const newDonation: FoodDonation = {
      id: donationId,
      donorName: input.donorName,
      organizationName: input.organizationName,
      donorType: input.donorType || 'Hostel / Canteen',
      foodName: input.foodName,
      category: input.category,
      originalQuantity: input.quantityMeals,
      availableQuantity: input.quantityMeals,
      reservedQuantity: 0,
      collectedQuantity: 0,
      preparationTimeISO: input.preparationTimeISO,
      expiryTimeISO: input.expiryTimeISO,
      pickupWindowStartISO: input.pickupWindowStartISO,
      pickupWindowEndISO: input.pickupWindowEndISO,
      locationArea: input.locationArea,
      address: input.address || input.locationArea,
      lat: coords.lat,
      lng: coords.lng,
      storageCondition: input.storageCondition,
      status: 'Matched',
      imageUrl: input.imageUrl,
      notes: input.notes,
      donorVerificationStatus: donorVerificationProfile.verificationStatus,
      donorOrganizationCategory: donorVerificationProfile.organizationCategory,
      donorDocumentType: donorVerificationProfile.documentType,
      donorDocumentNumber: donorVerificationProfile.documentNumber,
      donorPhone: donorVerificationProfile.contactPhone,
      donorEmail: donorVerificationProfile.contactEmail,
      pickupGateAddress:
        input.address || donorVerificationProfile.pickupGateAddress || input.locationArea,
      isDemoData: false,
      reservations: [],
      statusHistory: [
        {
          status: 'Listed',
          timestampISO: new Date(nowMs).toISOString(),
          actor: input.organizationName,
          note: `Listed ${input.quantityMeals} meals (${input.category}).`,
        },
      ],
    };

    const topMatch = getRankedNgoMatches(newDonation, ngos, nowMs).find(
      (m) => m.eligible
    );
    if (topMatch) {
      newDonation.matchedNgoId = topMatch.ngo.id;
      newDonation.matchedNgoName = topMatch.ngo.name;
      newDonation.statusHistory.push({
        status: 'Matched',
        timestampISO: new Date(nowMs).toISOString(),
        actor: 'FoodBridge Smart Matcher',
        note: `Top recommended partner: ${topMatch.ngo.name} (${topMatch.totalScore}% compatibility score).`,
      });
    }

    setLocalDonations((prev) => [newDonation, ...prev]);
    setSelectedDonationId(newDonation.id);

    // Step 2: Persist to Cloud Firestore /donations/{donationId} when Live Firestore mode is active
    if (!isDemoMode && firebaseUser) {
      createDonationInFirestore(
        input,
        firebaseUser.uid,
        donationId,
        donorVerificationProfile
      ).catch((err) => {
        setFirestoreSyncError(
          err instanceof Error ? err.message : 'Failed to write donation to Firestore.'
        );
      });
    }

    return newDonation;
  };

  const handleReserveMeals = (
    donationId: string,
    ngoId: string,
    meals: number
  ): { success: boolean; error?: string } => {
    const targetDonation = donations.find((d) => d.id === donationId);
    const targetNgo = ngos.find((n) => n.id === ngoId);
    if (!targetDonation || !targetNgo) {
      return { success: false, error: 'Donation or NGO record not found.' };
    }

    const result = reserveDonationQuantity(
      targetDonation,
      targetNgo,
      meals,
      Date.now()
    );
    if (!result.success || !result.updatedDonation) {
      return { success: false, error: result.error };
    }

    setLocalDonations((prev) =>
      prev.map((d) => (d.id === donationId ? result.updatedDonation! : d))
    );
    setNgos((prev) =>
      prev.map((n) =>
        n.id === ngoId
          ? { ...n, currentLoadMeals: n.currentLoadMeals + meals }
          : n
      )
    );

    // Step 2: Execute Atomic Firestore Transaction (runTransaction) on donations & reservations
    if (!isDemoMode && firebaseUser) {
      (async () => {
        try {
          await ensureDonationExistsInFirestore({
            id: targetDonation.id,
            donorUid: firebaseUser.uid,
            donorName: targetDonation.donorName,
            organizationName: targetDonation.organizationName,
            foodName: targetDonation.foodName,
            category: targetDonation.category,
            originalQuantity: targetDonation.originalQuantity,
            storageCondition: targetDonation.storageCondition,
            locationArea: targetDonation.locationArea,
            expiryTimeISO: targetDonation.expiryTimeISO,
            pickupWindowStartISO: targetDonation.pickupWindowStartISO,
            pickupWindowEndISO: targetDonation.pickupWindowEndISO,
            donorPhone: targetDonation.donorPhone,
            donorEmail: targetDonation.donorEmail,
            pickupGateAddress: targetDonation.pickupGateAddress || targetDonation.address,
            donorVerificationStatus: targetDonation.donorVerificationStatus,
            donorOrganizationCategory: targetDonation.donorOrganizationCategory,
            donorDocumentType: targetDonation.donorDocumentType,
          });
          await reserveDonationWithTransaction({
            donationId: targetDonation.id,
            ngoUid: firebaseUser.uid,
            ngoName: userProfile?.organizationName || targetNgo.name,
            mealsToReserve: meals,
          });
        } catch (err) {
          setFirestoreSyncError(
            err instanceof Error
              ? err.message
              : 'Firestore reservation transaction failed.'
          );
        }
      })();
    }

    return { success: true };
  };

  const handleSchedulePickup = (
    donationId: string,
    ngoName: string,
    pickupISO: string
  ): { success: boolean; error?: string } => {
    const targetDonation = donations.find((d) => d.id === donationId);
    if (!targetDonation) {
      return { success: false, error: 'Donation batch not found.' };
    }

    const result = scheduleDonationPickup(
      targetDonation,
      ngoName,
      pickupISO,
      Date.now()
    );
    if (!result.success || !result.updatedDonation) {
      return { success: false, error: result.error };
    }

    setLocalDonations((prev) =>
      prev.map((d) => (d.id === donationId ? result.updatedDonation! : d))
    );

    // Step 2: Persist scheduled pickup to /pickupSchedules via atomic transaction
    if (!isDemoMode && firebaseUser) {
      const existingRes = liveReservationDocs.find((r) => r.donationId === donationId);
      (async () => {
        try {
          await ensureDonationExistsInFirestore({
            id: targetDonation.id,
            donorUid: firebaseUser.uid,
            donorName: targetDonation.donorName,
            organizationName: targetDonation.organizationName,
            foodName: targetDonation.foodName,
            category: targetDonation.category,
            originalQuantity: targetDonation.originalQuantity,
            storageCondition: targetDonation.storageCondition,
            locationArea: targetDonation.locationArea,
            expiryTimeISO: targetDonation.expiryTimeISO,
            pickupWindowStartISO: targetDonation.pickupWindowStartISO,
            pickupWindowEndISO: targetDonation.pickupWindowEndISO,
            donorPhone: targetDonation.donorPhone,
            donorEmail: targetDonation.donorEmail,
            pickupGateAddress: targetDonation.pickupGateAddress || targetDonation.address,
            donorVerificationStatus: targetDonation.donorVerificationStatus,
            donorOrganizationCategory: targetDonation.donorOrganizationCategory,
            donorDocumentType: targetDonation.donorDocumentType,
          });
          await schedulePickupWithTransaction({
            donationId: targetDonation.id,
            existingReservationId: existingRes?.id,
            ngoUid: firebaseUser.uid,
            ngoName: userProfile?.organizationName || ngoName,
            pickupTimeISO: pickupISO,
          });
        } catch (err) {
          setFirestoreSyncError(
            err instanceof Error
              ? err.message
              : 'Firestore pickup schedule transaction failed.'
          );
        }
      })();
    }

    return { success: true };
  };

  const handleAdvanceStatus = (
    donationId: string,
    nextStatus: DonationStatus,
    actorName: string
  ): { success: boolean; error?: string } => {
    const targetDonation = donations.find((d) => d.id === donationId);
    if (!targetDonation) {
      return { success: false, error: 'Donation batch not found.' };
    }

    const result = advanceDonationStatus(
      targetDonation,
      nextStatus,
      actorName,
      Date.now()
    );
    if (!result.success || !result.updatedDonation) {
      return { success: false, error: result.error };
    }

    setLocalDonations((prev) =>
      prev.map((d) => (d.id === donationId ? result.updatedDonation! : d))
    );

    // Step 2: Confirm food collection & status transition via atomic Firestore transaction
    if (!isDemoMode && firebaseUser) {
      const existingRes = liveReservationDocs.find((r) => r.donationId === donationId);
      const existingSched = liveScheduleDocs.find((s) => s.donationId === donationId);
      (async () => {
        try {
          await ensureDonationExistsInFirestore({
            id: targetDonation.id,
            donorUid: firebaseUser.uid,
            donorName: targetDonation.donorName,
            organizationName: targetDonation.organizationName,
            foodName: targetDonation.foodName,
            category: targetDonation.category,
            originalQuantity: targetDonation.originalQuantity,
            storageCondition: targetDonation.storageCondition,
            locationArea: targetDonation.locationArea,
            expiryTimeISO: targetDonation.expiryTimeISO,
            pickupWindowStartISO: targetDonation.pickupWindowStartISO,
            pickupWindowEndISO: targetDonation.pickupWindowEndISO,
            donorPhone: targetDonation.donorPhone,
            donorEmail: targetDonation.donorEmail,
            pickupGateAddress: targetDonation.pickupGateAddress || targetDonation.address,
            donorVerificationStatus: targetDonation.donorVerificationStatus,
            donorOrganizationCategory: targetDonation.donorOrganizationCategory,
            donorDocumentType: targetDonation.donorDocumentType,
          });
          await collectDonationWithTransaction({
            donationId: targetDonation.id,
            reservationId: existingRes?.id,
            scheduleId: existingSched?.id,
            targetStatus: nextStatus,
          });
        } catch (err) {
          setFirestoreSyncError(
            err instanceof Error
              ? err.message
              : 'Firestore collection transaction failed.'
          );
        }
      })();
    }

    return { success: true };
  };

  if (surface === 'website') {
    return (
      <LandingWebsite
        donations={donations}
        ngos={ngos}
        onEnterApp={handleEnterApp}
      />
    );
  }

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'donor-dashboard', label: 'Donor Dashboard', icon: Utensils },
    { id: 'ngo-dashboard', label: 'NGO Dashboard', icon: Building2 },
    { id: 'create-donation', label: 'Create Donation', icon: PlusCircle },
    { id: 'matching', label: 'NGO Matching', icon: Scale },
    { id: 'pickup-scheduling', label: 'Pickup Scheduling', icon: CalendarClock },
    { id: 'inventory', label: 'Inventory Tracking', icon: Layers },
    { id: 'status-tracking', label: 'Status Tracking', icon: Activity },
    { id: 'impact', label: 'Impact Dashboard', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAFC] text-slate-900">
      {/* Sidebar Navigation (260px on desktop) */}
      <aside className="w-full lg:w-64 bg-[#064E3B] text-white shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-emerald-900">
        <div className="p-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-5 border-b border-emerald-800/80">
            <button
              type="button"
              onClick={() => setSurface('website')}
              className="text-left cursor-pointer"
            >
              <span className="text-xl font-extrabold tracking-tight text-white font-display block">
                FoodBridge
              </span>
              <span className="text-[11px] text-emerald-300 block">
                Delhi NCR Redistribution Platform
              </span>
            </button>
          </div>

          {/* Role Switcher */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800">
            <div className="text-[11px] font-semibold text-emerald-300 mb-2">
              Workspace Role Switcher
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleRoleSwitch('donor')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  role === 'donor'
                    ? 'bg-[#10B981] text-white'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                Donor Mode
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch('ngo')}
                className={`py-2 px-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  role === 'ngo'
                    ? 'bg-[#10B981] text-white'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                NGO Mode
              </button>
            </div>
          </div>

          {/* Step 2: Live Firestore vs Demo Mode Fallback Toggle */}
          <div className="my-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300 mb-2">
              <span>Data Source Mode</span>
              <span className="font-mono text-[10px] text-emerald-400">
                {!isDemoMode && firebaseUser ? 'LIVE SYNC' : 'FALLBACK'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!firebaseUser) {
                    setIsAuthModalOpen(true);
                  } else {
                    setIsDemoMode(false);
                  }
                }}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  !isDemoMode && firebaseUser
                    ? 'bg-[#10B981] text-white'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                Live Firestore
              </button>
              <button
                type="button"
                onClick={() => setIsDemoMode(true)}
                className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  isDemoMode || !firebaseUser
                    ? 'bg-[#10B981] text-white'
                    : 'text-emerald-200 hover:bg-emerald-900/60'
                }`}
              >
                Demo Mode
              </button>
            </div>
          </div>

          {/* 8 Functional Application Pages */}
          <nav aria-label="Application Workspace Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#10B981] text-white'
                      : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Return to Public Website & Reset Demo Controls */}
        <div className="p-5 border-t border-emerald-800/80 space-y-2.5">
          <button
            type="button"
            onClick={() => setSurface('website')}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-100 bg-emerald-900/60 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Website Home</span>
          </button>
          <button
            type="button"
            onClick={handleResetDemoData}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Delhi NCR Demo Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract for SaaS Workspace */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 truncate">
            <span className="font-semibold text-slate-900">
              {role === 'donor' ? 'Surplus Donor Workspace' : 'Recipient NGO Workspace'}
            </span>
            <span>/</span>
            <span className="text-[#064E3B] font-semibold truncate">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
            <span className="hidden md:inline text-slate-400">·</span>
            <span
              data-testid="workspace-data-mode-indicator"
              className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-600"
            >
              <Database className="w-3.5 h-3.5 text-[#10B981]" />
              {!isDemoMode && firebaseUser
                ? `Live Firestore Sync (${hydratedFirestoreDonations.length} cloud batches)`
                : 'Delhi NCR (Demo Mode)'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#064E3B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>
                {firebaseUser
                  ? `${userProfile?.displayName || firebaseUser.email} (${
                      userProfile?.accountRole?.toUpperCase() || role.toUpperCase()
                    })`
                  : `Firebase Auth (${FIREBASE_PROJECT_ID})`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create-donation')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              + New Donation
            </button>
          </div>
        </header>

        {firestoreSyncError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span>Firestore Sync Notice: {firestoreSyncError}</span>
            <button
              type="button"
              onClick={() => setFirestoreSyncError(null)}
              className="font-semibold underline ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Viewport Container */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'donor-dashboard' && (
            <DonorDashboardView
              donations={donations}
              ngos={ngos}
              donorVerificationProfile={donorVerificationProfile}
              onUpdateDonorVerification={handleUpdateDonorVerification}
              isDemoMode={isDemoMode || !firebaseUser}
              onNavigateTab={(tab, donId) => {
                if (donId) setSelectedDonationId(donId);
                setActiveTab(tab as WorkspaceTab);
              }}
              onAdvanceStatus={handleAdvanceStatus}
            />
          )}

          {activeTab === 'ngo-dashboard' && (
            <NgoDashboardView
              donations={donations}
              ngos={ngos}
              activeNgoId={activeNgoId}
              donorVerificationProfile={donorVerificationProfile}
              onSelectNgo={setActiveNgoId}
              onReserveMeals={handleReserveMeals}
              onSchedulePickup={handleSchedulePickup}
              onAdvanceStatus={handleAdvanceStatus}
              onInspectInMatcher={(donId) => {
                setSelectedDonationId(donId);
                setActiveTab('matching');
              }}
            />
          )}

          {activeTab === 'create-donation' && (
            <CreateDonationView
              onCreateDonation={handleCreateDonation}
              onSuccessNavigate={(newId) => {
                setSelectedDonationId(newId);
                setActiveTab('matching');
              }}
            />
          )}

          {(activeTab === 'matching' ||
            activeTab === 'pickup-scheduling' ||
            activeTab === 'status-tracking') && (
            <MatchingAndScheduleView
              donations={donations}
              ngos={ngos}
              selectedDonationId={selectedDonationId}
              activeNgoId={activeNgoId}
              role={role}
              donorVerificationProfile={donorVerificationProfile}
              viewMode={activeTab}
              onSelectDonation={setSelectedDonationId}
              onSelectNgo={setActiveNgoId}
              onReserveMeals={handleReserveMeals}
              onSchedulePickup={handleSchedulePickup}
              onAdvanceStatus={handleAdvanceStatus}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryDashboardView
              donations={donations}
              onInspectDonation={(donId) => {
                setSelectedDonationId(donId);
                setActiveTab('matching');
              }}
            />
          )}

          {activeTab === 'impact' && (
            <ImpactDashboardView donations={donations} ngos={ngos} />
          )}
        </main>
      </div>

      <FirebaseAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={firebaseUser}
        userProfile={userProfile}
        connectionStatus={connectionStatus}
        onProfileLoaded={(profile) => {
          setUserProfile(profile);
          setIsDemoMode(false);
          if (profile?.accountRole) {
            setRole(profile.accountRole);
          }
        }}
        onRetestConnection={runFirestorePing}
      />
    </div>
  );
}

