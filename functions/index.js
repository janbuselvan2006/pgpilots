const { onDocumentDeleted, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

// ─────────────────────────────────────────────────────────────
// FUNCTION 1 — onOwnerDeleted
//
// This runs AUTOMATICALLY the moment a pgOwners document
// is deleted from Firestore. You never call this manually.
//
// It cleans up:
//   ✅ All subcollections (staff, pgs, tenants, rooms, bills)
//   ✅ Top-level staffAccounts records
//   ✅ Firebase Auth users for all staff
// ─────────────────────────────────────────────────────────────
exports.onOwnerDeleted = onDocumentDeleted(
  "pgOwners/{ownerId}",
  async (event) => {
    const ownerId = event.params.ownerId;
    console.log(`Owner deleted: ${ownerId} — starting cleanup...`);

    // ── Step A: Delete all subcollections inside pgOwners/{ownerId} ──
    const subcollections = [
      "staff",
      "pgs",
      "tenants",
      "rooms",
      "electricityBills",
      "payments",
    ];

    for (const col of subcollections) {
      const snap = await db
        .collection("pgOwners")
        .doc(ownerId)
        .collection(col)
        .get();

      for (const document of snap.docs) {
        await document.ref.delete();
        console.log(`Deleted ${col}/${document.id}`);
      }

      console.log(`Finished deleting subcollection: ${col}`);
    }

    // ── Step B: Delete staff from top-level staffAccounts ──
    // This is the separate collection used for staff login
    const staffSnap = await db
      .collection("staffAccounts")
      .where("ownerId", "==", ownerId)
      .get();

    console.log(`Found ${staffSnap.size} staff accounts to delete`);

    for (const document of staffSnap.docs) {
      const staffUid = document.data().staffUid;

      // 1. Delete the Firestore staffAccounts record
      await document.ref.delete();
      console.log(`Deleted staffAccount doc: ${document.id}`);

      // 2. Delete the Firebase Auth user
      //    so they cannot login even if something was missed
      try {
        await admin.auth().deleteUser(staffUid);
        console.log(`Deleted Auth user: ${staffUid}`);
      } catch (e) {
        // Already deleted or never existed — that's fine
        console.warn(`Auth user not found (skipping): ${staffUid}`);
      }
    }

    console.log(`Cleanup complete for owner: ${ownerId} ✅`);
  }
);


// ─────────────────────────────────────────────────────────────
// FUNCTION 2 — scheduledHardDelete
//
// Runs automatically every day at midnight.
//
// When an owner clicks "Delete my account" in your app,
// you set isDeleted: true (soft delete).
//
// This function finds accounts that were soft-deleted
// more than 30 days ago and permanently wipes them.
//
// Deleting the doc triggers FUNCTION 1 above automatically —
// so everything gets cleaned up in a chain.
// ─────────────────────────────────────────────────────────────
exports.scheduledHardDelete = onSchedule("every 24 hours", async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const snap = await db
    .collection("pgOwners")
    .where("isDeleted", "==", true)
    .where("deletedAt", "<=", thirtyDaysAgo)
    .get();

  console.log(`Found ${snap.size} accounts ready for hard delete`);

  for (const document of snap.docs) {
    // Deleting this triggers onOwnerDeleted above
    // which cleans up ALL subcollections automatically
    await document.ref.delete();
    console.log(`Hard deleted owner: ${document.id}`);
  }

  console.log("Scheduled hard delete complete ✅");
});

// ─────────────────────────────────────────────────────────────
// FUNCTION 3 — onRoomWritten
//
// Triggered whenever a room is added, updated, or deleted.
// It recalculates the owner's current_bed_count and updates
// max_bed_count_this_month if the current count exceeds the max.
// ─────────────────────────────────────────────────────────────
exports.onRoomWritten = onDocumentWritten(
  "rooms/{roomId}",
  async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();

    // Get ownerId from either new or old data
    const ownerId = newData?.ownerId || oldData?.ownerId;
    if (!ownerId) return;

    console.log(`Recalculating beds for owner: ${ownerId}`);

    // Get all rooms for this owner
    const roomsSnap = await db.collection("rooms")
      .where("ownerId", "==", ownerId)
      .get();

    let totalBeds = 0;
    roomsSnap.forEach(doc => {
      totalBeds += (doc.data().totalBeds || 0);
    });

    const ownerRef = db.collection("pgOwners").doc(ownerId);

    await db.runTransaction(async (transaction) => {
      const ownerDoc = await transaction.get(ownerRef);
      if (!ownerDoc.exists) return;

      const ownerData = ownerDoc.data();
      const currentMax = ownerData.max_beds_this_month || 0;

      const updates = {
        current_beds: totalBeds,
      };

      if (totalBeds > currentMax) {
        updates.max_beds_this_month = totalBeds;
      }

      transaction.update(ownerRef, updates);
    });

    console.log(`Owner ${ownerId}: current_bed_count=${totalBeds}`);
  }
);

