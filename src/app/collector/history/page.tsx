"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getCampaigns,
  getPledges,
  getPickups,
  getUsersBySociety,
  getSociety,
} from "@/lib/services";
import {
  Session,
  Campaign,
  Pledge,
  Pickup,
  User,
  Society,
  WasteMaterial,
  PickupStatus,
} from "@/types";
import { CollectorNavbar } from "@/components/CollectorNavbar";

interface HistoryItem {
  id: string;
  pickup: Pickup;
  pledge: Pledge | undefined;
  campaign: Campaign | undefined;
  resident: User | undefined;
}

export default function CollectorHistoryPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [societyUsers, setSocietyUsers] = useState<User[]>([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "MISSED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadHistoryData() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.push("/login");
          return;
        }

        if (currentSession.user.role !== "COLLECTOR") {
          router.push(getRedirectPathForRole(currentSession.user.role));
          return;
        }

        setSession(currentSession);
        await initializeDatabase();

        const societyId = currentSession.society.id;

        const [
          loadedSociety,
          loadedCampaigns,
          allPledges,
          allPickups,
          loadedUsers,
        ] = await Promise.all([
          getSociety(societyId),
          getCampaigns(societyId),
          getPledges(),
          getPickups(),
          getUsersBySociety(societyId),
        ]);

        // Strict Society Data Isolation
        const societyCampaignIds = new Set(loadedCampaigns.map((c) => c.id));
        const societyPledges = allPledges.filter((p) => societyCampaignIds.has(p.campaignId));
        const societyPickups = allPickups.filter((p) => societyCampaignIds.has(p.campaignId));

        setSociety(loadedSociety || currentSession.society);
        setCampaigns(loadedCampaigns);
        setPledges(societyPledges);
        setPickups(societyPickups);
        setSocietyUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading collector history:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHistoryData();
  }, [router]);

  const campaignMap = useMemo(() => {
    const map = new Map<string, Campaign>();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  const pledgeMap = useMemo(() => {
    const map = new Map<string, Pledge>();
    pledges.forEach((p) => map.set(p.id, p));
    return map;
  }, [pledges]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    societyUsers.forEach((u) => map.set(u.id, u));
    return map;
  }, [societyUsers]);

  // Only completed and missed pickups constitute history
  const historyItems = useMemo<HistoryItem[]>(() => {
    return pickups
      .filter((p) => p.status === "COMPLETED" || p.status === "MISSED")
      .map((pkp) => {
        const pledge = pledgeMap.get(pkp.pledgeId);
        const campaign = campaignMap.get(pkp.campaignId);
        const resident = userMap.get(pkp.residentId);

        return {
          id: pkp.id,
          pickup: pkp,
          pledge,
          campaign,
          resident,
        };
      })
      .sort((a, b) => {
        const dateA = a.pickup.completedAt ? new Date(a.pickup.completedAt).getTime() : 0;
        const dateB = b.pickup.completedAt ? new Date(b.pickup.completedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [pickups, pledgeMap, campaignMap, userMap]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      if (statusFilter !== "ALL" && item.pickup.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const resName = item.resident?.name.toLowerCase() || "";
        const resUnit = item.resident?.unitOrFlat?.toLowerCase() || "";
        const campTitle = item.campaign?.title.toLowerCase() || "";
        return resName.includes(q) || resUnit.includes(q) || campTitle.includes(q);
      }

      return true;
    });
  }, [historyItems, statusFilter, searchQuery]);

  // Overall metrics
  const completedCount = useMemo(() => {
    return historyItems.filter((h) => h.pickup.status === "COMPLETED").length;
  }, [historyItems]);

  const missedCount = useMemo(() => {
    return historyItems.filter((h) => h.pickup.status === "MISSED").length;
  }, [historyItems]);

  const totalCollectedKg = useMemo(() => {
    const total = historyItems
      .filter((h) => h.pickup.status === "COMPLETED" && h.pickup.actualWeight !== null)
      .reduce((sum, h) => sum + (h.pickup.actualWeight || 0), 0);
    return Math.round(total * 10) / 10;
  }, [historyItems]);

  const getMaterialBadge = (material: WasteMaterial) => {
    switch (material) {
      case "E_WASTE":
        return (
          <span key={material} className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold">
            ⚡ E-Waste
          </span>
        );
      case "PLASTIC":
        return (
          <span key={material} className="rounded-md bg-teal-100 text-teal-800 px-1.5 py-0.5 text-[10px] font-semibold">
            🧴 Plastic
          </span>
        );
      case "PAPER":
        return (
          <span key={material} className="rounded-md bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-semibold">
            📰 Paper
          </span>
        );
      case "CARDBOARD":
        return (
          <span key={material} className="rounded-md bg-orange-100 text-orange-800 px-1.5 py-0.5 text-[10px] font-semibold">
            📦 Cardboard
          </span>
        );
      case "METAL":
        return (
          <span key={material} className="rounded-md bg-slate-200 text-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
            🥫 Metal
          </span>
        );
      case "GLASS":
        return (
          <span key={material} className="rounded-md bg-cyan-100 text-cyan-800 px-1.5 py-0.5 text-[10px] font-semibold">
            🍶 Glass
          </span>
        );
      default:
        return (
          <span key={material} className="rounded-md bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-medium">
            {material}
          </span>
        );
    }
  };

  const getStatusBadge = (status: PickupStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
            ✓ Collected
          </span>
        );
      case "MISSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-200">
            ✕ Missed
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 text-2xl animate-pulse mb-3">
          📜
        </div>
        <p className="text-sm font-semibold">Loading collector history...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/15 to-slate-50 font-sans pb-16">
      <CollectorNavbar session={session} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 mb-1">
              <Link href="/collector" className="hover:underline">
                Collector Portal
              </Link>
              <span>/</span>
              <span className="text-slate-500">Service History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Doorstep Service & Scale Log History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Historical ledger of completed weigh-ins and missed door visits handled for {society?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/collector/pickups"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800 transition"
            >
              <span>🚚 Live Route Manifest</span>
            </Link>
          </div>
        </div>

        {/* ---------------- 1. TOP SUMMARY CARDS ---------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Total Handled</span>
              <span className="text-base">📜</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {historyItems.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pickups serviced or closed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Completed Pickups</span>
              <span className="text-base">✓</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-teal-800">
              {completedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {historyItems.length > 0 ? Math.round((completedCount / historyItems.length) * 100) : 0}% success completion rate
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Missed Pickups</span>
              <span className="text-base">✕</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-red-700">
              {missedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Door closed / resident unavailable
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-teal-900 to-teal-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal-300">
              <span>Total Waste Hauled</span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {totalCollectedKg} <span className="text-xs font-semibold text-teal-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-teal-200/80">
              Certified scale collection total
            </p>
          </div>
        </section>

        {/* ---------------- 2. STATUS FILTER PILLS & SEARCH BAR ---------------- */}
        <section className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(["ALL", "COMPLETED", "MISSED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-4 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                  statusFilter === st
                    ? "bg-teal-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "ALL" && `All Records (${historyItems.length})`}
                {st === "COMPLETED" && `✓ Completed (${completedCount})`}
                {st === "MISSED" && `✕ Missed (${missedCount})`}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by resident name, flat, or drive..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </section>

        {/* ---------------- 3. HISTORY LIST (MOBILE CARDS + DESKTOP TABLE) ---------------- */}
        {filteredHistory.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl mb-3">
              📜
            </div>
            <h3 className="text-base font-bold text-slate-800">No service records found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? `No history entries match "${searchQuery}".` : "No completed or missed pickup history on record yet."}
            </p>
            {(statusFilter !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <section className="space-y-4">
            {/* --- Mobile View (Cards: 360px - 768px) --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.campaign?.title || "Society Drive"}
                    </span>
                    {getStatusBadge(item.pickup.status)}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-lg shrink-0">
                      {item.resident?.avatar || "👤"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.resident?.name || "Resident"}</p>
                      <p className="text-[11px] font-semibold text-teal-800">{item.resident?.unitOrFlat || "Flat Resident"}</p>
                    </div>
                  </div>

                  {item.pledge && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Materials:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.pledge.materials.map((m) => getMaterialBadge(m))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-100 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated</p>
                      <p className="font-bold text-slate-800">{item.pledge?.estimatedWeight || 0} kg</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Actual Scale</p>
                      <p className="font-extrabold text-teal-800">
                        {item.pickup.actualWeight !== null ? `${item.pickup.actualWeight} kg ✓` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-mono">
                      📅 {item.pickup.completedAt ? new Date(item.pickup.completedAt).toLocaleString() : item.campaign?.pickupDate}
                    </span>
                    <Link
                      href={`/collector/pickups/${item.id}`}
                      className="text-teal-700 font-bold hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* --- Desktop View (Table: >= 768px) --- */}
            <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Campaign Drive</th>
                    <th className="py-4 px-6">Resident & Flat</th>
                    <th className="py-4 px-6">Materials</th>
                    <th className="py-4 px-6 text-right">Est. Weight</th>
                    <th className="py-4 px-6 text-right">Actual Scale Weight</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Completed Date/Time</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{item.campaign?.title || "Society Drive"}</p>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.resident?.avatar || "👤"}</span>
                          <div>
                            <p className="font-bold text-slate-900">{item.resident?.name || "Resident"}</p>
                            <p className="text-[10px] font-semibold text-teal-800">{item.resident?.unitOrFlat || "Flat Resident"}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.pledge?.materials.map((m) => getMaterialBadge(m))}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right font-bold text-slate-700">
                        {item.pledge?.estimatedWeight || 0} kg
                      </td>

                      <td className="py-4 px-6 text-right">
                        {item.pickup.actualWeight !== null ? (
                          <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {item.pickup.actualWeight} kg ✓
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {getStatusBadge(item.pickup.status)}
                      </td>

                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        {item.pickup.completedAt
                          ? new Date(item.pickup.completedAt).toLocaleString()
                          : item.campaign?.pickupDate || "—"}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/collector/pickups/${item.id}`}
                          className="inline-block rounded-xl bg-slate-100 hover:bg-teal-700 hover:text-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

