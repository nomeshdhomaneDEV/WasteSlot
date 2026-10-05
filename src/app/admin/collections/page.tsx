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
  getUsersByRole,
  getSociety,
} from "@/lib/services";
import {
  Session,
  User,
  Campaign,
  Pledge,
  Pickup,
  PickupStatus,
  Society,
  WasteMaterial,
} from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

interface CollectionItem {
  pickup: Pickup;
  pledge: Pledge | undefined;
  campaign: Campaign | undefined;
  resident: User | undefined;
  collector: User | undefined;
}

export default function AdminCollectionsPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [societyUsers, setSocietyUsers] = useState<User[]>([]);
  const [allCollectors, setAllCollectors] = useState<User[]>([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<"ALL" | PickupStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>("ALL");

  useEffect(() => {
    async function loadCollectionsData() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.push("/login");
          return;
        }

        if (currentSession.user.role !== "ADMIN") {
          router.push(getRedirectPathForRole(currentSession.user.role));
          return;
        }

        setSession(currentSession);
        await initializeDatabase();

        const societyId = currentSession.society.id;

        // Fetch data concurrently from IndexedDB
        const [
          loadedSociety,
          loadedCampaigns,
          allPledges,
          allPickups,
          loadedUsers,
          collectors,
        ] = await Promise.all([
          getSociety(societyId),
          getCampaigns(societyId),
          getPledges(),
          getPickups(),
          getUsersBySociety(societyId),
          getUsersByRole("COLLECTOR"),
        ]);

        // Security / Data Isolation: Filter campaigns, pledges, and pickups strictly for this society
        const societyCampaignIds = new Set(loadedCampaigns.map((c) => c.id));
        const societyPledges = allPledges.filter((p) => societyCampaignIds.has(p.campaignId));
        const societyPickups = allPickups.filter((p) => societyCampaignIds.has(p.campaignId));

        setSociety(loadedSociety || currentSession.society);
        setCampaigns(loadedCampaigns);
        setPledges(societyPledges);
        setPickups(societyPickups);
        setSocietyUsers(loadedUsers);
        setAllCollectors(collectors);
      } catch (error) {
        console.error("Error loading admin collections data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCollectionsData();
  }, [router]);

  // Lookup maps for fast access
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
    allCollectors.forEach((c) => map.set(c.id, c));
    return map;
  }, [societyUsers, allCollectors]);

  // Combined collection item list
  const collectionItems = useMemo<CollectionItem[]>(() => {
    return pickups.map((pkp) => {
      const pledge = pledgeMap.get(pkp.pledgeId);
      const campaign = campaignMap.get(pkp.campaignId);
      const resident = userMap.get(pkp.residentId);
      const collector = userMap.get(pkp.collectorId);

      return {
        pickup: pkp,
        pledge,
        campaign,
        resident,
        collector,
      };
    });
  }, [pickups, pledgeMap, campaignMap, userMap]);

  // Summary Metrics calculated directly from real IndexedDB records
  const totalEstimatedKg = useMemo(() => {
    return collectionItems.reduce((acc, curr) => acc + (curr.pledge?.estimatedWeight || 0), 0);
  }, [collectionItems]);

  const totalCollectedKg = useMemo(() => {
    return collectionItems.reduce((acc, curr) => acc + (curr.pickup.actualWeight || 0), 0);
  }, [collectionItems]);

  const completedPickupsCount = useMemo(() => {
    return collectionItems.filter((item) => item.pickup.status === "COMPLETED").length;
  }, [collectionItems]);

  const pendingPickupsCount = useMemo(() => {
    return collectionItems.filter(
      (item) => item.pickup.status === "PENDING" || item.pickup.status === "IN_PROGRESS"
    ).length;
  }, [collectionItems]);

  // Filtered collections based on status, campaign, and search query
  const filteredCollections = useMemo(() => {
    return collectionItems.filter((item) => {
      // 1. Status filter
      if (statusFilter !== "ALL" && item.pickup.status !== statusFilter) {
        return false;
      }

      // 2. Campaign filter
      if (selectedCampaignFilter !== "ALL" && item.pickup.campaignId !== selectedCampaignFilter) {
        return false;
      }

      // 3. Search query (Resident name, unit, email, collector name, campaign title)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const resName = item.resident?.name.toLowerCase() || "";
        const resUnit = item.resident?.unitOrFlat?.toLowerCase() || "";
        const campTitle = item.campaign?.title.toLowerCase() || "";
        const colName = item.collector?.name.toLowerCase() || "";

        return (
          resName.includes(query) ||
          resUnit.includes(query) ||
          campTitle.includes(query) ||
          colName.includes(query)
        );
      }

      return true;
    });
  }, [collectionItems, statusFilter, selectedCampaignFilter, searchQuery]);

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

  const getPickupStatusBadge = (status: PickupStatus) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
            ✓ Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
            In Progress
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
            ⏳ Pending
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          🚚
        </div>
        <p className="text-sm font-semibold">Loading society collections manifest...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-16">
      <AdminNavbar session={session} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
              <Link href="/admin" className="hover:underline">
                Admin Console
              </Link>
              <span>/</span>
              <span className="text-slate-500">Pickup Manifest</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Society Collections & Weigh-in Manifest
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Real-time audit log of collector pickups, resident hand-offs, certified scale measurements, and status records for {society?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/admin/campaigns"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>📋 All Campaigns</span>
            </Link>
          </div>
        </div>

        {/* ---------------- 1. FOUR METRICS CARDS ---------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Total Estimated</span>
              <span className="text-base">📋</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {Math.round(totalEstimatedKg * 10) / 10} <span className="text-xs font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total resident pledged weight
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-300">
              <span>Total Collected</span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {Math.round(totalCollectedKg * 10) / 10} <span className="text-xs font-semibold text-emerald-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Certified scale weigh-in total
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Completed Pickups</span>
              <span className="text-base">✓</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-800">
              {completedPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Successfully collected & verified
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Pending / Active</span>
              <span className="text-base">⏳</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-700">
              {pendingPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Awaiting collector doorstep pickup
            </p>
          </div>
        </section>

        {/* ---------------- 2. STATUS & CAMPAIGN FILTERS + SEARCH ---------------- */}
        <section className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {(["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "MISSED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === st
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" && "All Statuses"}
                  {st === "PENDING" && "⏳ Pending"}
                  {st === "IN_PROGRESS" && "⚡ In Progress"}
                  {st === "COMPLETED" && "✓ Completed"}
                  {st === "MISSED" && "✕ Missed"}
                </button>
              ))}
            </div>

            {/* Campaign Select & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <select
                value={selectedCampaignFilter}
                onChange={(e) => setSelectedCampaignFilter(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Society Campaigns</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.pickupDate})
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resident, flat, collector..."
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- 3. COLLECTIONS LIST (MOBILE CARDS + DESKTOP TABLE) ---------------- */}
        {filteredCollections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl mb-3">
              🚚
            </div>
            <h3 className="text-base font-bold text-slate-800">No collection records found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No pickup records match the selected status filter or search keywords.
            </p>
            {(statusFilter !== "ALL" || selectedCampaignFilter !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setSelectedCampaignFilter("ALL");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <section className="space-y-4">
            {/* --- Mobile View (Cards: 360px - 768px) --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredCollections.map((item) => (
                <div
                  key={item.pickup.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {item.campaign?.title || "Society Campaign"}
                    </span>
                    {getPickupStatusBadge(item.pickup.status)}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-lg shrink-0">
                      {item.resident?.avatar || "👤"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.resident?.name || "Resident"}</p>
                      <p className="text-[11px] font-semibold text-emerald-800">{item.resident?.unitOrFlat || "Flat Resident"}</p>
                    </div>
                  </div>

                  {item.pledge && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Pledged Materials:
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
                      <p className="font-extrabold text-emerald-800">
                        {item.pickup.actualWeight !== null ? `${item.pickup.actualWeight} kg ✓` : "Pending"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="truncate">
                      🚚 {item.collector?.name || "FastRecycle Partner"}
                    </span>
                    <span className="font-mono">
                      {item.pickup.completedAt
                        ? new Date(item.pickup.completedAt).toLocaleDateString()
                        : item.campaign?.pickupDate || "Scheduled"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* --- Desktop View (Table: >= 768px) --- */}
            <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Campaign & Date</th>
                    <th className="py-4 px-6">Resident & Flat</th>
                    <th className="py-4 px-6">Materials</th>
                    <th className="py-4 px-6 text-right">Est. Weight</th>
                    <th className="py-4 px-6 text-right">Actual Weight</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Collector</th>
                    <th className="py-4 px-6 text-right">Completion Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCollections.map((item) => (
                    <tr key={item.pickup.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900">{item.campaign?.title || "Society Campaign"}</p>
                        <p className="text-[11px] text-slate-500 font-mono">📅 {item.campaign?.pickupDate || "Drive"}</p>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.resident?.avatar || "👤"}</span>
                          <div>
                            <p className="font-bold text-slate-900">{item.resident?.name || "Resident"}</p>
                            <p className="text-[10px] font-semibold text-emerald-800">{item.resident?.unitOrFlat || "Flat Resident"}</p>
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
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.pickup.actualWeight} kg ✓
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending weigh-in</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {getPickupStatusBadge(item.pickup.status)}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">🚚</span>
                          <span className="font-medium text-slate-800">
                            {item.collector?.name || "FastRecycle Partner"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        {item.pickup.completedAt ? (
                          <span className="text-emerald-900 font-semibold">
                            {new Date(item.pickup.completedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">In progress</span>
                        )}
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
