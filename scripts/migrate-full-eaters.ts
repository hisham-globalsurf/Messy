import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import mongoose from "mongoose";

/**
 * One-time migration: MealEntry.fullEaters used to be string[] (just names).
 * It's now an array of { name, variant, price, count } objects, priced per
 * the food-variant feature. Existing documents still have the old shape —
 * convert them, preserving totalAmount/mealCount exactly (variant: null,
 * count: 1, price: that entry's own pricePerMeal reproduces the old math).
 */
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (create .env.local)");
  const dryRun = process.argv.includes("--dry-run");

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");
  const collection = db.collection("mealentries");

  const docs = await collection.find({ "fullEaters.0": { $type: "string" } }).toArray();
  console.log(`Found ${docs.length} entries with legacy string[] fullEaters.`);

  for (const doc of docs) {
    const pricePerMeal: number = doc.pricePerMeal;
    const fullEaters = (doc.fullEaters as string[]).map((name) => ({
      name,
      variant: null,
      price: pricePerMeal,
      count: 1,
    }));
    console.log(`  ${doc._id}: ${doc.fullEaters.join(", ") || "(none)"}`);
    if (!dryRun) {
      await collection.updateOne({ _id: doc._id }, { $set: { fullEaters } });
    }
  }

  console.log(dryRun ? "Dry run only — no writes made." : `Migrated ${docs.length} entries.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
