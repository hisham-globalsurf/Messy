import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import mongoose from "mongoose";
import { seed } from "../src/lib/db/seed";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (create .env.local)");
  await mongoose.connect(uri);
  await seed();
  console.log("✔ Seeded admin user + settings singleton.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
