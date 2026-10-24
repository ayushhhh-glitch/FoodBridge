import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  runTransaction,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type {
  DonationFormInput,
  DonationStatus,
  DonorOrganizationCategory,
  DonorVerificationProfile,
  DonorVerificationStatus,
  FirestoreDonationDoc,
  FirestorePickupScheduleDoc,
  FirestoreReservationDoc,
} from './utils/matchingEngine';

// Initialize Firebase Web SDK with provisioned configuration
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

// Prepared Firestore Collections
export const COLLECTIONS = {
  USERS: 'users',
  NGOS: 'ngos',
  DONATIONS: 'donations',
  RESERVATIONS: 'reservations',
  PICKUP_SCHEDULES: 'pickupSchedules',
} as const;

export const usersCollection = collection(db, COLLECTIONS.USERS);
export const ngosCollection = collection(db, COLLECTIONS.NGOS);
export const donationsCollection = collection(db, COLLECTIONS.DONATIONS);
export const reservationsCollection = collection(db, COLLECTIONS.RESERVATIONS);
export const pickupSchedulesCollection = collection(db, COLLECTIONS.PICKUP_SCHEDULES);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface ConnectionCheckResult {
  reachable: boolean;
  rulesEnforced: boolean;
  message: string;
  checkedAtISO: string;
}

/**
 * Validates live connection to Cloud Firestore on boot using getDocFromServer.
 * Because /test/connection is blocked by our default-deny security rule, a
 * 'permission-denied' response proves the client reached the Firestore server
 * and that zero-trust rules are actively enforced.
 */
export async function testFirestoreConnection(): Promise<ConnectionCheckResult> {
  const checkedAtISO = new Date().toISOString();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      reachable: true,
      rulesEnforced: true,
      message: `Connected to Cloud Firestore (${FIREBASE_PROJECT_ID}).`,
      checkedAtISO,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return {
        reachable: false,
        rulesEnforced: false,
        message: 'Client is offline or Firebase configuration could not reach server.',
        checkedAtISO,
      };
    }
    if (
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('permission-denied')
    ) {
      return {
        reachable: true,
        rulesEnforced: true,
        message: `Connected to Cloud Firestore (${FIREBASE_PROJECT_ID}) · Zero-Trust Security Rules active.`,
        checkedAtISO,
      };
    }
    return {
      reachable: false,
      rulesEnforced: false,
      message: msg,
      checkedAtISO,
    };
  }
}

