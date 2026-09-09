import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
}

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Reuse the connection across hot reloads / serverless invocations.
const globalWithMongoose = global as typeof globalThis & { _mongoose?: Cached };
const cached: Cached = globalWithMongoose._mongoose ?? { conn: null, promise: null };
globalWithMongoose._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, { bufferCommands: false });
  }

  cached.conn = await cached.promise;
  await ensureSeed();
  return cached.conn;
}

let seeded = false;

/** Lazily seed the admin account + settings singleton on first successful connection. */
async function ensureSeed(): Promise<void> {
  if (seeded) return;
  seeded = true;
  const { seed } = await import("./seed");
  await seed();
}
