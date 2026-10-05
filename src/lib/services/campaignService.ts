import { db } from "@/lib/db";
import { Campaign, CampaignStatus } from "@/types";

export async function getCampaigns(societyId?: string): Promise<Campaign[]> {
  if (societyId) {
    return await db.campaigns.where("societyId").equals(societyId).toArray();
  }
  return await db.campaigns.toArray();
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  return await db.campaigns.get(id);
}

export async function getCampaignsByStatus(status: CampaignStatus, societyId?: string): Promise<Campaign[]> {
  const all = await getCampaigns(societyId);
  return all.filter((c) => c.status === status);
}

export async function createCampaign(
  campaign: Omit<Campaign, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<string> {
  const newCampaign: Campaign = {
    ...campaign,
    id: campaign.id || `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    createdAt: campaign.createdAt || new Date().toISOString(),
  };

  await db.campaigns.put(newCampaign);
  return newCampaign.id;
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<number> {
  return await db.campaigns.update(id, { status });
}
