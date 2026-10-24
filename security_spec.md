# FoodBridge Zero-Trust Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants & Relational Ownership

1. **Global Default-Deny Safety Net**: Every path not explicitly matched defaults to `allow read, write: if false;`.
2. **PII Isolation (`/users/{userId}`)**:
   - User profiles contain PII (`email`, `phone`).
   - Only the authenticated owner (`request.auth.uid == userId`) can `get`, `create`, or `update` their own profile document.
   - `list` and `delete` on `/users` are strictly prohibited to prevent user enumeration and accidental deletion.
   - `accountRole` (`'donor'` or `'ngo'`), `uid`, and `createdAt` are immutable after creation to prevent self-assigned role escalation.
3. **NGO Profiles (`/ngos/{ngoId}`)**:
   - Can only be created by an authenticated user whose `/users/$(request.auth.uid)` profile has `accountRole == 'ngo'` and `ownerUid == request.auth.uid`.
   - Updates are restricted to the NGO owner (`existing().ownerUid == request.auth.uid`) or transactional load updates with strict `affectedKeys().hasOnly(...)`.
4. **Donations (`/donations/{donationId}`)**:
   - Can only be created by an authenticated user with `donorUid == request.auth.uid`, valid positive meal quantities (`originalQuantity >= 5 && originalQuantity <= 5000`), and initial inventory balance (`availableQuantity == originalQuantity && reservedQuantity == 0 && collectedQuantity == 0`).
   - Terminal State Lock: Once `existing().status in ['Completed', 'Expired']`, no further updates are permitted.
   - Inventory Conservation Invariant: On every update, `incoming().originalQuantity == existing().originalQuantity` and `incoming().availableQuantity + incoming().reservedQuantity + incoming().collectedQuantity == existing().originalQuantity`, with all quantities `>= 0`.
5. **Reservations (`/reservations/{reservationId}`)**:
   - Created by an authenticated NGO (`ngoUid == request.auth.uid`), referencing an existing `/donations/$(incoming().donationId)` document.
   - Terminal State Lock: Cannot be modified once `existing().status == 'Completed'`.
6. **Pickup Schedules (`/pickupSchedules/{scheduleId}`)**:
   - Created by an authenticated NGO (`ngoUid == request.auth.uid`), referencing an existing `/donations/$(incoming().donationId)` and `/reservations/$(incoming().reservationId)`.
   - Readable (`get` / `list`) only by the involved donor (`resource.data.donorUid == request.auth.uid`) or the assigned NGO (`resource.data.ngoUid == request.auth.uid`).

---

## 2. The "Dirty Dozen" Attack Payloads

1. **Payload 1 (Identity Spoofing on User Registration)**: Authenticated user `uid_attacker` attempts to create `/users/uid_victim` or set `uid: "uid_victim"`. -> `PERMISSION_DENIED`
2. **Payload 2 (PII Enumeration / Cross-User Read)**: Authenticated user `uid_attacker` attempts `get(/users/uid_victim)` or `list(/users)`. -> `PERMISSION_DENIED`
3. **Payload 3 (Self-Assigned Role Escalation on Update)**: User attempts to update `accountRole` from `'donor'` to `'ngo'` on `/users/uid_attacker`. -> `PERMISSION_DENIED`
4. **Payload 4 (Shadow / Ghost Field Injection)**: Donor creates `/donations/don_1` including an undeclared field `isVerifiedAdmin: true`. -> `PERMISSION_DENIED`
5. **Payload 5 (Client Timestamp Forgery)**: Donor creates `/donations/don_1` with a forged past or future `createdAt` not matching `request.time`. -> `PERMISSION_DENIED`
6. **Payload 6 (Negative Inventory / Overbooking Attack)**: NGO updates `/donations/don_1` with `availableQuantity: -20, reservedQuantity: 220` on a 200-meal batch. -> `PERMISSION_DENIED`
7. **Payload 7 (Terminal State Mutation)**: User attempts to update `/donations/don_completed` after its `status` is already `'Completed'` or `'Expired'`. -> `PERMISSION_DENIED`
8. **Payload 8 (Orphaned Reservation Creation)**: NGO attempts to create `/reservations/res_1` referencing a non-existent `donationId: "don_nonexistent"`. -> `PERMISSION_DENIED`
9. **Payload 9 (Resource / ID Poisoning)**: Attacker sends a 500-character string or special path characters in `foodName` or document ID. -> `PERMISSION_DENIED`
10. **Payload 10 (Immortal Field Tampering)**: Donor or NGO attempts to modify `donorUid` or `originalQuantity` during an update on `/donations/don_1`. -> `PERMISSION_DENIED`
11. **Payload 11 (Unauthorized Schedule Scraping)**: Third-party user `uid_stranger` attempts to read `/pickupSchedules/sched_1` where they are neither `donorUid` nor `ngoUid`. -> `PERMISSION_DENIED`
12. **Payload 12 (Value Poisoning on Whitelisted Update Key)**: NGO updates whitelisted `status` field on `/reservations/res_1` with an invalid status `"HackedStatus"`. -> `PERMISSION_DENIED`