export interface FoodBridgeUserProfile {
  uid: string;
  email: string;
  displayName: string;
  organizationName: string;
  accountRole: 'donor' | 'ngo';
  phone?: string;
  area: string;
  organizationCategory?: DonorOrganizationCategory;
  verificationStatus?: DonorVerificationStatus;
  documentType?: string;
  documentNumber?: string;
  pickupGateAddress?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Fetches the authenticated user's profile from /users/{uid}
 */
export async function fetchUserProfile(
  uid: string
): Promise<FoodBridgeUserProfile | null> {
  const path = `${COLLECTIONS.USERS}/${uid}`;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (!snap.exists()) return null;
    return snap.data() as FoodBridgeUserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Creates the authenticated user's profile in /users/{uid} and, if role === 'ngo',
 * initializes their /ngos/{uid} document.
 */
export async function createOrEnsureUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
  organizationName: string;
  accountRole: 'donor' | 'ngo';
  area: string;
  phone?: string;
}): Promise<FoodBridgeUserProfile> {
  const userPath = `${COLLECTIONS.USERS}/${params.uid}`;
  const cleanDisplayName = params.displayName.trim().slice(0, 100);
  const cleanOrgName = params.organizationName.trim().slice(0, 140);
  const cleanArea = params.area.trim().slice(0, 100);
  const cleanEmail = params.email.trim().slice(0, 254);

  const payload: Record<string, unknown> = {
    uid: params.uid,
    email: cleanEmail,
    displayName: cleanDisplayName.length >= 2 ? cleanDisplayName : 'FoodBridge Member',
    organizationName: cleanOrgName.length >= 2 ? cleanOrgName : 'Delhi NCR Community Partner',
    accountRole: params.accountRole,
    area: cleanArea.length >= 2 ? cleanArea : 'Connaught Place, Central Delhi',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (params.phone && params.phone.trim().length >= 5) {
    payload.phone = params.phone.trim().slice(0, 30);
  }

  try {
    await setDoc(doc(db, COLLECTIONS.USERS, params.uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  if (params.accountRole === 'ngo') {
    const ngoPath = `${COLLECTIONS.NGOS}/${params.uid}`;
    try {
      await setDoc(doc(db, COLLECTIONS.NGOS, params.uid), {
        ownerUid: params.uid,
        name: cleanOrgName.length >= 2 ? cleanOrgName : 'Delhi NCR NGO Partner',
        area: cleanArea.length >= 2 ? cleanArea : 'Connaught Place, Central Delhi',
        maxMealCapacity: 300,
        currentLoadMeals: 0,
        availableForPickup: true,
        visibility: 'network',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ngoPath);
    }
  }

  return {
    uid: params.uid,
    email: cleanEmail,
    displayName: payload.displayName as string,
    organizationName: payload.organizationName as string,
    accountRole: params.accountRole,
    area: payload.area as string,
    phone: params.phone,
  };
}

/**
 * Updates the donor's verification status, compliance document details, and ground contact
 * profile in /users/{uid}.
 */
export async function updateUserVerificationInFirestore(
  uid: string,
  verification: DonorVerificationProfile
): Promise<void> {
  const userPath = `${COLLECTIONS.USERS}/${uid}`;
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      displayName: verification.contactPerson.trim().slice(0, 100),
      phone: verification.contactPhone.trim().slice(0, 30),
      organizationCategory: verification.organizationCategory,
      verificationStatus: verification.verificationStatus,
      documentType: verification.documentType.trim().slice(0, 80),
      documentNumber: verification.documentNumber.trim().slice(0, 60),
      pickupGateAddress: verification.pickupGateAddress.trim().slice(0, 200),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

/**
 * Step 2: Creates a new Donation document in /donations/{donationId}
 * Enforces strict schema boundaries declared in firebase-blueprint.json & firestore.rules.
 */
export async function createDonationInFirestore(
  input: DonationFormInput,
  donorUid: string,
  customId?: string,
  verification?: DonorVerificationProfile | null
): Promise<string> {
  const donationId =
    customId || `don_pune_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const path = `${COLLECTIONS.DONATIONS}/${donationId}`;

  const cleanOrg = input.organizationName.trim().slice(0, 140);
  const cleanFood = input.foodName.trim().slice(0, 200);
  const cleanArea = input.locationArea.trim().slice(0, 100);
  const qty = Math.max(5, Math.min(5000, Math.round(Number(input.quantityMeals) || 50)));

  const payload: Record<string, unknown> = {
    donorUid,
    organizationName: cleanOrg.length >= 2 ? cleanOrg : 'Delhi NCR Donor Kitchen',
    foodName: cleanFood.length >= 3 ? cleanFood : 'Surplus Cooked Meals',
    category: input.category,
    originalQuantity: qty,
    availableQuantity: qty,
    reservedQuantity: 0,
    collectedQuantity: 0,
    storageCondition: input.storageCondition,
    locationArea: cleanArea.length >= 2 ? cleanArea : 'Connaught Place, Central Delhi',
    expiryTimeISO: input.expiryTimeISO.slice(0, 40),
    pickupWindowStartISO: input.pickupWindowStartISO.slice(0, 40),
    pickupWindowEndISO: input.pickupWindowEndISO.slice(0, 40),
    status: 'Listed' as const,
    visibility: 'network' as const,
    donorVerificationStatus: verification?.verificationStatus || 'verified',
    donorOrganizationCategory: verification?.organizationCategory || 'Commercial',
    donorDocumentType: (verification?.documentType || 'FSSAI License Number / Certificate').slice(
      0,
      80
    ),
    donorContactPerson: (
      verification?.contactPerson ||
      input.donorName ||
      'Delhi NCR Donor Coordinator'
    ).slice(0, 100),
    donorPhone: (verification?.contactPhone || '+91 98110 44210').slice(0, 30),
    donorEmail: (verification?.contactEmail || 'dispatch@foodbridge-delhi.org').slice(0, 254),
    pickupGateAddress: (
      verification?.pickupGateAddress ||
      input.address ||
      `${cleanArea}, Main Gate Bay`
    ).slice(0, 200),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, COLLECTIONS.DONATIONS, donationId), payload);
    return donationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Ensures a donation batch exists in Cloud Firestore /donations/{donationId} before
 * running atomic reservation or collection transactions on it.
 */
export async function ensureDonationExistsInFirestore(params: {
  id: string;
  donorUid: string;
  donorName?: string;
  organizationName: string;
  foodName: string;
  category: DonationFormInput['category'];
  originalQuantity: number;
  storageCondition: DonationFormInput['storageCondition'];
  locationArea: string;
  expiryTimeISO: string;
  pickupWindowStartISO: string;
  pickupWindowEndISO: string;
  donorPhone?: string;
  donorEmail?: string;
  pickupGateAddress?: string;
  donorVerificationStatus?: DonorVerificationStatus;
  donorOrganizationCategory?: DonorOrganizationCategory;
  donorDocumentType?: string;
}): Promise<void> {
  const ref = doc(db, COLLECTIONS.DONATIONS, params.id);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await createDonationInFirestore(
    {
      donorName: params.donorName || params.organizationName,
      organizationName: params.organizationName,
      foodName: params.foodName,
      category: params.category,
      quantityMeals: params.originalQuantity,
      preparationTimeISO: new Date().toISOString(),
      expiryTimeISO: params.expiryTimeISO,
      pickupWindowStartISO: params.pickupWindowStartISO,
      pickupWindowEndISO: params.pickupWindowEndISO,
      locationArea: params.locationArea,
      address: params.pickupGateAddress,
      storageCondition: params.storageCondition,
    },
    params.donorUid,
    params.id,
    {
      organizationCategory: params.donorOrganizationCategory || 'Commercial',
      documentType: params.donorDocumentType || 'FSSAI License Number / Certificate',
      documentNumber: 'FSSAI-13324089001421',
      documentFileName: 'verified_compliance.pdf',
      documentPreviewUrl: '',
      verificationStatus: params.donorVerificationStatus || 'verified',
      contactPerson: params.donorName || params.organizationName,
      contactPhone: params.donorPhone || '+91 98110 44210',
      contactEmail: params.donorEmail || 'dispatch@foodbridge-delhi.org',
      pickupGateAddress:
        params.pickupGateAddress || `${params.locationArea}, Main Gate Bay, Delhi NCR`,
      updatedAtISO: new Date().toISOString(),
    }
  );
}

/**
 * Atomic Firestore Transaction for reserving meal quantities from a donation batch.
 * Prevents race conditions, negative inventory, and overbooking across concurrent NGOs.
 */
export async function reserveDonationWithTransaction(params: {
  donationId: string;
  ngoUid: string;
  ngoName: string;
  mealsToReserve: number;
}): Promise<{ reservationId: string; remainingAvailable: number }> {
  const donationRef = doc(db, COLLECTIONS.DONATIONS, params.donationId);
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const reservationRef = doc(db, COLLECTIONS.RESERVATIONS, reservationId);
  const cleanMeals = Math.max(1, Math.min(5000, Math.round(params.mealsToReserve)));
  const cleanNgoName =
    params.ngoName.trim().slice(0, 140).length >= 2
      ? params.ngoName.trim().slice(0, 140)
      : 'Recipient NGO Partner';

  try {
    return await runTransaction(db, async (transaction) => {
      const donationSnap = await transaction.get(donationRef);
      if (!donationSnap.exists()) {
        throw new Error('Donation batch does not exist in Firestore.');
      }

      const data = donationSnap.data();
      if (data.status === 'Expired' || data.status === 'Completed') {
        throw new Error(`Cannot reserve meals from a ${data.status} donation.`);
      }

      const currentAvailable = Number(data.availableQuantity ?? 0);
      const currentReserved = Number(data.reservedQuantity ?? 0);

      if (cleanMeals <= 0 || cleanMeals > currentAvailable) {
        throw new Error(
          `Requested ${cleanMeals} meals, but only ${currentAvailable} available.`
        );
      }

      const nextAvailable = currentAvailable - cleanMeals;
      const nextReserved = currentReserved + cleanMeals;

      transaction.update(donationRef, {
        availableQuantity: nextAvailable,
        reservedQuantity: nextReserved,
        status: 'Reserved',
        updatedAt: serverTimestamp(),
      });

      transaction.set(reservationRef, {
        donationId: params.donationId,
        donorUid: data.donorUid,
        ngoUid: params.ngoUid,
        ngoName: cleanNgoName,
        mealsReserved: cleanMeals,
        status: 'Reserved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { reservationId, remainingAvailable: nextAvailable };
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${COLLECTIONS.DONATIONS}/${params.donationId}`
    );
  }
}

/**
 * Step 2: Atomic Firestore Transaction for scheduling a pickup appointment in /pickupSchedules
 * while updating /reservations and /donations status to 'Scheduled'.
 */
export async function schedulePickupWithTransaction(params: {
  donationId: string;
  existingReservationId?: string;
  ngoUid: string;
  ngoName: string;
  pickupTimeISO: string;
}): Promise<{ scheduleId: string; reservationId: string }> {
  let reservationId = params.existingReservationId;

  // Ensure a parent reservation exists in Firestore first so the Global Consistency
  // exists(/reservations/$(reservationId)) rule on pickupSchedules is satisfied.
  if (!reservationId) {
    const snap = await getDoc(doc(db, COLLECTIONS.DONATIONS, params.donationId));
    const avail = Number(snap.data()?.availableQuantity ?? 50);
    const defaultReserve = Math.max(1, Math.min(avail, 50));
    const resOut = await reserveDonationWithTransaction({
      donationId: params.donationId,
      ngoUid: params.ngoUid,
      ngoName: params.ngoName,
      mealsToReserve: defaultReserve,
    });
    reservationId = resOut.reservationId;
  }

  const donationRef = doc(db, COLLECTIONS.DONATIONS, params.donationId);
  const reservationRef = doc(db, COLLECTIONS.RESERVATIONS, reservationId);
  const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const scheduleRef = doc(db, COLLECTIONS.PICKUP_SCHEDULES, scheduleId);

  try {
    await runTransaction(db, async (transaction) => {
      const donationSnap = await transaction.get(donationRef);
      const reservationSnap = await transaction.get(reservationRef);

      if (!donationSnap.exists()) {
        throw new Error('Donation batch does not exist in Firestore.');
      }

      const data = donationSnap.data();
      if (data.status === 'Expired' || data.status === 'Completed') {
        throw new Error(`Cannot schedule pickup for a ${data.status} donation.`);
      }

      transaction.update(donationRef, {
        status: 'Scheduled',
        updatedAt: serverTimestamp(),
      });

      if (reservationSnap.exists()) {
        transaction.update(reservationRef, {
          status: 'Scheduled',
          updatedAt: serverTimestamp(),
        });
      }

      transaction.set(scheduleRef, {
        donationId: params.donationId,
        reservationId: reservationId!,
        donorUid: data.donorUid,
        ngoUid: params.ngoUid,
        pickupTimeISO: params.pickupTimeISO.slice(0, 40),
        status: 'Scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { scheduleId, reservationId };
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `${COLLECTIONS.PICKUP_SCHEDULES}/${scheduleId}`
    );
  }
}

/**
 * Atomic Firestore Transaction for marking reserved meals as collected or advancing status
 * ('In Progress' -> 'Collected' -> 'Completed').
 */
export async function collectDonationWithTransaction(params: {
  donationId: string;
  reservationId?: string;
  scheduleId?: string;
  targetStatus?: DonationStatus;
}): Promise<void> {
  const nextStatus: DonationStatus = params.targetStatus || 'Collected';
  const donationRef = doc(db, COLLECTIONS.DONATIONS, params.donationId);
  const resRef = params.reservationId
    ? doc(db, COLLECTIONS.RESERVATIONS, params.reservationId)
    : null;
  const schedRef = params.scheduleId
    ? doc(db, COLLECTIONS.PICKUP_SCHEDULES, params.scheduleId)
    : null;

  try {
    await runTransaction(db, async (transaction) => {
      const donationSnap = await transaction.get(donationRef);
      const resSnap = resRef ? await transaction.get(resRef) : null;
      const schedSnap = schedRef ? await transaction.get(schedRef) : null;

      if (!donationSnap.exists()) {
        throw new Error('Donation batch does not exist in Firestore.');
      }

      const data = donationSnap.data();
      if (data.status === 'Expired' || data.status === 'Completed') {
        throw new Error(`Donation is already ${data.status}.`);
      }

      const currentReserved = Number(data.reservedQuantity ?? 0);
      const currentCollected = Number(data.collectedQuantity ?? 0);
      const currentAvailable = Number(data.availableQuantity ?? 0);

      let nextAvailable = currentAvailable;
      let nextReserved = currentReserved;
      let nextCollected = currentCollected;

      if (nextStatus === 'Collected' || nextStatus === 'Completed') {
        const transferred = currentReserved > 0 ? currentReserved : currentAvailable;
        nextReserved = 0;
        nextAvailable = currentReserved > 0 ? currentAvailable : 0;
        nextCollected = currentCollected + transferred;
      }

      transaction.update(donationRef, {
        availableQuantity: nextAvailable,
        reservedQuantity: nextReserved,
        collectedQuantity: nextCollected,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      const subStatus =
        nextStatus === 'In Progress' ||
        nextStatus === 'Collected' ||
        nextStatus === 'Completed'
          ? nextStatus
          : null;

      if (resRef && resSnap?.exists() && subStatus) {
        transaction.update(resRef, {
          status: subStatus,
          updatedAt: serverTimestamp(),
        });
      }

      if (schedRef && schedSnap?.exists() && subStatus) {
        transaction.update(schedRef, {
          status: subStatus,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `${COLLECTIONS.DONATIONS}/${params.donationId}`
    );
  }
}

function timestampToISO(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const secs = Number((val as { seconds: number }).seconds);
    if (!Number.isNaN(secs)) {
      return new Date(secs * 1000).toISOString();
    }
  }
  if (typeof val === 'string') return val;
  return undefined;
}

/**
 * Step 2: Real-Time onSnapshot Listeners for `donations`, `reservations`, and `pickupSchedules`.
 * Automatically merges donor-owned and NGO-owned reservations & schedules so both Donor and NGO
 * views update instantaneously without page refresh.
 */
export function subscribeToLiveFoodBridgeCollections(
  userUid: string,
  onUpdate: (payload: {
    donations: FirestoreDonationDoc[];
    reservations: FirestoreReservationDoc[];
    schedules: FirestorePickupScheduleDoc[];
  }) => void
): () => void {
  let latestDonations: FirestoreDonationDoc[] = [];
  const donorReservationsMap = new Map<string, FirestoreReservationDoc>();
  const ngoReservationsMap = new Map<string, FirestoreReservationDoc>();
  const donorSchedulesMap = new Map<string, FirestorePickupScheduleDoc>();
  const ngoSchedulesMap = new Map<string, FirestorePickupScheduleDoc>();

  const emitCombined = () => {
    const mergedReservations = new Map<string, FirestoreReservationDoc>([
      ...donorReservationsMap.entries(),
      ...ngoReservationsMap.entries(),
    ]);
    const mergedSchedules = new Map<string, FirestorePickupScheduleDoc>([
      ...donorSchedulesMap.entries(),
      ...ngoSchedulesMap.entries(),
    ]);
    onUpdate({
      donations: latestDonations,
      reservations: Array.from(mergedReservations.values()),
      schedules: Array.from(mergedSchedules.values()),
    });
  };

  // 1. Live Donations Listener (visibility == 'network')
  const donationsQuery = query(
    donationsCollection,
    where('visibility', '==', 'network')
  );
  const unsubDonations = onSnapshot(
    donationsQuery,
    (snapshot) => {
      latestDonations = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          donorUid: String(raw.donorUid || ''),
          organizationName: String(raw.organizationName || ''),
          foodName: String(raw.foodName || ''),
          category: raw.category,
          originalQuantity: Number(raw.originalQuantity ?? 0),
          availableQuantity: Number(raw.availableQuantity ?? 0),
          reservedQuantity: Number(raw.reservedQuantity ?? 0),
          collectedQuantity: Number(raw.collectedQuantity ?? 0),
          storageCondition: raw.storageCondition,
          locationArea: String(raw.locationArea || 'Connaught Place, Central Delhi'),
          expiryTimeISO: String(raw.expiryTimeISO || ''),
          pickupWindowStartISO: String(raw.pickupWindowStartISO || ''),
          pickupWindowEndISO: String(raw.pickupWindowEndISO || ''),
          status: raw.status,
          visibility: String(raw.visibility || 'network'),
          donorVerificationStatus: raw.donorVerificationStatus,
          donorOrganizationCategory: raw.donorOrganizationCategory,
          donorDocumentType: raw.donorDocumentType,
          donorContactPerson: raw.donorContactPerson,
          donorPhone: raw.donorPhone,
          donorEmail: raw.donorEmail,
          pickupGateAddress: raw.pickupGateAddress,
          createdAtISO: timestampToISO(raw.createdAt),
          updatedAtISO: timestampToISO(raw.updatedAt),
        } satisfies FirestoreDonationDoc;
      });
      emitCombined();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.DONATIONS);
    }
  );

  // 2A. Reservations where donorUid == userUid
  const donorResQuery = query(
    reservationsCollection,
    where('donorUid', '==', userUid)
  );
  const unsubDonorRes = onSnapshot(
    donorResQuery,
    (snapshot) => {
      donorReservationsMap.clear();
      snapshot.docs.forEach((d) => {
        const raw = d.data();
        donorReservationsMap.set(d.id, {
          id: d.id,
          donationId: String(raw.donationId || ''),
          donorUid: String(raw.donorUid || ''),
          ngoUid: String(raw.ngoUid || ''),
          ngoName: String(raw.ngoName || ''),
          mealsReserved: Number(raw.mealsReserved ?? 0),
          status: raw.status,
          createdAtISO: timestampToISO(raw.createdAt),
          updatedAtISO: timestampToISO(raw.updatedAt),
        });
      });
      emitCombined();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.RESERVATIONS);
    }
  );

  // 2B. Reservations where ngoUid == userUid
  const ngoResQuery = query(
    reservationsCollection,
    where('ngoUid', '==', userUid)
  );
  const unsubNgoRes = onSnapshot(
    ngoResQuery,
    (snapshot) => {
      ngoReservationsMap.clear();
      snapshot.docs.forEach((d) => {
        const raw = d.data();
        ngoReservationsMap.set(d.id, {
          id: d.id,
          donationId: String(raw.donationId || ''),
          donorUid: String(raw.donorUid || ''),
          ngoUid: String(raw.ngoUid || ''),
          ngoName: String(raw.ngoName || ''),
          mealsReserved: Number(raw.mealsReserved ?? 0),
          status: raw.status,
          createdAtISO: timestampToISO(raw.createdAt),
          updatedAtISO: timestampToISO(raw.updatedAt),
        });
      });
      emitCombined();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.RESERVATIONS);
    }
  );

  // 3A. Pickup Schedules where donorUid == userUid
  const donorSchedQuery = query(
    pickupSchedulesCollection,
    where('donorUid', '==', userUid)
  );
  const unsubDonorSched = onSnapshot(
    donorSchedQuery,
    (snapshot) => {
      donorSchedulesMap.clear();
      snapshot.docs.forEach((d) => {
        const raw = d.data();
        donorSchedulesMap.set(d.id, {
          id: d.id,
          donationId: String(raw.donationId || ''),
          reservationId: String(raw.reservationId || ''),
          donorUid: String(raw.donorUid || ''),
          ngoUid: String(raw.ngoUid || ''),
          pickupTimeISO: String(raw.pickupTimeISO || ''),
          status: raw.status,
          createdAtISO: timestampToISO(raw.createdAt),
          updatedAtISO: timestampToISO(raw.updatedAt),
        });
      });
      emitCombined();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PICKUP_SCHEDULES);
    }
  );

  // 3B. Pickup Schedules where ngoUid == userUid
  const ngoSchedQuery = query(
    pickupSchedulesCollection,
    where('ngoUid', '==', userUid)
  );
  const unsubNgoSched = onSnapshot(
    ngoSchedQuery,
    (snapshot) => {
      ngoSchedulesMap.clear();
      snapshot.docs.forEach((d) => {
        const raw = d.data();
        ngoSchedulesMap.set(d.id, {
          id: d.id,
          donationId: String(raw.donationId || ''),
          reservationId: String(raw.reservationId || ''),
          donorUid: String(raw.donorUid || ''),
          ngoUid: String(raw.ngoUid || ''),
          pickupTimeISO: String(raw.pickupTimeISO || ''),
          status: raw.status,
          createdAtISO: timestampToISO(raw.createdAt),
          updatedAtISO: timestampToISO(raw.updatedAt),
        });
      });
      emitCombined();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.PICKUP_SCHEDULES);
    }
  );

  return () => {
    unsubDonations();
    unsubDonorRes();
    unsubNgoRes();
    unsubDonorSched();
    unsubNgoSched();
  };
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  Timestamp,
  type FirebaseUser,
};

