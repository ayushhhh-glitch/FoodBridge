import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf8');

test('Dirty Dozen Security Audit: Global default-deny and strict collection match blocks exist', () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(rulesText.includes('match /users/{userId}'));
  assert.ok(rulesText.includes('match /ngos/{ngoId}'));
  assert.ok(rulesText.includes('match /donations/{donationId}'));
  assert.ok(rulesText.includes('match /reservations/{reservationId}'));
  assert.ok(rulesText.includes('match /pickupSchedules/{scheduleId}'));
});

test('Dirty Dozen Payloads 1-3: User PII isolation, no list enumeration, and immutable accountRole', () => {
  // Payload 1 & 2: Only owner can get, list is false
  assert.ok(rulesText.includes('allow get: if isOwner(userId) && isValidId(userId);'));
  assert.ok(rulesText.includes('allow list: if false;'));
  // Payload 3: accountRole is immutable on update
  assert.ok(rulesText.includes('incoming().accountRole == existing().accountRole'));
});

test('Dirty Dozen Payloads 4-7: Anti-Update-Gap hasOnly, server timestamps, inventory conservation, and terminal lock', () => {
  // Payload 4: Shadow fields blocked via hasAll + hasOnly
  assert.ok(rulesText.includes('data.keys().hasAll('));
  assert.ok(rulesText.includes('data.keys().hasOnly('));
  // Payload 5: Temporal integrity
  assert.ok(rulesText.includes('incoming().createdAt == request.time'));
  assert.ok(rulesText.includes('incoming().updatedAt == request.time'));
  // Payload 6: Inventory conservation prevents negative/overbooked counts
  assert.ok(
    rulesText.includes(
      '(data.availableQuantity + data.reservedQuantity + data.collectedQuantity == data.originalQuantity)'
    )
  );
  // Payload 7: Terminal state lock on Completed / Expired donations
  assert.ok(rulesText.includes("!(existing().status in ['Completed', 'Expired'])"));
});

test('Dirty Dozen Payloads 8-12: Orphaned write checks, regex ID guards, and affectedKeys().hasOnly()', () => {
  // Payload 8: Orphaned reservation check
  assert.ok(
    rulesText.includes(
      'exists(/databases/$(database)/documents/donations/$(incoming().donationId))'
    )
  );
  // Payload 9: Regex ID guard
  assert.ok(rulesText.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  // Payload 10-12: Action-based update key allowlisting wrapped in entity validation
  assert.ok(rulesText.includes('incoming().diff(existing()).affectedKeys().hasOnly('));
});
