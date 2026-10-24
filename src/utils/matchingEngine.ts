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

export const PUNE_NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  'Kothrud, Pune': { lat: 18.5074, lng: 73.8077 },
  'Shivajinagar, Pune': { lat: 18.5308, lng: 73.8475 },
  'Koregaon Park, Pune': { lat: 18.5362, lng: 73.8940 },
  'Viman Nagar, Pune': { lat: 18.5679, lng: 73.9143 },
  'Hinjewadi Phase 1, Pune': { lat: 18.5913, lng: 73.7389 },
  'Hadapsar, Pune': { lat: 18.5089, lng: 73.9259 },
  'Baner, Pune': { lat: 18.5590, lng: 73.7868 },
  'Deccan Gymkhana, Pune': { lat: 18.5167, lng: 73.8415 },
  'Wakad, Pune': { lat: 18.5987, lng: 73.7644 },
  'Balewadi, Pune': { lat: 18.5760, lng: 73.7707 },
  'Aundh, Pune': { lat: 18.5580, lng: 73.8075 },
  'Camp / MG Road, Pune': { lat: 18.5136, lng: 73.8789 },
};

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
    errors.locationArea = 'Pickup neighborhood in Pune is required.';
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
