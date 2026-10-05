import { db } from "@/lib/db";
import { ImpactStats, WasteMaterial } from "@/types";

const INITIAL_MATERIALS_BREAKDOWN: Record<WasteMaterial, number> = {
  E_WASTE: 0,
  PLASTIC: 0,
  PAPER: 0,
  METAL: 0,
  GLASS: 0,
  CARDBOARD: 0,
};

export async function getSocietyImpactStats(societyId: string): Promise<ImpactStats> {
  const campaigns = await db.campaigns.where("societyId").equals(societyId).toArray();
  const campaignIds = new Set(campaigns.map((c) => c.id));

  const allPledges = await db.pledges.toArray();
  const societyPledges = allPledges.filter((p) => campaignIds.has(p.campaignId));

  const allPickups = await db.pickups.toArray();
  const societyPickups = allPickups.filter((p) => campaignIds.has(p.campaignId));

  let totalPledgedKg = 0;
  let totalCollectedKg = 0;
  let completedPickupsCount = 0;
  const activeResidents = new Set<string>();
  const materialsBreakdown: Record<WasteMaterial, number> = { ...INITIAL_MATERIALS_BREAKDOWN };

  // Calculate pledges & material distribution
  for (const pledge of societyPledges) {
    totalPledgedKg += pledge.estimatedWeight || 0;
    activeResidents.add(pledge.residentId);

    const weightPerMaterial = (pledge.estimatedWeight || 0) / (pledge.materials.length || 1);
    for (const material of pledge.materials) {
      if (materialsBreakdown[material] !== undefined) {
        materialsBreakdown[material] += weightPerMaterial;
      }
    }
  }

  // Calculate actual collected from completed pickups
  for (const pickup of societyPickups) {
    if (pickup.status === "COMPLETED" && pickup.actualWeight !== null) {
      totalCollectedKg += pickup.actualWeight;
      completedPickupsCount += 1;
    }
  }

  // Round metrics to 1 decimal place
  totalPledgedKg = Math.round(totalPledgedKg * 10) / 10;
  totalCollectedKg = Math.round(totalCollectedKg * 10) / 10;

  return {
    totalPledgedKg,
    totalCollectedKg,
    completedPickupsCount,
    co2SavedKg: Math.round(totalCollectedKg * 2.1 * 10) / 10,
    treesSavedEquivalent: Math.round(totalCollectedKg * 0.04 * 10) / 10,
    waterSavedLitres: Math.round(totalCollectedKg * 18.5),
    activeHouseholdsCount: activeResidents.size,
    materialsBreakdown,
  };
}

export async function getResidentImpactStats(residentId: string): Promise<ImpactStats> {
  const residentPledges = await db.pledges.where("residentId").equals(residentId).toArray();
  const residentPickups = await db.pickups.where("residentId").equals(residentId).toArray();

  let totalPledgedKg = 0;
  let totalCollectedKg = 0;
  let completedPickupsCount = 0;
  const materialsBreakdown: Record<WasteMaterial, number> = { ...INITIAL_MATERIALS_BREAKDOWN };

  for (const pledge of residentPledges) {
    totalPledgedKg += pledge.estimatedWeight || 0;

    const weightPerMaterial = (pledge.estimatedWeight || 0) / (pledge.materials.length || 1);
    for (const material of pledge.materials) {
      if (materialsBreakdown[material] !== undefined) {
        materialsBreakdown[material] += weightPerMaterial;
      }
    }
  }

  for (const pickup of residentPickups) {
    if (pickup.status === "COMPLETED" && pickup.actualWeight !== null) {
      totalCollectedKg += pickup.actualWeight;
      completedPickupsCount += 1;
    }
  }

  totalPledgedKg = Math.round(totalPledgedKg * 10) / 10;
  totalCollectedKg = Math.round(totalCollectedKg * 10) / 10;

  return {
    totalPledgedKg,
    totalCollectedKg,
    completedPickupsCount,
    co2SavedKg: Math.round(totalCollectedKg * 2.1 * 10) / 10,
    treesSavedEquivalent: Math.round(totalCollectedKg * 0.04 * 10) / 10,
    waterSavedLitres: Math.round(totalCollectedKg * 18.5),
    activeHouseholdsCount: 1,
    materialsBreakdown,
  };
}
