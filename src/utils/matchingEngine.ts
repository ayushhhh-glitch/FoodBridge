export type FoodCategory =
  | 'Cooked Meals'
  | 'Bakery & Bread'
  | 'Fresh Produce'
  | 'Packaged & Dry'
  | 'Dairy & Beverages';

export type StorageCondition =
  | 'Hot Insulated (60°C+)'
  | 'Refrigerated (0–4°C)'
  | 'Ambient / Room Temp'
  | 'Frozen (-18°C)';

export type DonationStatus =
  | 'Listed'
  | 'Matched'
  | 'Reserved'
  | 'Scheduled'
  | 'In Progress'
  | 'Collected'
  | 'Completed'
  | 'Expired';

export type ExpiryStatus = 'Available' | 'Expiring Soon' | 'Expired';
export type UrgencyColor = 'green' | 'yellow' | 'red';
export type InventoryBadge = 'Available' | 'Reserved' | 'Collected' | 'Expired';

export type DonorOrganizationCategory = 'Commercial' | 'Institutional' | 'Individual';
export type DonorVerificationStatus = 'unverified' | 'pending_verification' | 'verified';

export interface DonorVerificationProfile {
  organizationCategory: DonorOrganizationCategory;
  documentType: string;
  documentNumber: string;
  documentFileName: string;
  documentPreviewUrl: string;
  verificationStatus: DonorVerificationStatus;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  pickupGateAddress: string;
  updatedAtISO: string;
}

export interface NGOProfile {
  id: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  maxMealCapacity: number;
  currentLoadMeals: number;
  acceptedCategories: FoodCategory[];
  supportedStorage: StorageCondition[];
  operatingHoursStart: number; // 0-23
  operatingHoursEnd: number;   // 0-23
  contactPerson: string;
  phone: string;
  email?: string;
  pickupVehicleDetails?: string;
  availableForPickup: boolean;
  isDemoData: boolean;
  registrationLabel: string;
}

export interface ReservationRecord {
  id: string;
  ngoId: string;
  ngoName: string;
  mealsReserved: number;
  status: 'Reserved' | 'Scheduled' | 'In Progress' | 'Collected' | 'Completed';
  pickupTimeISO?: string;
  createdAtISO: string;
  notes?: string;
}

export interface StatusTimelineEvent {
  status: DonationStatus;
  timestampISO: string;
  actor: string;
  note: string;
}

export interface FoodDonation {
  id: string;
  donorUid?: string;
  donorName: string;
  organizationName: string;
  donorType: 'Restaurant' | 'Hostel / Canteen' | 'Event / Banquet' | 'Hotel' | 'Corporate Cafeteria';
  foodName: string;
  category: FoodCategory;
  originalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  collectedQuantity: number;
  preparationTimeISO: string;
  expiryTimeISO: string;
  pickupWindowStartISO: string;
  pickupWindowEndISO: string;
  locationArea: string;
  address: string;
  lat: number;
  lng: number;
  storageCondition: StorageCondition;
  status: DonationStatus;
  matchedNgoId?: string;
  matchedNgoName?: string;
  scheduledPickupTimeISO?: string;
  imageUrl?: string;
  notes?: string;
  donorPhone?: string;
  donorEmail?: string;
  pickupGateAddress?: string;
  donorVerificationStatus?: DonorVerificationStatus;
  donorOrganizationCategory?: DonorOrganizationCategory;
  donorDocumentType?: string;
  donorDocumentNumber?: string;
  isDemoData: boolean;
  reservations: ReservationRecord[];
  statusHistory: StatusTimelineEvent[];
}

export interface MatchScoreBreakdown {
  distanceScore: number;      // 0-100, weighted 40%
  capacityScore: number;      // 0-100, weighted 30%
  availabilityScore: number;  // 0-100, weighted 20%
  windowScore: number;        // 0-100, weighted 10%
  expiryUrgencyBonus: number; // Context indicator
}

export interface MatchResult {
  ngo: NGOProfile;
  distanceKm: number;
  remainingCapacity: number;
  totalScore: number;
  breakdown: MatchScoreBreakdown;
  eligible: boolean;
  ineligibleReason?: string;
  explanation: string;
}

export interface DonationFormInput {
  donorName: string;
  organizationName: string;
  donorType?: FoodDonation['donorType'];
  foodName: string;
  category: FoodCategory;
  quantityMeals: number;
  preparationTimeISO: string;
  expiryTimeISO: string;
  pickupWindowStartISO: string;
  pickupWindowEndISO: string;
  locationArea: string;
  address?: string;
  storageCondition: StorageCondition;
  imageUrl?: string;
  notes?: string;
}

export const DELHI_NCR_NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  'Connaught Place, Central Delhi': { lat: 28.6304, lng: 77.2177 },
  'North Campus, Delhi': { lat: 28.6892, lng: 77.2104 },
  'Nehru Place, South Delhi': { lat: 28.5494, lng: 77.2533 },
  'Hauz Khas / Green Park, South Delhi': { lat: 28.5494, lng: 77.2001 },
  'Okhla Industrial Area, South Delhi': { lat: 28.5355, lng: 77.2732 },
  'Rohini Sector 14, North Delhi': { lat: 28.7159, lng: 77.1197 },
  'GT Karnal Road, North Delhi': { lat: 28.7300, lng: 77.1500 },
  'Mayur Vihar Phase 1, East Delhi': { lat: 28.6080, lng: 77.2950 },
  'Dwarka Sector 10, West Delhi': { lat: 28.5823, lng: 77.0500 },
  'Lajpat Nagar, South Delhi': { lat: 28.5677, lng: 77.2433 },
  'Saket, South Delhi': { lat: 28.5246, lng: 77.2066 },
  'Laxmi Nagar, East Delhi': { lat: 28.6304, lng: 77.2773 },
  'Noida Sector 62, NCR': { lat: 28.6279, lng: 77.3649 },
  'Indirapuram, Ghaziabad NCR': { lat: 28.6415, lng: 77.3714 },
};

