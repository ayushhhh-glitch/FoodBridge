import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceKm,
  getExpiryMetrics,
  calculateNgoMatch,
  validateDonationInput,
  validatePickupSlot,
  reserveDonationQuantity,
  scheduleDonationPickup,
  advanceDonationStatus,
  calculateImpactSummary,
  hydrateDonationsFromFirestore,
  getRequiredDocumentsForCategory,
  validateDonorVerificationInput,
  isContactUnlockedForBatch,
  getTwoWayContactDetails,
  type FoodDonation,
  type NGOProfile,
} from './matchingEngine';

const BASE_NOW = new Date('2026-10-24T12:00:00.000Z').getTime();

const sampleNgo: NGOProfile = {
  id: 'ngo-test-1',
  name: 'Feeding India Delhi Hub',
  area: 'Connaught Place, Central Delhi',
  address: 'Block K, Outer Circle, Connaught Place, New Delhi 110001',
  lat: 28.6304,
  lng: 77.2177,
  maxMealCapacity: 250,
  currentLoadMeals: 50,
  acceptedCategories: ['Cooked Meals', 'Bakery & Bread'],
  supportedStorage: ['Hot Insulated (60°C+)', 'Ambient / Room Temp'],
  operatingHoursStart: 7,
  operatingHoursEnd: 22,
  contactPerson: 'Raghavendra Verma',
  phone: '+91 98112 52109',
  availableForPickup: true,
  isDemoData: true,
  registrationLabel: 'Demo Partner — Sample Record',
};

const sampleDonation: FoodDonation = {
  id: 'don-test-1',
  donorName: 'Prof. Arvind Sharma',
  organizationName: 'Delhi University Central Hostel',
  donorType: 'Hostel / Canteen',
  foodName: 'North Indian Veg Thali & Dal Makhani',
  category: 'Cooked Meals',
  originalQuantity: 150,
  availableQuantity: 150,
  reservedQuantity: 0,
  collectedQuantity: 0,
  preparationTimeISO: new Date(BASE_NOW - 60 * 60000).toISOString(),
  expiryTimeISO: new Date(BASE_NOW + 180 * 60000).toISOString(), // +3 hours
  pickupWindowStartISO: new Date(BASE_NOW + 15 * 60000).toISOString(), // +15 mins
  pickupWindowEndISO: new Date(BASE_NOW + 120 * 60000).toISOString(), // +2 hours
  locationArea: 'Connaught Place, Central Delhi',
  address: 'Outer Circle, Connaught Place, New Delhi 110001',
  lat: 28.6315,
  lng: 77.2190,
  storageCondition: 'Hot Insulated (60°C+)',
  status: 'Listed',
  isDemoData: true,
  reservations: [],
  statusHistory: [
    {
      status: 'Listed',
      timestampISO: new Date(BASE_NOW).toISOString(),
      actor: 'Prof. Arvind Sharma',
      note: 'Initial listing',
    },
  ],
};

test('Haversine distance calculates realistic km distance in Delhi NCR', () => {
  const distSameArea = calculateHaversineDistanceKm(28.6304, 77.2177, 28.6315, 77.2190);
  assert.ok(distSameArea >= 0 && distSameArea < 1.5);

  // Connaught Place to Okhla Industrial Area (~12 km)
  const distCrossCity = calculateHaversineDistanceKm(28.6304, 77.2177, 28.5355, 77.2732);
  assert.ok(distCrossCity > 9 && distCrossCity < 16);
});

test('Expiry metrics distinguishes Available, Expiring Soon, and Expired', () => {
  const available = getExpiryMetrics(
    new Date(BASE_NOW + 300 * 60000).toISOString(),
    BASE_NOW
  );
  assert.equal(available.expiryStatus, 'Available');
  assert.equal(available.urgencyColor, 'green');

  const expiringSoon = getExpiryMetrics(
    new Date(BASE_NOW + 120 * 60000).toISOString(),
    BASE_NOW
  );
  assert.equal(expiringSoon.expiryStatus, 'Expiring Soon');
  assert.equal(expiringSoon.urgencyColor, 'yellow');

  const expired = getExpiryMetrics(
    new Date(BASE_NOW - 10 * 60000).toISOString(),
    BASE_NOW
  );
  assert.equal(expired.expiryStatus, 'Expired');
  assert.equal(expired.urgencyColor, 'red');
});

