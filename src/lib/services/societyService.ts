import { db } from "@/lib/db";
import { Society } from "@/types";

export async function getSociety(id: string): Promise<Society | undefined> {
  return await db.societies.get(id);
}

export async function getAllSocieties(): Promise<Society[]> {
  return await db.societies.toArray();
}

export async function createOrUpdateSociety(society: Society): Promise<string> {
  return await db.societies.put(society);
}
