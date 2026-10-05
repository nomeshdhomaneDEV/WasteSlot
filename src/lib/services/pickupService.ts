import { db } from "@/lib/db";
import { Pickup, PickupStatus } from "@/types";

export async function getPickups(campaignId?: string): Promise<Pickup[]> {
  if (campaignId) {
    return await db.pickups.where("campaignId").equals(campaignId).toArray();
  }
  return await db.pickups.toArray();
}

export async function getPickupsByCollector(collectorId: string): Promise<Pickup[]> {
  return await db.pickups.where("collectorId").equals(collectorId).toArray();
}

export async function getPickupsByResident(residentId: string): Promise<Pickup[]> {
  return await db.pickups.where("residentId").equals(residentId).toArray();
}

export async function getPickupById(id: string): Promise<Pickup | undefined> {
  return await db.pickups.get(id);
}

export async function createPickup(
  pickup: Omit<Pickup, "id"> & { id?: string }
): Promise<string> {
  const newPickup: Pickup = {
    ...pickup,
    id: pickup.id || `pkp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
  };

  await db.pickups.put(newPickup);
  return newPickup.id;
}

export async function completePickup(id: string, actualWeight: number): Promise<void> {
  const pickup = await db.pickups.get(id);
  if (!pickup) {
    throw new Error(`Pickup with id ${id} not found.`);
  }

  const completedAt = new Date().toISOString();

  await db.transaction("rw", [db.pickups, db.pledges], async () => {
    // 1. Update pickup with actual weight and completed status
    await db.pickups.update(id, {
      actualWeight,
      status: "COMPLETED",
      completedAt,
    });

    // 2. Automatically update corresponding pledge to COLLECTED
    if (pickup.pledgeId) {
      await db.pledges.update(pickup.pledgeId, {
        status: "COLLECTED",
      });
    }
  });
}

export async function updatePickupStatus(id: string, status: PickupStatus): Promise<number> {
  return await db.pickups.update(id, { status });
}