export const PUNE_NEIGHBORHOOD_COORDS = DELHI_NCR_NEIGHBORHOOD_COORDS;


export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function getExpiryMetrics(
  expiryTimeISO: string,
  nowMs: number = Date.now(),
  donationStatus?: DonationStatus
): {
  expiryStatus: ExpiryStatus;
  urgencyColor: UrgencyColor;
  remainingMinutes: number;
  formattedCountdown: string;
} {
  if (donationStatus === 'Collected' || donationStatus === 'Completed') {
    return {
      expiryStatus: 'Available',
      urgencyColor: 'green',
      remainingMinutes: 999,
      formattedCountdown: 'Redistributed safely',
    };
  }

  const expiryMs = new Date(expiryTimeISO).getTime();
  const diffMs = expiryMs - nowMs;
  const remainingMinutes = Math.floor(diffMs / 60000);

  if (remainingMinutes <= 0 || donationStatus === 'Expired') {
    return {
      expiryStatus: 'Expired',
      urgencyColor: 'red',
      remainingMinutes: Math.min(0, remainingMinutes),
      formattedCountdown: 'Expired',
    };
  }

  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;
  const formattedCountdown =
    hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;

  if (remainingMinutes <= 90) {
    return {
      expiryStatus: 'Expiring Soon',
      urgencyColor: 'red',
      remainingMinutes,
      formattedCountdown,
    };
  }

  if (remainingMinutes <= 210) {
    return {
      expiryStatus: 'Expiring Soon',
      urgencyColor: 'yellow',
      remainingMinutes,
      formattedCountdown,
    };
  }

  return {
    expiryStatus: 'Available',
    urgencyColor: 'green',
    remainingMinutes,
    formattedCountdown,
  };
}

export function getInventoryStatusBadge(
  donation: FoodDonation,
  nowMs: number = Date.now()
): InventoryBadge {
  if (donation.status === 'Collected' || donation.status === 'Completed' || donation.collectedQuantity >= donation.originalQuantity) {
    return 'Collected';
  }
  const { expiryStatus } = getExpiryMetrics(donation.expiryTimeISO, nowMs, donation.status);
  if (expiryStatus === 'Expired' || donation.status === 'Expired') {
    return 'Expired';
  }
  if (donation.availableQuantity === 0 && donation.reservedQuantity > 0) {
    return 'Reserved';
  }
  if (donation.reservedQuantity > 0 && donation.availableQuantity > 0) {
    return 'Reserved';
  }
  return 'Available';
}

export function calculateNgoMatch(
  donation: FoodDonation,
  ngo: NGOProfile,
  nowMs: number = Date.now()
): MatchResult {
  const distanceKm = calculateHaversineDistanceKm(
    donation.lat,
    donation.lng,
    ngo.lat,
    ngo.lng
  );
  const remainingCapacity = Math.max(0, ngo.maxMealCapacity - ngo.currentLoadMeals);
  const { expiryStatus, remainingMinutes } = getExpiryMetrics(
    donation.expiryTimeISO,
    nowMs,
    donation.status
  );

  const supportsCategory = ngo.acceptedCategories.includes(donation.category);
  const supportsStorage = ngo.supportedStorage.includes(donation.storageCondition);
  const isExpired = expiryStatus === 'Expired';
  const hasCapacity = remainingCapacity >= 10;

  let eligible = true;
  let ineligibleReason: string | undefined;

  if (isExpired) {
    eligible = false;
    ineligibleReason = 'Donation has passed its safe food expiry timestamp.';
  } else if (!supportsStorage) {
    eligible = false;
    ineligibleReason = `Requires ${donation.storageCondition} transport not equipped at this unit.`;
  } else if (!supportsCategory) {
    eligible = false;
    ineligibleReason = `Organization does not process ${donation.category}.`;
  } else if (!hasCapacity) {
    eligible = false;
    ineligibleReason = 'Community kitchen is currently at full meal capacity.';
  }

  // 1. Distance Score (0-100, Weight: 40%)
  // Within 1 km = 98-100, 5 km = 75, 10 km = 50, 18+ km = 15
  const distanceScore = Math.max(
    10,
    Math.min(100, Math.round(100 - distanceKm * 5.2))
  );

  // 2. Capacity Compatibility Score (0-100, Weight: 30%)
  const targetQty = Math.max(10, donation.availableQuantity || donation.originalQuantity);
  const capacityRatio = remainingCapacity / targetQty;
  const capacityScore =
    capacityRatio >= 1.2
      ? 100
      : capacityRatio >= 1.0
      ? 92
      : capacityRatio >= 0.6
      ? Math.round(65 + capacityRatio * 25)
      : Math.max(20, Math.round(capacityRatio * 100));

  // 3. Availability & Readiness Score (0-100, Weight: 20%)
  const loadUtilization = ngo.currentLoadMeals / Math.max(1, ngo.maxMealCapacity);
  const availabilityScore = ngo.availableForPickup
    ? Math.round(100 - loadUtilization * 22)
    : 30;

  // 4. Pickup Window & Expiry Urgency Compatibility (0-100, Weight: 10%)
  const pickupStartMs = new Date(donation.pickupWindowStartISO).getTime();
  const pickupEndMs = new Date(donation.pickupWindowEndISO).getTime();
  const expiryMs = new Date(donation.expiryTimeISO).getTime();
  const windowDurationHours = Math.max(0, (pickupEndMs - pickupStartMs) / 3600000);
  const validBeforeExpiry = pickupEndMs <= expiryMs;
  const travelMinutesEstimate = Math.round(distanceKm * 3.5 + 10);
  const canReachBeforeExpiry = remainingMinutes > travelMinutesEstimate + 15;

  let windowScore = 85;
  if (!validBeforeExpiry || !canReachBeforeExpiry) {
    windowScore = 35;
  } else if (windowDurationHours >= 1.5) {
    windowScore = 96;
  }

  const expiryUrgencyBonus =
    remainingMinutes > 0 && remainingMinutes <= 180 && distanceKm <= 6 ? 10 : 0;

  // Weighted total: 40% Distance + 30% Capacity + 20% Availability + 10% Window
  const rawWeighted =
    distanceScore * 0.4 +
    capacityScore * 0.3 +
    availabilityScore * 0.2 +
    windowScore * 0.1;

  const totalScore = eligible
    ? Math.min(99, Math.max(15, Math.round(rawWeighted)))
    : Math.min(45, Math.round(rawWeighted * 0.5));

  const explanationParts: string[] = [];
  if (!eligible && ineligibleReason) {
    explanationParts.push(`Not recommended: ${ineligibleReason}`);
  } else {
    explanationParts.push(
      `${distanceKm} km from ${donation.locationArea} (~${travelMinutesEstimate} min transit)`
    );
    explanationParts.push(
      `can absorb ${ Math.min(remainingCapacity, targetQty) } of ${targetQty} meals (${remainingCapacity} meal slot open)`
    );
    if (supportsStorage) {
      explanationParts.push(`verified for ${donation.storageCondition}`);
    }
    if (expiryStatus === 'Expiring Soon') {
      explanationParts.push(`priority proximity match for urgent expiry window`);
    }
  }

  return {
    ngo,
    distanceKm,
    remainingCapacity,
    totalScore,
    breakdown: {
      distanceScore,
      capacityScore,
      availabilityScore,
      windowScore,
      expiryUrgencyBonus,
    },
    eligible,
    ineligibleReason,
    explanation: explanationParts.join(' · '),
  };
}

