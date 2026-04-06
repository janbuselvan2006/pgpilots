const { onDocumentDeleted, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

setGlobalOptions({ maxInstances: 10 });

const setCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
};

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

// Generate a secure onboarding token for a PG (owner only)
exports.createOnboardingToken = onCall(async (request) => {
  if (!request.auth) {
    throw new Error("Unauthorized");
  }

  const ownerId = request.auth.uid;
  const pgId = request.data?.pgId;
  if (!pgId) {
    throw new Error("Missing pgId");
  }

  const pgSnap = await db.collection("pgOwners").doc(ownerId).collection("pgs").doc(pgId).get();
  if (!pgSnap.exists) {
    throw new Error("PG not found");
  }

  const tokenRef = db.collection("onboardingTokens").doc();
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await tokenRef.set({
    ownerId,
    pgId,
    expiresAt,
    used: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { token: tokenRef.id, expiresAt: expiresAt.toDate().toISOString() };
});

// Public: Fetch onboarding data via token
exports.getOnboardingData = onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  const token = req.query.token || req.body?.token;
  if (!token) return res.status(400).json({ error: "Missing token" });

  const tokenSnap = await db.collection("onboardingTokens").doc(token).get();
  if (!tokenSnap.exists) return res.status(404).json({ error: "Invalid token" });
  const tokenData = tokenSnap.data();
  if (tokenData.used) return res.status(410).json({ error: "Token already used" });
  if (tokenData.expiresAt?.toDate && tokenData.expiresAt.toDate() < new Date()) {
    return res.status(410).json({ error: "Token expired" });
  }

  const ownerSnap = await db.collection("pgOwners").doc(tokenData.ownerId).get();
  const pgSnap = await db.collection("pgOwners").doc(tokenData.ownerId).collection("pgs").doc(tokenData.pgId).get();
  if (!pgSnap.exists) return res.status(404).json({ error: "PG not found" });

  const roomsSnap = await db.collection("rooms").where("pgId", "==", tokenData.pgId).get();
  const tenantsSnap = await db.collection("tenants").where("pgId", "==", tokenData.pgId).get();

  const ownerData = ownerSnap.exists ? ownerSnap.data() : {};
  return res.json({
    owner: ownerSnap.exists ? { phone: ownerData.phone || "", email: ownerData.email || ownerData.ownerEmail || "" } : {},
    pg: pgSnap.data(),
    rooms: roomsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    tenants: tenantsSnap.docs.map(d => ({
      roomNumber: d.data().roomNumber,
      bedNumber: d.data().bedNumber,
      status: d.data().status || "Active",
    })),
  });
});

// Public: Submit onboarding data via token
exports.submitOnboarding = onRequest(async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, form, family, pdfBase64 } = req.body || {};
  if (!token || !form) return res.status(400).json({ error: "Missing data" });
  if (!form.name || !form.phone || !form.roomNumber || !form.bedNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const tokenRef = db.collection("onboardingTokens").doc(token);
  const tokenSnap = await tokenRef.get();
  if (!tokenSnap.exists) return res.status(404).json({ error: "Invalid token" });
  const tokenData = tokenSnap.data();
  if (tokenData.used) return res.status(410).json({ error: "Token already used" });
  if (tokenData.expiresAt?.toDate && tokenData.expiresAt.toDate() < new Date()) {
    return res.status(410).json({ error: "Token expired" });
  }

  const ownerId = tokenData.ownerId;
  const pgId = tokenData.pgId;

  // Validate room/bed availability
  const roomSnap = await db.collection("rooms")
    .where("pgId", "==", pgId)
    .where("roomNumber", "==", form.roomNumber)
    .get();
  if (roomSnap.empty) return res.status(400).json({ error: "Room not found" });
  const roomDoc = roomSnap.docs[0];

  const tenantSnap = await db.collection("tenants")
    .where("pgId", "==", pgId)
    .where("roomNumber", "==", form.roomNumber)
    .where("bedNumber", "==", form.bedNumber)
    .get();
  const alreadyTaken = tenantSnap.docs.some(d => d.data().status !== "deleted");
  if (alreadyTaken) return res.status(409).json({ error: "Bed already occupied" });

  let pdfUrl = "";
  if (pdfBase64) {
    const buffer = Buffer.from(pdfBase64, "base64");
    const fileName = `${(form.admissionNumber || form.name || "tenant").toString().replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const file = bucket.file(`tenantForms/${ownerId}/${pgId}/${fileName}`);
    await file.save(buffer, { contentType: "application/pdf" });
    const [signedUrl] = await file.getSignedUrl({ action: "read", expires: "2036-01-01" });
    pdfUrl = signedUrl;
  }

  const tenantDoc = {
    ...form,
    ownerId,
    pgId,
    status: "Active",
    family: Array.isArray(family) ? family : [],
    onboardingPdfUrl: pdfUrl,
    onboardingSource: "qr",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("tenants").add(tenantDoc);
  await roomDoc.ref.update({ occupiedBeds: admin.firestore.FieldValue.increment(1) });
  await tokenRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

  return res.json({ ok: true, pdfUrl });
});
