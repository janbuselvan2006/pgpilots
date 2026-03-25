const admin = require("firebase-admin");
const serviceAccount = require("./functions/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function backfillBedCounts() {
  console.log("Starting backfill for bed counts...");
  const ownersSnap = await db.collection("pgOwners").get();
  const roomsSnap = await db.collection("rooms").get();

  // Group rooms by owner Id
  const bedsByOwner = {};
  roomsSnap.forEach(doc => {
    const data = doc.data();
    const ownerId = data.ownerId;
    if (ownerId) {
      bedsByOwner[ownerId] = (bedsByOwner[ownerId] || 0) + (data.totalBeds || 0);
    }
  });

  const batch = db.batch();
  let count = 0;

  ownersSnap.forEach(doc => {
    const ownerId = doc.id;
    const currentBeds = bedsByOwner[ownerId] || 0;
    const data = doc.data();

    // If max_bed_count_this_month exists and is larger, keep it, otherwise update it
    const maxBeds = Math.max(currentBeds, data.max_bed_count_this_month || 0);

    batch.update(doc.ref, {
      current_bed_count: currentBeds,
      max_bed_count_this_month: maxBeds
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Updated ${count} owners with their current bed counts!`);
  } else {
    console.log("No owners needed updating.");
  }
}

backfillBedCounts().then(() => {
  console.log("Done");
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