export function getRankedNgoMatches(
  donation: FoodDonation,
  ngos: NGOProfile[],
  nowMs: number = Date.now()
): MatchResult[] {
  return ngos
    .map((ngo) => calculateNgoMatch(donation, ngo, nowMs))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.totalScore - a.totalScore;
    });
}

export function validateDonationInput(
  input: Partial<DonationFormInput>,
  nowMs: number = Date.now()
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.donorName || input.donorName.trim().length < 2) {
    errors.donorName = 'Donor contact name is required (min 2 characters).';
  }
  if (!input.organizationName || input.organizationName.trim().length < 2) {
    errors.organizationName = 'Organization or kitchen name is required.';
  }
  if (!input.foodName || input.foodName.trim().length < 3) {
    errors.foodName = 'Food description is required (e.g., Veg Biryani & Dal).';
  }
  if (!input.category) {
    errors.category = 'Select a food category.';
  }
  if (
    typeof input.quantityMeals !== 'number' ||
    Number.isNaN(input.quantityMeals) ||
    input.quantityMeals < 5 ||
    input.quantityMeals > 5000
  ) {
    errors.quantityMeals = 'Quantity must be between 5 and 5,000 meals.';
  }
  if (!input.locationArea || input.locationArea.trim().length === 0) {
    errors.locationArea = 'Pickup neighborhood in Delhi NCR is required.';
  }
  if (!input.storageCondition) {
    errors.storageCondition = 'Select required food storage conditions.';
  }

  const prepMs = input.preparationTimeISO ? new Date(input.preparationTimeISO).getTime() : NaN;
  const expiryMs = input.expiryTimeISO ? new Date(input.expiryTimeISO).getTime() : NaN;
  const startMs = input.pickupWindowStartISO ? new Date(input.pickupWindowStartISO).getTime() : NaN;
  const endMs = input.pickupWindowEndISO ? new Date(input.pickupWindowEndISO).getTime() : NaN;

  if (Number.isNaN(prepMs)) {
    errors.preparationTimeISO = 'Valid preparation date and time is required.';
  }
  if (Number.isNaN(expiryMs)) {
    errors.expiryTimeISO = 'Safe food expiry date and time is required.';
  } else if (expiryMs <= nowMs) {
    errors.expiryTimeISO = 'Food expiry time must be in the future.';
  } else if (!Number.isNaN(prepMs) && expiryMs <= prepMs) {
    errors.expiryTimeISO = 'Expiry time must be later than preparation time.';
  }

  if (Number.isNaN(startMs)) {
    errors.pickupWindowStartISO = 'Collection window start time is required.';
  }
  if (Number.isNaN(endMs)) {
    errors.pickupWindowEndISO = 'Collection window deadline is required.';
  }

  if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
    if (endMs <= startMs) {
      errors.pickupWindowEndISO = 'Pickup deadline must be after pickup start time.';
    } else if (!Number.isNaN(expiryMs) && endMs > expiryMs) {
      errors.pickupWindowEndISO =
        'Collection window must end on or before the food expiry timestamp.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePickupSlot(
  donation: FoodDonation,
  proposedPickupISO: string,
  nowMs: number = Date.now()
): { valid: boolean; error?: string } {
  const { expiryStatus } = getExpiryMetrics(donation.expiryTimeISO, nowMs, donation.status);
  if (expiryStatus === 'Expired' || donation.status === 'Expired') {
    return { valid: false, error: 'Cannot schedule pickup for an expired donation.' };
  }

  const proposedMs = new Date(proposedPickupISO).getTime();
  if (Number.isNaN(proposedMs)) {
    return { valid: false, error: 'Please select a valid pickup date and time.' };
  }

  const startMs = new Date(donation.pickupWindowStartISO).getTime();
  const endMs = new Date(donation.pickupWindowEndISO).getTime();
  const expiryMs = new Date(donation.expiryTimeISO).getTime();

  // Allow 1 minute tolerance for rounding in datetime-local inputs
  const toleranceMs = 60000;
  if (proposedMs < startMs - toleranceMs || proposedMs > endMs + toleranceMs) {
    return {
      valid: false,
      error: 'Pickup time must fall within the donor’s permitted collection window.',
    };
  }
  if (proposedMs > expiryMs) {
    return {
      valid: false,
      error: 'Pickup time cannot exceed the food safety expiry deadline.',
    };
  }

  return { valid: true };
}