test('Smart NGO matching computes high score for nearby compatible NGO and flags ineligible storage', () => {
  const match = calculateNgoMatch(sampleDonation, sampleNgo, BASE_NOW);
  assert.equal(match.eligible, true);
  assert.ok(match.totalScore >= 85);
  assert.equal(match.remainingCapacity, 200);

  const frozenDonation: FoodDonation = {
    ...sampleDonation,
    storageCondition: 'Frozen (-18°C)',
  };
  const ineligibleMatch = calculateNgoMatch(frozenDonation, sampleNgo, BASE_NOW);
  assert.equal(ineligibleMatch.eligible, false);
  assert.ok(ineligibleMatch.ineligibleReason?.includes('Frozen'));
});

test('Form validation enforces separate expiry and collection window constraints', () => {
  const emptyCheck = validateDonationInput({}, BASE_NOW);
  assert.equal(emptyCheck.valid, false);
  assert.ok(emptyCheck.errors.donorName);
  assert.ok(emptyCheck.errors.expiryTimeISO);

  // Pickup window ending AFTER food expiry must fail validation
  const windowAfterExpiry = validateDonationInput(
    {
      donorName: 'Aarti Joshi',
      organizationName: 'Symbiosis Mess',
      foodName: 'Dal Rice & Sabzi',
      category: 'Cooked Meals',
      quantityMeals: 100,
      locationArea: 'Viman Nagar, Pune',
      storageCondition: 'Hot Insulated (60°C+)',
      preparationTimeISO: new Date(BASE_NOW - 30 * 60000).toISOString(),
      expiryTimeISO: new Date(BASE_NOW + 120 * 60000).toISOString(),
      pickupWindowStartISO: new Date(BASE_NOW + 30 * 60000).toISOString(),
      pickupWindowEndISO: new Date(BASE_NOW + 180 * 60000).toISOString(), // exceeds expiry!
    },
    BASE_NOW
  );
  assert.equal(windowAfterExpiry.valid, false);
  assert.ok(windowAfterExpiry.errors.pickupWindowEndISO);
});

test('Inventory reservation prevents overbooking and expired reservations, and transitions through completion', () => {
  // Overbooking check
  const overbook = reserveDonationQuantity(sampleDonation, sampleNgo, 180, BASE_NOW);
  assert.equal(overbook.success, false);

  // Valid partial reservation
  const reserved = reserveDonationQuantity(sampleDonation, sampleNgo, 90, BASE_NOW);
  assert.equal(reserved.success, true);
  assert.equal(reserved.updatedDonation?.availableQuantity, 60);
  assert.equal(reserved.updatedDonation?.reservedQuantity, 90);
  assert.equal(reserved.updatedDonation?.status, 'Reserved');

  // Schedule pickup outside window fails
  const badSchedule = scheduleDonationPickup(
    reserved.updatedDonation!,
    sampleNgo.name,
    new Date(BASE_NOW + 160 * 60000).toISOString(), // after pickupWindowEnd (+120m)
    BASE_NOW
  );
  assert.equal(badSchedule.success, false);

  // Schedule pickup inside window succeeds
  const goodSchedule = scheduleDonationPickup(
    reserved.updatedDonation!,
    sampleNgo.name,
    new Date(BASE_NOW + 60 * 60000).toISOString(),
    BASE_NOW
  );
  assert.equal(goodSchedule.success, true);
  assert.equal(goodSchedule.updatedDonation?.status, 'Scheduled');

  // Collect food updates collectedQuantity and clears reservedQuantity
  const collected = advanceDonationStatus(
    goodSchedule.updatedDonation!,
    'Collected',
    sampleNgo.name,
    BASE_NOW
  );
  assert.equal(collected.success, true);
  assert.equal(collected.updatedDonation?.collectedQuantity, 90);
  assert.equal(collected.updatedDonation?.reservedQuantity, 0);
  assert.equal(collected.updatedDonation?.availableQuantity, 60);

  // Impact summary reflects collected meals
  const summary = calculateImpactSummary([collected.updatedDonation!], [sampleNgo], BASE_NOW);
  assert.equal(summary.totalMealsCollected, 90);
  assert.equal(summary.completedDonationsCount, 1);
});

