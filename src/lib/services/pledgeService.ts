import { db } from "@/lib/db";
import { Pledge, PledgeStatus } from "@/types";

export async function getPledges(campaignId?: string): Promise<Pledge[]> {
  if (campaignId) {
    return await db.pledges.where("campaignId").equals(campaignId).toArray();
  }
  return await db.pledges.toArray();
}

export async function getPledgesByResident(residentId: string): Promise<Pledge[]> {
  return await db.pledges.where("residentId").equals(residentId).toArray();
}

export async function getPledgeById(id: string): Promise<Pledge | undefined> {
  return await db.pledges.get(id);
}

export async function createPledge(
  pledge: Omit<Pledge, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<string> {
  const newPledge: Pledge = {
    ...pledge,
    id: pledge.id || `pld_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    createdAt: pledge.createdAt || new Date().toISOString(),
  };

  await db.pledges.put(newPledge);
  return newPledge.id;
}

export async function updatePledgeStatus(id: string, status: PledgeStatus): Promise<number> {
  return await db.pledges.update(id, { status });
}
