import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import mongoose from "mongoose";

/**
 * One-time migration: MealEntry.halfPairs used to be [string, string][]
 * tuples. It's now an array of { names, variant, price } objects, priced per
 * the food-variant feature. Existing documents still have the old shape —
 * convert them, preserving totalAmount/mealCount exactly (variant: null,
 * price: that entry's own pricePerMeal reproduces the old math).
 */
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (create .env.local)");
  const dryRun = process.argv.includes("--dry-run");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");
  const collection = db.collection("mealentries");

  const docs = await collection.find({ "halfPairs.0": { $type: "array" } }).toArray();
  console.log(`Found ${docs.length} entries with legacy tuple halfPairs.`);

  for (const doc of docs) {
    const pricePerMeal: number = doc.pricePerMeal;
    const halfPairs = (doc.halfPairs as [string, string][]).map((names) => ({
      names,
      variant: null,
      price: pricePerMeal,
    }));
    console.log(`  ${doc._id}: ${JSON.stringify(doc.halfPairs)}`);
    if (!dryRun) {
      await collection.updateOne({ _id: doc._id }, { $set: { halfPairs } });
    }
  }

  console.log(dryRun ? "Dry run only — no writes made." : `Migrated ${docs.length} entries.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