test('hydrateDonationsFromFirestore joins donations, reservations, and pickupSchedules snapshots', () => {
  const pickupISO = new Date(BASE_NOW + 45 * 60000).toISOString();
  const hydrated = hydrateDonationsFromFirestore(
    [
      {
        id: 'don_live_1',
        donorUid: 'uid_donor_1',
        organizationName: 'MIT Hostel Mess',
        foodName: 'Masala Khichdi & Kadhi',
        category: 'Cooked Meals',
        originalQuantity: 120,
        availableQuantity: 40,
        reservedQuantity: 80,
        collectedQuantity: 0,
        storageCondition: 'Hot Insulated (60°C+)',
        locationArea: 'Kothrud, Pune',
        expiryTimeISO: new Date(BASE_NOW + 180 * 60000).toISOString(),
        pickupWindowStartISO: new Date(BASE_NOW + 15 * 60000).toISOString(),
        pickupWindowEndISO: new Date(BASE_NOW + 120 * 60000).toISOString(),
        status: 'Scheduled',
        visibility: 'network',
        createdAtISO: new Date(BASE_NOW - 10 * 60000).toISOString(),
        updatedAtISO: new Date(BASE_NOW).toISOString(),
      },
    ],
    [
      {
        id: 'res_live_1',
        donationId: 'don_live_1',
        donorUid: 'uid_donor_1',
        ngoUid: 'uid_ngo_1',
        ngoName: 'Annapurna Seva Foundation',
        mealsReserved: 80,
        status: 'Scheduled',
        createdAtISO: new Date(BASE_NOW - 5 * 60000).toISOString(),
      },
    ],
    [
      {
        id: 'sched_live_1',
        donationId: 'don_live_1',
        reservationId: 'res_live_1',
        donorUid: 'uid_donor_1',
        ngoUid: 'uid_ngo_1',
        pickupTimeISO: pickupISO,
        status: 'Scheduled',
        createdAtISO: new Date(BASE_NOW - 2 * 60000).toISOString(),
      },
    ],
    [sampleNgo],
    BASE_NOW
  );

  assert.equal(hydrated.length, 1);
  assert.equal(hydrated[0].id, 'don_live_1');
  assert.equal(hydrated[0].isDemoData, false);
  assert.equal(hydrated[0].availableQuantity, 40);
  assert.equal(hydrated[0].reservedQuantity, 80);
  assert.equal(hydrated[0].matchedNgoName, 'Annapurna Seva Foundation');
  assert.equal(hydrated[0].scheduledPickupTimeISO, pickupISO);
  assert.equal(hydrated[0].reservations.length, 1);
  assert.equal(hydrated[0].reservations[0].pickupTimeISO, pickupISO);
  assert.ok(hydrated[0].statusHistory.length >= 3);
});

