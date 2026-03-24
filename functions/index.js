const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule }        = require("firebase-functions/v2/scheduler");
const { setGlobalOptions }  = require("firebase-functions");
const admin                 = require("firebase-admin");

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