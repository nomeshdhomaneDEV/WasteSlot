import { db } from "@/lib/db";
import {
  SEED_SOCIETY,
  SEED_USERS,
  SEED_CAMPAIGNS,
  SEED_PLEDGES,
  SEED_PICKUPS,
} from "@/lib/seedData";

/**
 * Initializes the local IndexedDB database.
 * Seeds initial demo data ONLY when the database is empty.
 * Never overwrites existing user data.
 */
export async function initializeDatabase(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const userCount = await db.users.count();

    if (userCount === 0) {
      // Database is empty, seed demo data
      await db.transaction("rw", [db.societies, db.users, db.campaigns, db.pledges, db.pickups], async () => {
        await db.societies.put(SEED_SOCIETY);
        await db.users.bulkPut(SEED_USERS);
        await db.campaigns.bulkPut(SEED_CAMPAIGNS);
        await db.pledges.bulkPut(SEED_PLEDGES);
        await db.pickups.bulkPut(SEED_PICKUPS);
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to initialize WasteSlot IndexedDB database:", error);
    return false;
  }
}

/**
 * Explicit reset utility for demo resets (only invoked upon explicit user request).
 */
export async function resetDatabaseToDemoSeed(): Promise<void> {
  if (typeof window === "undefined") return;

  await db.transaction("rw", [db.societies, db.users, db.campaigns, db.pledges, db.pickups], async () => {
    await db.societies.clear();
    await db.users.clear();
    await db.campaigns.clear();
    await db.pledges.clear();
    await db.pickups.clear();

    await db.societies.put(SEED_SOCIETY);
    await db.users.bulkPut(SEED_USERS);
    await db.campaigns.bulkPut(SEED_CAMPAIGNS);
    await db.pledges.bulkPut(SEED_PLEDGES);
    await db.pickups.bulkPut(SEED_PICKUPS);
  });
}