export function reserveDonationQuantity(
  donation: FoodDonation,
  ngo: NGOProfile,
  mealsToReserve: number,
  nowMs: number = Date.now()
): { success: boolean; error?: string; updatedDonation?: FoodDonation } {
  const { expiryStatus } = getExpiryMetrics(donation.expiryTimeISO, nowMs, donation.status);
  if (expiryStatus === 'Expired' || donation.status === 'Expired') {
    return {
      success: false,
      error: 'Expired donations are locked and cannot be reserved.',
    };
  }

  if (
    typeof mealsToReserve !== 'number' ||
    Number.isNaN(mealsToReserve) ||
    mealsToReserve <= 0
  ) {
    return {
      success: false,
      error: 'Reservation quantity must be at least 1 meal.',
    };
  }

  if (mealsToReserve > donation.availableQuantity) {
    return {
      success: false,
      error: `Cannot reserve ${mealsToReserve} meals. Only ${donation.availableQuantity} meals available in inventory.`,
    };
  }

  const remainingNgoCapacity = Math.max(0, ngo.maxMealCapacity - ngo.currentLoadMeals);
  if (mealsToReserve > remainingNgoCapacity) {
    return {
      success: false,
      error: `Exceeds ${ngo.name}'s available intake capacity (${remainingNgoCapacity} meals).`,
    };
  }

  const newAvailable = donation.availableQuantity - mealsToReserve;
  const newReserved = donation.reservedQuantity + mealsToReserve;
  const nowISO = new Date(nowMs).toISOString();

  const newReservation: ReservationRecord = {
    id: `res-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    ngoId: ngo.id,
    ngoName: ngo.name,
    mealsReserved: mealsToReserve,
    status: 'Reserved',
    createdAtISO: nowISO,
  };

  const updatedDonation: FoodDonation = {
    ...donation,
    availableQuantity: newAvailable,
    reservedQuantity: newReserved,
    status: 'Reserved',
    matchedNgoId: ngo.id,
    matchedNgoName: ngo.name,
    reservations: [newReservation, ...donation.reservations],
    statusHistory: [
      ...donation.statusHistory,
      {
        status: 'Reserved',
        timestampISO: nowISO,
        actor: ngo.name,
        note: `Reserved ${mealsToReserve} meals (${newAvailable} meals remaining available).`,
      },
    ],
  };

  return { success: true, updatedDonation };
}

export function scheduleDonationPickup(
  donation: FoodDonation,
  ngoName: string,
  pickupTimeISO: string,
  nowMs: number = Date.now()
): { success: boolean; error?: string; updatedDonation?: FoodDonation } {
  const slotCheck = validatePickupSlot(donation, pickupTimeISO, nowMs);
  if (!slotCheck.valid) {
    return { success: false, error: slotCheck.error };
  }

  const nowISO = new Date(nowMs).toISOString();
  const updatedReservations = donation.reservations.map((r, idx) =>
    idx === 0 ? { ...r, status: 'Scheduled' as const, pickupTimeISO } : r
  );

  const updatedDonation: FoodDonation = {
    ...donation,
    status: 'Scheduled',
    scheduledPickupTimeISO: pickupTimeISO,
    matchedNgoName: donation.matchedNgoName || ngoName,
    reservations: updatedReservations,
    statusHistory: [
      ...donation.statusHistory,
      {
        status: 'Scheduled',
        timestampISO: nowISO,
        actor: ngoName,
        note: `Confirmed pickup slot for ${new Date(pickupTimeISO).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}.`,
      },
    ],
  };

  return { success: true, updatedDonation };
}

export function advanceDonationStatus(
  donation: FoodDonation,
  nextStatus: DonationStatus,
  actorName: string,
  nowMs: number = Date.now()
): { success: boolean; error?: string; updatedDonation?: FoodDonation } {
  if (donation.status === 'Expired') {
    return { success: false, error: 'Cannot advance status of an expired donation.' };
  }

  const nowISO = new Date(nowMs).toISOString();
  let availableQuantity = donation.availableQuantity;
  let reservedQuantity = donation.reservedQuantity;
  let collectedQuantity = donation.collectedQuantity;

  if (nextStatus === 'Collected' || nextStatus === 'Completed') {
    if (reservedQuantity > 0) {
      collectedQuantity += reservedQuantity;
      reservedQuantity = 0;
    } else if (collectedQuantity === 0 && availableQuantity > 0) {
      collectedQuantity += availableQuantity;
      availableQuantity = 0;
    }
  }

  const noteMap: Record<DonationStatus, string> = {
    Listed: 'Donation listed on FoodBridge.',
    Matched: `Matched with recipient partner ${actorName}.`,
    Reserved: `Meals reserved by ${actorName}.`,
    Scheduled: `Pickup window slot confirmed by ${actorName}.`,
    'In Progress': `Volunteer dispatch vehicle en route for collection.`,
    Collected: `Food batch inspected, temperature-verified, and collected (${collectedQuantity} meals).`,
    Completed: `Meals delivered and served at ${actorName} community kitchen.`,
    Expired: 'Collection window elapsed prior to pickup.',
  };

  const updatedDonation: FoodDonation = {
    ...donation,
    status: nextStatus,
    availableQuantity,
    reservedQuantity,
    collectedQuantity,
    statusHistory: [
      ...donation.statusHistory,
      {
        status: nextStatus,
        timestampISO: nowISO,
        actor: actorName,
        note: noteMap[nextStatus],
      },
    ],
  };

  return { success: true, updatedDonation };
}

export function calculateImpactSummary(
  donations: FoodDonation[],
  ngos: NGOProfile[],
  nowMs: number = Date.now()
) {
  let totalMealsCollected = 0;
  let totalMealsReserved = 0;
  let totalMealsAvailable = 0;
  let totalMealsOriginal = 0;
  let completedDonationsCount = 0;
  let expiredDonationsCount = 0;
  let activeDonationsCount = 0;

  for (const d of donations) {
    totalMealsOriginal += d.originalQuantity;
    totalMealsCollected += d.collectedQuantity;
    totalMealsReserved += d.reservedQuantity;

    const { expiryStatus } = getExpiryMetrics(d.expiryTimeISO, nowMs, d.status);
    if (d.status === 'Completed' || d.status === 'Collected') {
      completedDonationsCount += 1;
    } else if (expiryStatus === 'Expired' || d.status === 'Expired') {
      expiredDonationsCount += 1;
    } else {
      activeDonationsCount += 1;
      totalMealsAvailable += d.availableQuantity;
    }
  }

  // Standard meal weight ~ 0.42 kg, 1 kg food waste prevented ~ 2.5 kg CO2e
  const foodWastePreventedKg = Math.round(totalMealsCollected * 0.42 * 10) / 10;
  const co2AvoidedKg = Math.round(foodWastePreventedKg * 2.5);
  const activeNgosCount = ngos.filter((n) => n.availableForPickup).length;

  return {
    totalMealsCollected,
    totalMealsReserved,
    totalMealsAvailable,
    totalMealsOriginal,
    foodWastePreventedKg,
    co2AvoidedKg,
    completedDonationsCount,
    expiredDonationsCount,
    activeDonationsCount,
    activeNgosCount,
    totalNgosCount: ngos.length,
  };
}

export interface FirestoreDonationDoc {
  id: string;
  donorUid: string;
  organizationName: string;
  foodName: string;
  category: FoodCategory;
  originalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  collectedQuantity: number;
  storageCondition: StorageCondition;
  locationArea: string;
  expiryTimeISO: string;
  pickupWindowStartISO: string;
  pickupWindowEndISO: string;
  status: DonationStatus;
  visibility: string;
  donorVerificationStatus?: DonorVerificationStatus;
  donorOrganizationCategory?: DonorOrganizationCategory;
  donorDocumentType?: string;
  donorContactPerson?: string;
  donorPhone?: string;
  donorEmail?: string;
  pickupGateAddress?: string;
  createdAtISO?: string;
  updatedAtISO?: string;
}

export interface FirestoreReservationDoc {
  id: string;
  donationId: string;
  donorUid: string;
  ngoUid: string;
  ngoName: string;
  mealsReserved: number;
  status: 'Reserved' | 'Scheduled' | 'In Progress' | 'Collected' | 'Completed';
  createdAtISO?: string;
  updatedAtISO?: string;
}

export interface FirestorePickupScheduleDoc {
  id: string;
  donationId: string;
  reservationId: string;
  donorUid: string;
  ngoUid: string;
  pickupTimeISO: string;
  status: 'Scheduled' | 'In Progress' | 'Collected' | 'Completed';
  createdAtISO?: string;
  updatedAtISO?: string;
}

/**
 * Pure hydration function that joins real-time Cloud Firestore snapshots from
 * `donations`, `reservations`, and `pickupSchedules` into the rich FoodDonation UI model.
 */
export function hydrateDonationsFromFirestore(
  rawDonations: FirestoreDonationDoc[],
  rawReservations: FirestoreReservationDoc[],
  rawSchedules: FirestorePickupScheduleDoc[],
  ngos: NGOProfile[],
  nowMs: number = Date.now(),
  donorUserProfile?: {
    uid?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    organizationName?: string;
    organizationCategory?: DonorOrganizationCategory;
    verificationStatus?: DonorVerificationStatus;
    documentType?: string;
    documentNumber?: string;
    pickupGateAddress?: string;
  } | null
): FoodDonation[] {
  const sortedDonations = [...rawDonations].sort((a, b) => {
    const tA = a.createdAtISO ? new Date(a.createdAtISO).getTime() : 0;
    const tB = b.createdAtISO ? new Date(b.createdAtISO).getTime() : 0;
    return tB - tA;
  });

  return sortedDonations.map((doc) => {
    const coords = PUNE_NEIGHBORHOOD_COORDS[doc.locationArea] || {
      lat: 28.6139,
      lng: 77.209,
    };

    const matchingReservations = rawReservations
      .filter((r) => r.donationId === doc.id)
      .sort((a, b) => {
        const tA = a.createdAtISO ? new Date(a.createdAtISO).getTime() : 0;
        const tB = b.createdAtISO ? new Date(b.createdAtISO).getTime() : 0;
        return tB - tA;
      });

    const matchingSchedules = rawSchedules
      .filter((s) => s.donationId === doc.id)
      .sort((a, b) => {
        const tA = a.createdAtISO ? new Date(a.createdAtISO).getTime() : 0;
        const tB = b.createdAtISO ? new Date(b.createdAtISO).getTime() : 0;
        return tB - tA;
      });

    const latestSchedule = matchingSchedules[0];
    const latestReservation = matchingReservations[0];

    const hydratedReservations: ReservationRecord[] = matchingReservations.map((res) => {
      const linkedSchedule = matchingSchedules.find(
        (s) => s.reservationId === res.id || s.donationId === doc.id
      );
      return {
        id: res.id,
        ngoId: res.ngoUid,
        ngoName: res.ngoName,
        mealsReserved: res.mealsReserved,
        status: res.status,
        pickupTimeISO: linkedSchedule?.pickupTimeISO,
        createdAtISO: res.createdAtISO || new Date(nowMs).toISOString(),
      };
    });

    const createdISO = doc.createdAtISO || new Date(nowMs).toISOString();
    const updatedISO = doc.updatedAtISO || createdISO;

    const statusHistory: StatusTimelineEvent[] = [
      {
        status: 'Listed',
        timestampISO: createdISO,
        actor: doc.organizationName,
        note: `Listed ${doc.originalQuantity} meals (${doc.category}) in Cloud Firestore.`,
      },
    ];

    for (const res of [...matchingReservations].reverse()) {
      statusHistory.push({
        status: 'Reserved',
        timestampISO: res.createdAtISO || updatedISO,
        actor: res.ngoName,
        note: `Reserved ${res.mealsReserved} meals via atomic Firestore transaction (${doc.availableQuantity} meals remaining).`,
      });
    }

    for (const sched of [...matchingSchedules].reverse()) {
      const ngoActor =
        matchingReservations.find((r) => r.id === sched.reservationId)?.ngoName ||
        latestReservation?.ngoName ||
        'Recipient NGO Partner';
      statusHistory.push({
        status: 'Scheduled',
        timestampISO: sched.createdAtISO || updatedISO,
        actor: ngoActor,
        note: `Confirmed pickup appointment for ${new Date(
          sched.pickupTimeISO
        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      });
    }

    if (
      doc.status === 'In Progress' ||
      doc.status === 'Collected' ||
      doc.status === 'Completed' ||
      doc.status === 'Expired'
    ) {
      const actor = latestReservation?.ngoName || doc.organizationName;
      const noteByStatus: Record<string, string> = {
        'In Progress': 'Dispatch vehicle en route for food pickup.',
        Collected: `Food batch collected (${doc.collectedQuantity} meals verified via Firestore transaction).`,
        Completed: `Redistribution completed (${doc.collectedQuantity} meals served).`,
        Expired: 'Batch reached expiry deadline and was locked.',
      };
      statusHistory.push({
        status: doc.status,
        timestampISO: updatedISO,
        actor,
        note: noteByStatus[doc.status] || `Status updated to ${doc.status}.`,
      });
    }

    const isMatchingDonorProfile =
      donorUserProfile && donorUserProfile.uid && donorUserProfile.uid === doc.donorUid;

    const resolvedContactPerson =
      doc.donorContactPerson ||
      (isMatchingDonorProfile ? donorUserProfile?.displayName : undefined) ||
      doc.organizationName;
    const resolvedPhone =
      doc.donorPhone ||
      (isMatchingDonorProfile ? donorUserProfile?.phone : undefined) ||
      '+91 98110 44210';
    const resolvedEmail =
      doc.donorEmail ||
      (isMatchingDonorProfile ? donorUserProfile?.email : undefined) ||
      'dispatch@foodbridge-delhi.org';
    const resolvedGateAddress =
      doc.pickupGateAddress ||
      (isMatchingDonorProfile ? donorUserProfile?.pickupGateAddress : undefined) ||
      `${doc.locationArea}, Main Gate Bay, Delhi NCR`;

    const baseDonation: FoodDonation = {
      id: doc.id,
      donorUid: doc.donorUid,
      donorName: resolvedContactPerson,
      organizationName: doc.organizationName,
      donorType: 'Hostel / Canteen',
      foodName: doc.foodName,
      category: doc.category,
      originalQuantity: doc.originalQuantity,
      availableQuantity: doc.availableQuantity,
      reservedQuantity: doc.reservedQuantity,
      collectedQuantity: doc.collectedQuantity,
      preparationTimeISO: createdISO,
      expiryTimeISO: doc.expiryTimeISO,
      pickupWindowStartISO: doc.pickupWindowStartISO,
      pickupWindowEndISO: doc.pickupWindowEndISO,
      locationArea: doc.locationArea,
      address: resolvedGateAddress,
      lat: coords.lat,
      lng: coords.lng,
      storageCondition: doc.storageCondition,
      status: doc.status,
      scheduledPickupTimeISO: latestSchedule?.pickupTimeISO,
      donorVerificationStatus:
        doc.donorVerificationStatus ||
        (isMatchingDonorProfile ? donorUserProfile?.verificationStatus : undefined) ||
        'verified',
      donorOrganizationCategory:
        doc.donorOrganizationCategory ||
        (isMatchingDonorProfile ? donorUserProfile?.organizationCategory : undefined) ||
        'Commercial',
      donorDocumentType:
        doc.donorDocumentType ||
        (isMatchingDonorProfile ? donorUserProfile?.documentType : undefined) ||
        'FSSAI License Number / Certificate',
      donorDocumentNumber:
        (isMatchingDonorProfile ? donorUserProfile?.documentNumber : undefined) ||
        'FSSAI-13324089001421',
      donorPhone: resolvedPhone,
      donorEmail: resolvedEmail,
      pickupGateAddress: resolvedGateAddress,
      isDemoData: false,
      reservations: hydratedReservations,
      statusHistory,
    };

    const matchedNgoFromCatalog = ngos.find(
      (n) =>
        n.id === latestReservation?.ngoUid ||
        n.name.toLowerCase() === latestReservation?.ngoName?.toLowerCase()
    );

    if (latestReservation) {
      baseDonation.matchedNgoId = matchedNgoFromCatalog?.id || latestReservation.ngoUid;
      baseDonation.matchedNgoName = latestReservation.ngoName;
    } else {
      const topMatch = getRankedNgoMatches(baseDonation, ngos, nowMs).find(
        (m) => m.eligible
      );
      if (topMatch) {
        baseDonation.matchedNgoId = topMatch.ngo.id;
        baseDonation.matchedNgoName = topMatch.ngo.name;
      }
    }

    return baseDonation;
  });
}

