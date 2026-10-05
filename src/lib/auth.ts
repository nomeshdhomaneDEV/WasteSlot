import { User, Society, Session, UserRole } from "@/types";

export const DEMO_SOCIETY: Society = {
  id: "soc_gvr_001",
  name: "Green Valley Residency",
  address: "Baner-Pashan Link Road, Pashan",
  city: "Pune",
  totalHouseholds: 120,
  createdAt: "2026-01-15T00:00:00.000Z",
};

export const DEMO_USERS: (User & { passwordHint: string; roleLabel: string; description: string })[] = [
  {
    id: "user_res_001",
    name: "Aarav Sharma",
    email: "aarav@greenvalley.res",
    role: "RESIDENT",
    societyId: "soc_gvr_001",
    unitOrFlat: "Flat A-301",
    avatar: "👤",
    createdAt: "2026-02-01T00:00:00.000Z",
    passwordHint: "demo123",
    roleLabel: "Resident",
    description: "Pledges recyclables & tracks personal household CO₂ offsets",
  },
  {
    id: "user_res_002",
    name: "Priya Patel",
    email: "priya@greenvalley.res",
    role: "RESIDENT",
    societyId: "soc_gvr_001",
    unitOrFlat: "Flat B-402",
    avatar: "👩",
    createdAt: "2026-02-10T00:00:00.000Z",
    passwordHint: "demo123",
    roleLabel: "Resident",
    description: "Active eco-contributor & e-waste pledger",
  },
  {
    id: "user_adm_001",
    name: "Vikram Malhotra",
    email: "admin@greenvalley.res",
    role: "ADMIN",
    societyId: "soc_gvr_001",
    unitOrFlat: "Management Office",
    avatar: "🏛️",
    createdAt: "2026-01-15T00:00:00.000Z",
    passwordHint: "admin123",
    roleLabel: "Society Admin",
    description: "Creates campaigns, schedules drives & tracks society stats",
  },
  {
    id: "user_col_001",
    name: "Suresh Rao",
    email: "collector@fastrecycle.eco",
    role: "COLLECTOR",
    societyId: "soc_gvr_001",
    unitOrFlat: "FastRecycle Partner",
    avatar: "🚚",
    createdAt: "2026-01-20T00:00:00.000Z",
    passwordHint: "collector123",
    roleLabel: "Certified Collector",
    description: "Executes pickups, weighs scrap on-site & records actual weight",
  },
];

const SESSION_STORAGE_KEY = "wasteslot_active_session";

export function getDemoUsersByRole(role: UserRole) {
  return DEMO_USERS.filter((u) => u.role === role);
}

export function saveSession(user: User, society: Society = DEMO_SOCIETY): Session {
  const session: Session = {
    user,
    society,
    token: `demo_tok_${user.id}_${Date.now()}`,
    loginAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function getRedirectPathForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "COLLECTOR":
      return "/collector";
    case "RESIDENT":
    default:
      return "/resident";
  }
}
