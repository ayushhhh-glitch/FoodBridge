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
  type FoodDonation,
  type NGOProfile,
} from './matchingEngine';

const BASE_NOW = new Date('2026-10-24T12:00:00.000Z').getTime();

const sampleNgo: NGOProfile = {
  id: 'ngo-test-1',
  name: 'Annapurna Seva Foundation',
  area: 'Kothrud, Pune',
  address: 'Paud Road, Kothrud, Pune',
  lat: 18.5074,
  lng: 73.8077,
  maxMealCapacity: 300,
  currentLoadMeals: 100,
  acceptedCategories: ['Cooked Meals', 'Bakery & Bread'],
  supportedStorage: ['Hot Insulated (60°C+)', 'Ambient / Room Temp'],
  operatingHoursStart: 7,
  operatingHoursEnd: 22,
  contactPerson: 'Meera Kulkarni',
  phone: '+91 98220 11223',
  availableForPickup: true,
  isDemoData: true,
  registrationLabel: 'Demo Partner — Sample Record',
};

const sampleDonation: FoodDonation = {
  id: 'don-test-1',
  donorName: 'Rajesh Deshmukh',
  organizationName: 'Kothrud Banquet Kitchen',
  donorType: 'Event / Banquet',
  foodName: 'Veg Pulao & Paneer Masala',
  category: 'Cooked Meals',
  originalQuantity: 150,
  availableQuantity: 150,
  reservedQuantity: 0,
  collectedQuantity: 0,
  preparationTimeISO: new Date(BASE_NOW - 60 * 60000).toISOString(),
  expiryTimeISO: new Date(BASE_NOW + 180 * 60000).toISOString(), // +3 hours
  pickupWindowStartISO: new Date(BASE_NOW + 15 * 60000).toISOString(), // +15 mins
  pickupWindowEndISO: new Date(BASE_NOW + 120 * 60000).toISOString(), // +2 hours
  locationArea: 'Kothrud, Pune',
  address: 'Karve Road, Kothrud, Pune',
  lat: 18.5085,
  lng: 73.8120,
  storageCondition: 'Hot Insulated (60°C+)',
  status: 'Listed',
  isDemoData: true,
  reservations: [],
  statusHistory: [
    {
      status: 'Listed',
      timestampISO: new Date(BASE_NOW).toISOString(),
      actor: 'Rajesh Deshmukh',
      note: 'Initial listing',
    },
  ],
};

test('Haversine distance calculates realistic km distance in Pune', () => {
  const distSameArea = calculateHaversineDistanceKm(18.5074, 73.8077, 18.5085, 73.8120);
  assert.ok(distSameArea >= 0 && distSameArea < 1.5);

  // Kothrud to Viman Nagar (~13 km)
  const distCrossCity = calculateHaversineDistanceKm(18.5074, 73.8077, 18.5679, 73.9143);
  assert.ok(distCrossCity > 10 && distCrossCity < 16);
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