// ============================================================================
// DONOR OFFICIAL DOCUMENT VERIFICATION & TWO-WAY CONTACT UNLOCK PURE LOGIC
// ============================================================================

export const REQUIRED_DOCUMENT_OPTIONS: Record<DonorOrganizationCategory, string[]> = {
  Commercial: [
    'FSSAI License Number / Certificate',
    'Business Registration / GST Certificate',
  ],
  Institutional: [
    'Authorized College / Hostel ID',
    'Institutional Authority Letter',
  ],
  Individual: [
    'Official Govt Photo ID (Driving License)',
    'Official Govt Photo ID (Passport)',
    'Official Govt Photo ID (Voter ID)',
  ],
};

export function getRequiredDocumentsForCategory(
  category: DonorOrganizationCategory
): string[] {
  return REQUIRED_DOCUMENT_OPTIONS[category] || REQUIRED_DOCUMENT_OPTIONS.Commercial;
}

export function validateDonorVerificationInput(input: {
  organizationCategory: DonorOrganizationCategory;
  documentType: string;
  documentNumber: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  pickupGateAddress: string;
}): { valid: boolean; error?: string } {
  const allowedDocs = getRequiredDocumentsForCategory(input.organizationCategory);
  if (!allowedDocs.includes(input.documentType)) {
    return {
      valid: false,
      error: `Please select a valid required document for ${input.organizationCategory} donors.`,
    };
  }
  if (!input.documentNumber || input.documentNumber.trim().length < 5) {
    return {
      valid: false,
      error: 'Official license or document ID number must be at least 5 characters.',
    };
  }
  if (!input.contactPerson || input.contactPerson.trim().length < 2) {
    return {
      valid: false,
      error: 'Authorized contact person name is required.',
    };
  }
  if (!input.contactPhone || input.contactPhone.trim().length < 8) {
    return {
      valid: false,
      error: 'Valid direct contact phone number is required.',
    };
  }
  if (!input.contactEmail || !input.contactEmail.includes('@')) {
    return {
      valid: false,
      error: 'Valid official contact email is required.',
    };
  }
  if (!input.pickupGateAddress || input.pickupGateAddress.trim().length < 5) {
    return {
      valid: false,
      error: 'Exact pickup gate or loading dock address is required.',
    };
  }
  return { valid: true };
}