test('Donor Official Document Verification validates Commercial, Institutional, and Individual documents', () => {
  const commercialDocs = getRequiredDocumentsForCategory('Commercial');
  assert.ok(commercialDocs.includes('FSSAI License Number / Certificate'));

  const institutionalDocs = getRequiredDocumentsForCategory('Institutional');
  assert.ok(institutionalDocs.includes('Authorized College / Hostel ID'));

  const individualDocs = getRequiredDocumentsForCategory('Individual');
  assert.ok(individualDocs.includes('Official Govt Photo ID (Driving License)'));

  const validCommercial = validateDonorVerificationInput({
    organizationCategory: 'Commercial',
    documentType: 'FSSAI License Number / Certificate',
    documentNumber: 'FSSAI-21524089001421',
    contactPerson: 'Rajesh Deshmukh',
    contactPhone: '+91 98230 11401',
    contactEmail: 'rajesh@kothrudbanquet.in',
    pickupGateAddress: 'Gate 2 Loading Bay, Karve Road, Kothrud, Pune',
  });
  assert.equal(validCommercial.valid, true);

  const invalidDocMismatch = validateDonorVerificationInput({
    organizationCategory: 'Individual',
    documentType: 'FSSAI License Number / Certificate', // mismatch for Individual
    documentNumber: 'DL-123456',
    contactPerson: 'Rajesh Deshmukh',
    contactPhone: '+91 98230 11401',
    contactEmail: 'rajesh@kothrudbanquet.in',
    pickupGateAddress: 'Gate 2 Loading Bay, Karve Road, Kothrud, Pune',
  });
  assert.equal(invalidDocMismatch.valid, false);
});

test('Donor Contact Details are always completely visible to NGOs while NGO vehicle details unlock upon reservation', () => {
  const listedBatchWithDonorFields: FoodDonation = {
    ...sampleDonation,
    donorPhone: '+91 98110 44210',
    donorEmail: 'arvind.sharma@du-hostel.edu.in',
    pickupGateAddress:
      'Central Mess Block, Gate 2 Loading Bay, Chhatra Marg, North Campus, Delhi 110007',
  };

  // 1. Before Reservation ('Listed' status, 0 reservations): Donor details are 100% unmasked
  assert.equal(isContactUnlockedForBatch(listedBatchWithDonorFields), false);
  const initialContacts = getTwoWayContactDetails(listedBatchWithDonorFields, [sampleNgo]);
  assert.equal(initialContacts.unlocked, false);
  assert.equal(initialContacts.ngoSideSeesDonor.organizationName, 'Delhi University Central Hostel');
  assert.equal(initialContacts.ngoSideSeesDonor.contactPerson, 'Prof. Arvind Sharma');
  assert.equal(initialContacts.ngoSideSeesDonor.phoneNumber, '+91 98110 44210');
  assert.equal(initialContacts.ngoSideSeesDonor.email, 'arvind.sharma@du-hostel.edu.in');
  assert.ok(initialContacts.ngoSideSeesDonor.exactPickupGateAddress.includes('Gate 2 Loading Bay'));
  assert.ok(initialContacts.ngoSideSeesDonor.whatsappUrl.startsWith('https://wa.me/919811044210'));

  // NGO vehicle details seen by Donor remain masked until reservation
  assert.ok(initialContacts.donorSideSeesNgo.coordinatorName.includes('•'));
  assert.ok(initialContacts.donorSideSeesNgo.contactNumber.includes('•'));
  assert.ok(initialContacts.donorSideSeesNgo.pickupVehicleDetails.includes('Locked'));

  // 2. After Reservation ('Reserved' status): Both sides are completely unlocked
  const reserveResult = reserveDonationQuantity(listedBatchWithDonorFields, sampleNgo, 75, BASE_NOW);
  assert.equal(reserveResult.success, true);
  const reservedBatch = reserveResult.updatedDonation!;

  assert.equal(isContactUnlockedForBatch(reservedBatch), true);
  const unlockedContacts = getTwoWayContactDetails(reservedBatch, [sampleNgo]);
  assert.equal(unlockedContacts.unlocked, true);
  assert.equal(unlockedContacts.ngoSideSeesDonor.contactPerson, 'Prof. Arvind Sharma');
  assert.equal(unlockedContacts.ngoSideSeesDonor.phoneNumber, '+91 98110 44210');
  assert.equal(unlockedContacts.donorSideSeesNgo.coordinatorName, 'Raghavendra Verma');
  assert.equal(unlockedContacts.donorSideSeesNgo.contactNumber, '+91 98112 52109');
  assert.ok(!unlockedContacts.donorSideSeesNgo.pickupVehicleDetails.includes('Locked'));
});



