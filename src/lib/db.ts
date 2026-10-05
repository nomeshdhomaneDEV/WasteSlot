import Dexie, { type Table } from "dexie";
import { User, Society, Campaign, Pledge, Pickup } from "@/types";

export class WasteSlotDatabase extends Dexie {
  users!: Table<User, string>;
  societies!: Table<Society, string>;
  campaigns!: Table<Campaign, string>;
  pledges!: Table<Pledge, string>;
  pickups!: Table<Pickup, string>;

  constructor() {
    super("WasteSlotDB");

    this.version(1).stores({
      users: "id, email, role, societyId, createdAt",
      societies: "id, name, city, createdAt",
      campaigns: "id, societyId, status, pickupDate, createdAt",
      pledges: "id, campaignId, residentId, status, createdAt",
      pickups: "id, pledgeId, campaignId, residentId, collectorId, status, completedAt",
    });
  }
}

export const db = new WasteSlotDatabase();