/**
 * Determines whether Two-Way Contact Details are unlocked for a given donation batch.
 * Contacts remain strictly masked during 'Listed', 'Matched', or unreserved 'Expired' states,
 * and immediately unlock once an NGO confirms a reservation ('Reserved', 'Scheduled', 'In Progress', 'Collected', 'Completed').
 */
export function isContactUnlockedForBatch(donation: FoodDonation): boolean {
  const unlockedStatuses: DonationStatus[] = [
    'Reserved',
    'Scheduled',
    'In Progress',
    'Collected',
    'Completed',
  ];
  if (unlockedStatuses.includes(donation.status)) {
    return true;
  }
  return Array.isArray(donation.reservations) && donation.reservations.length > 0;
}

export function maskSensitiveValue(
  value: string,
  type: 'name' | 'phone' | 'email' | 'address' | 'vehicle'
): string {
  const clean = (value || '').trim();
  if (!clean) return '••••••••';

  if (type === 'phone') {
    const last3 = clean.slice(-3);
    return `+91 98••• ••${last3}`;
  }
  if (type === 'email') {
    const [local, domain] = clean.split('@');
    const firstChar = (local || 'c')[0];
    return `${firstChar}••••@${domain || 'foodbridge.org'}`;
  }
  if (type === 'name') {
    const parts = clean.split(' ').filter(Boolean);
    return parts
      .map((p) => (p.length <= 2 ? p : `${p[0]}${'•'.repeat(Math.min(5, p.length - 1))}`))
      .join(' ');
  }
  if (type === 'vehicle') {
    return 'DL-1L-••-•••• · Vehicle Details Locked Until Reservation';
  }
  // address / gate
  return `Gate ••, ${clean.split(',').slice(-2).join(',').trim() || 'Delhi NCR'} (Exact Gate Locked)`;
}

