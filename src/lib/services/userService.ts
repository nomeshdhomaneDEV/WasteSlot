import { db } from "@/lib/db";
import { User, UserRole } from "@/types";

export async function getUserById(id: string): Promise<User | undefined> {
  return await db.users.get(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return await db.users.where("email").equalsIgnoreCase(email.trim()).first();
}

export async function getUsersBySociety(societyId: string): Promise<User[]> {
  return await db.users.where("societyId").equals(societyId).toArray();
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  return await db.users.where("role").equals(role).toArray();
}

export async function createOrUpdateUser(user: User): Promise<string> {
  return await db.users.put(user);
}
