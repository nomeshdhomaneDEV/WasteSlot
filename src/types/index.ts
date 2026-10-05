export type UserRole = "RESIDENT" | "ADMIN" | "COLLECTOR";

export type CampaignStatus = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type PledgeStatus = "PLEDGED" | "SCHEDULED" | "COLLECTED" | "CANCELLED";
export type PickupStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "MISSED";

export type WasteMaterial =
  | "E_WASTE"
  | "PLASTIC"
  | "PAPER"
  | "METAL"
  | "GLASS"
  | "CARDBOARD";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  societyId: string;
  avatar: string;
  unitOrFlat?: string;
  createdAt: string;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  city: string;
  totalHouseholds: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  societyId: string;
  title: string;
  description: string;
  pickupDate: string;
  pickupTime: string;
  acceptedMaterials: WasteMaterial[];
  status: CampaignStatus;
  collectionInstructions: string;
  createdAt: string;
}

export interface Pledge {
  id: string;
  campaignId: string;
  residentId: string;
  materials: WasteMaterial[];
  estimatedWeight: number; // in kg
  status: PledgeStatus;
  createdAt: string;
}

export interface Pickup {
  id: string;
  pledgeId: string;
  campaignId: string;
  residentId: string;
  collectorId: string;
  actualWeight: number | null; // in kg (null if not yet collected)
  status: PickupStatus;
  completedAt?: string | null;
}

export interface Session {
  user: User;
  society: Society;
  token: string;
  loginAt: string;
}

// Impact Calculation Summary
export interface ImpactStats {
  totalPledgedKg: number;
  totalCollectedKg: number;
  completedPickupsCount: number;
  co2SavedKg: number;
  treesSavedEquivalent: number;
  waterSavedLitres: number;
  activeHouseholdsCount: number;
  materialsBreakdown: Record<WasteMaterial, number>;
}