export interface TwoWayContactView {
  unlocked: boolean;
  donorVerificationStatus: DonorVerificationStatus;
  donorOrganizationCategory: DonorOrganizationCategory;
  donorDocumentType: string;
  donorDocumentNumber: string;
  donorSideSeesNgo: {
    ngoName: string;
    coordinatorName: string;
    contactNumber: string;
    organizationEmail: string;
    pickupVehicleDetails: string;
    rawPhone: string;
    whatsappUrl: string;
  };
  ngoSideSeesDonor: {
    organizationName: string;
    contactPerson: string;
    phoneNumber: string;
    email: string;
    exactPickupGateAddress: string;
    rawPhone: string;
    whatsappUrl: string;
  };
}

export function getTwoWayContactDetails(
  donation: FoodDonation,
  ngos: NGOProfile[],
  activeNgoId?: string,
  globalVerification?: DonorVerificationProfile | null
): TwoWayContactView {
  const unlocked = isContactUnlockedForBatch(donation);

  // Resolve target NGO (matched NGO, latest reservation NGO, or active NGO)
  const latestRes = donation.reservations?.[0];
  const resolvedNgo =
    ngos.find((n) => n.id === donation.matchedNgoId) ||
    ngos.find((n) => n.id === latestRes?.ngoId) ||
    ngos.find((n) => n.id === activeNgoId) ||
    ngos[0];

  const rawDonorPerson =
    donation.donorName ||
    globalVerification?.contactPerson ||
    'Prof. Arvind Sharma';
  const rawDonorPhone =
    donation.donorPhone ||
    globalVerification?.contactPhone ||
    '+91 98110 44210';
  const rawDonorEmail =
    donation.donorEmail ||
    globalVerification?.contactEmail ||
    `${donation.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)}@delhi-donor.org`;
  const rawDonorGate =
    donation.pickupGateAddress ||
    donation.address ||
    globalVerification?.pickupGateAddress ||
    `${donation.locationArea}, Delhi NCR 110001`;

  const rawNgoCoordinator = resolvedNgo?.contactPerson || 'Raghavendra Verma';
  const rawNgoPhone = resolvedNgo?.phone || '+91 98112 52109';
  const rawNgoEmail =
    resolvedNgo?.email ||
    `dispatch@${(resolvedNgo?.name || 'delhingo').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14)}.org`;
  const rawNgoVehicle =
    resolvedNgo?.pickupVehicleDetails ||
    'DL-1L-EF-4821 · Insulated Tata Ace Food Van (Cold/Hot Box)';

  const donorDigits = rawDonorPhone.replace(/[^0-9]/g, '');
  const ngoDigits = rawNgoPhone.replace(/[^0-9]/g, '');

  const verificationStatus: DonorVerificationStatus =
    donation.donorVerificationStatus ||
    globalVerification?.verificationStatus ||
    'verified';
  const organizationCategory: DonorOrganizationCategory =
    donation.donorOrganizationCategory ||
    globalVerification?.organizationCategory ||
    (donation.donorType === 'Hostel / Canteen' ? 'Institutional' : 'Commercial');
  const documentType =
    donation.donorDocumentType ||
    globalVerification?.documentType ||
    (organizationCategory === 'Institutional'
      ? 'Authorized College / Hostel ID'
      : 'FSSAI License Number / Certificate');
  const documentNumber =
    donation.donorDocumentNumber ||
    globalVerification?.documentNumber ||
    'FSSAI-13324089001421';

  return {
    unlocked,
    donorVerificationStatus: verificationStatus,
    donorOrganizationCategory: organizationCategory,
    donorDocumentType: documentType,
    donorDocumentNumber: documentNumber,
    donorSideSeesNgo: {
      ngoName: resolvedNgo?.name || donation.matchedNgoName || 'Delhi NCR NGO Partner',
      coordinatorName: unlocked
        ? rawNgoCoordinator
        : maskSensitiveValue(rawNgoCoordinator, 'name'),
      contactNumber: unlocked
        ? rawNgoPhone
        : maskSensitiveValue(rawNgoPhone, 'phone'),
      organizationEmail: unlocked
        ? rawNgoEmail
        : maskSensitiveValue(rawNgoEmail, 'email'),
      pickupVehicleDetails: unlocked
        ? rawNgoVehicle
        : maskSensitiveValue(rawNgoVehicle, 'vehicle'),
      rawPhone: unlocked ? rawNgoPhone : '',
      whatsappUrl: unlocked
        ? `https://wa.me/${ngoDigits}?text=${encodeURIComponent(
            `Hello ${rawNgoCoordinator} (${resolvedNgo?.name}), coordinating pickup for "${donation.foodName}" (${donation.originalQuantity} meals) via FoodBridge.`
          )}`
        : '#',
    },
    // Donor Contact Details are ALWAYS completely visible and unmasked to NGOs across all views
    ngoSideSeesDonor: {
      organizationName: donation.organizationName,
      contactPerson: rawDonorPerson,
      phoneNumber: rawDonorPhone,
      email: rawDonorEmail,
      exactPickupGateAddress: rawDonorGate,
      rawPhone: rawDonorPhone,
      whatsappUrl: `https://wa.me/${donorDigits}?text=${encodeURIComponent(
        `Hello ${rawDonorPerson} (${donation.organizationName}), our NGO team is coordinating collection for "${donation.foodName}" (${donation.availableQuantity || donation.originalQuantity} meals) at ${rawDonorGate} via FoodBridge.`
      )}`,
    },
  };
}