// ─────────────────────────────────────────────────────────────
// FUNCTION 4 — monthlyBilling
//
// Runs at midnight on the 1st of every month.
// 1. Calculates bill for each owner based on peak usage.
// 2. Creates an invoice in the 'billing' collection.
// 3. Resets max_bed_count_this_month to current_bed_count.
// ─────────────────────────────────────────────────────────────
exports.monthlyBilling = onSchedule(
  { schedule: "0 0 1 * *", timeZone: "Asia/Kolkata" },
  async () => {
  console.log("Starting monthly billing cycle...");

  // 1. Get current price per bed from settings
  const settingsSnap = await db.collection("settings").doc("billing").get();
  const settings = settingsSnap.exists ? settingsSnap.data() : { price_per_bed: 8 };
  const defaultPricePerBed = settings.price_per_bed;

  // 2. Process all owners
  const ownersSnap = await db.collection("pgOwners")
    .where("isAdmin", "==", false)
    .where("isDeleted", "==", false)
    .get();

  const now = new Date();
  // We are billing for the previous month
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthName = lastMonthDate.toLocaleString('default', { month: 'long' });
  const year = lastMonthDate.getFullYear();
  const monthKey = `${monthName}_${year}`;

  const batch = db.batch();

  for (const ownerDoc of ownersSnap.docs) {
    const ownerData = ownerDoc.data();
    const ownerId = ownerDoc.id;
    const maxBeds = ownerData.max_beds_this_month || ownerData.current_beds || 0;
    const currentBeds = ownerData.current_beds || 0;
    const pricePerBed = ownerData.price_per_bed || defaultPricePerBed;

    // Skip if no beds used
    if (maxBeds === 0) {
      // Still reset the max count for the new month
      batch.update(ownerDoc.ref, { max_bed_count_this_month: currentBeds });
      continue;
    }

    // Create billing record
    const billRef = db.collection("billing").doc(`${ownerId}_${monthKey}`);

    // Check if bill already exists to prevent duplicates
    const existingBill = await billRef.get();
    if (existingBill.exists) {
      console.log(`Bill already exists for owner ${ownerId} for ${monthKey}. Skipping.`);
      continue;
    }

    const totalAmount = maxBeds * pricePerBed;

    batch.set(billRef, {
      owner_id: ownerId,
      owner_name: ownerData.name || "Unknown",
      pg_name: ownerData.pgName || "Unknown",
      month: monthName,
      year: year,
      max_beds_used: maxBeds,
      price_per_bed: pricePerBed,
      total_amount: totalAmount,
      status: "unpaid",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Reset peak usage for the new month
    batch.update(ownerDoc.ref, {
      max_beds_this_month: currentBeds,
    });
  }

  await batch.commit();
  console.log("Monthly billing cycle complete ✅");
});

exports.recalculateOwnerBeds = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("Unauthorized");
  }

  const requestedOwnerId = request.data?.ownerId || request.auth.uid;
  const callerId = request.auth.uid;

  if (requestedOwnerId !== callerId) {
    const callerSnap = await db.collection("pgOwners").doc(callerId).get();
    if (!callerSnap.exists || !callerSnap.data().isAdmin) {
      throw new Error("Unauthorized");
    }
  }

  const roomsSnap = await db.collection("rooms")
    .where("ownerId", "==", requestedOwnerId)
    .get();

  let totalBeds = 0;
  roomsSnap.forEach(doc => {
    totalBeds += (doc.data().totalBeds || 0);
  });

  const ownerRef = db.collection("pgOwners").doc(requestedOwnerId);

  const result = await db.runTransaction(async (transaction) => {
    const ownerDoc = await transaction.get(ownerRef);
    if (!ownerDoc.exists) {
      return { current_beds: 0, max_beds_this_month: 0 };
    }

    const ownerData = ownerDoc.data();
    const currentMax = ownerData.max_beds_this_month || 0;
    const updates = {
      current_beds: totalBeds,
    };

    if (totalBeds > currentMax) {
      updates.max_beds_this_month = totalBeds;
    }

    transaction.update(ownerRef, updates);

    return {
      current_beds: totalBeds,
      max_beds_this_month: Math.max(totalBeds, currentMax),
    };
  });

  return result;
});

// Delete staff auth users for a specific owner (called from owner settings)
exports.deleteStaffAccounts = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("Unauthorized");
  }

  const staffUids = Array.isArray(request.data?.staffUids) ? request.data.staffUids : [];
  if (staffUids.length === 0) {
    return { deleted: 0 };
  }

  // Only allow deleting staff that belong to the caller
  const staffSnap = await db.collection("staffAccounts")
    .where("ownerId", "==", request.auth.uid)
    .get();
  const allowed = new Set(staffSnap.docs.map(d => d.data().staffUid));

  let deleted = 0;
  for (const staffUid of staffUids) {
    if (!allowed.has(staffUid)) continue;
    try {
      await admin.auth().deleteUser(staffUid);
      deleted += 1;
    } catch (e) {
      console.warn(`Auth user not found (skipping): ${staffUid}`);
    }
  }

  return { deleted };
});
