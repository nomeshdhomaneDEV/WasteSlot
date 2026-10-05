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

export default function CollectorDashboardPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [societyUsers, setSocietyUsers] = useState<User[]>([]);

  useEffect(() => {
    async function loadCollectorData() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.push("/login");
          return;
        }

        // Verify role COLLECTOR
        if (currentSession.user.role !== "COLLECTOR") {
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
        ] = await Promise.all([
          getSociety(societyId),
          getCampaigns(societyId),
          getPledges(),
          getPickups(),
          getUsersBySociety(societyId),
        ]);

        // Society Data Isolation: Only show pickups and pledges belonging to campaigns in this society
        const societyCampaignIds = new Set(loadedCampaigns.map((c) => c.id));
        const societyPledges = allPledges.filter((p) => societyCampaignIds.has(p.campaignId));
        const societyPickups = allPickups.filter((p) => societyCampaignIds.has(p.campaignId));

        setSociety(loadedSociety || currentSession.society);
        setCampaigns(loadedCampaigns);
        setPledges(societyPledges);
        setPickups(societyPickups);
        setSocietyUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading collector dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCollectorData();
  }, [router]);

  // Lookup maps
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

  // Statistics calculation from real IndexedDB records
  const pendingPickupsCount = useMemo(() => {
    return pickups.filter((p) => p.status === "PENDING").length;
  }, [pickups]);

  const inProgressPickupsCount = useMemo(() => {
    return pickups.filter((p) => p.status === "IN_PROGRESS").length;
  }, [pickups]);

  const completedPickupsCount = useMemo(() => {
    return pickups.filter((p) => p.status === "COMPLETED").length;
  }, [pickups]);

  const totalWasteCollectedKg = useMemo(() => {
    const total = pickups
      .filter((p) => p.status === "COMPLETED" && p.actualWeight !== null)
      .reduce((sum, p) => sum + (p.actualWeight || 0), 0);
    return Math.round(total * 10) / 10;
  }, [pickups]);

  // Today's / Active Pickups Manifest
  // We include pending and in-progress pickups first, followed by today's items
  const activePickupsList = useMemo(() => {
    return pickups.map((pkp) => {
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
    }).sort((a, b) => {
      // Prioritize IN_PROGRESS and PENDING over COMPLETED
      const order: Record<PickupStatus, number> = {
        IN_PROGRESS: 0,
        PENDING: 1,
        MISSED: 2,
        COMPLETED: 3,
      };
      return (order[a.pickup.status] ?? 4) - (order[b.pickup.status] ?? 4);
    });
  }, [pickups, pledgeMap, campaignMap, userMap]);

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
          🚚
        </div>
        <p className="text-sm font-semibold">Loading collector route manifest...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/15 to-slate-50 font-sans pb-16">
      <CollectorNavbar session={session} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-0.5 text-xs font-bold text-teal-800 mb-2">
              <span>🚚</span> Assigned Society: {society?.name || session.society.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Collector Doorstep Manifest & Routes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Field operator console for real-time household pickups, material validation, and certified weigh-in logging.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/collector/pickups"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800 transition"
            >
              <span>📋 View Full Manifest ({pickups.length})</span>
            </Link>
          </div>
        </div>

        {/* ----------------- 1. FOUR KPI SUMMARY CARDS ----------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Today's / Active Pickups */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Active Route Pickups</span>
              <span className="text-base">📍</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {pendingPickupsCount + inProgressPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {inProgressPickupsCount} in progress, {pendingPickupsCount} queued
            </p>
          </div>

          {/* Card 2: Pending Pickups */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Pending Pickups</span>
              <span className="text-base">⏳</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-amber-700">
              {pendingPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Doorstep scale visits pending
            </p>
          </div>

          {/* Card 3: Completed Pickups */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Completed Pickups</span>
              <span className="text-base">✓</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-teal-800">
              {completedPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Verified & scale recorded
            </p>
          </div>

          {/* Card 4: Total Waste Collected (kg) */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-teal-900 to-teal-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal-300">
              <span>Total Collected</span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {totalWasteCollectedKg} <span className="text-xs font-semibold text-teal-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-teal-200/80">
              Cumulative certified scale haul
            </p>
          </div>
        </section>

        {/* ----------------- 2. ACTIVE PICKUPS MANIFEST ----------------- */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Today&apos;s Pickup Manifest</h2>
              <p className="text-xs text-slate-500">
                Scheduled household collections for {society?.name} drives
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {activePickupsList.length} total pickup logs
              </span>
            </div>
          </div>

          {activePickupsList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl mb-3">
                🚚
              </div>
              <h3 className="text-base font-bold text-slate-800">No pickups scheduled</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active pickup pledges found for this society. Check back once society admins schedule drives.
              </p>
            </div>
          ) : (
            <>
              {/* --- Mobile View (Cards: 360px - 768px) --- */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {activePickupsList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.campaign?.title || "Society Drive"}
                      </span>
                      {getPickupStatusBadge(item.pickup.status)}
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
                        <p className="font-extrabold text-teal-800">
                          {item.pickup.actualWeight !== null ? `${item.pickup.actualWeight} kg ✓` : "Pending Weigh-in"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-mono">
                        📅 {item.campaign?.pickupDate} ({item.campaign?.pickupTime || "Standard Window"})
                      </span>
                    </div>

                    <Link
                      href={`/collector/pickups/${item.id}`}
                      className="block w-full text-center rounded-xl bg-teal-700 hover:bg-teal-800 text-white py-2.5 text-xs font-bold transition shadow-xs"
                    >
                      {item.pickup.status === "PENDING" && "Start Pickup →"}
                      {item.pickup.status === "IN_PROGRESS" && "Continue Pickup →"}
                      {item.pickup.status === "COMPLETED" && "View Completed Record →"}
                      {item.pickup.status === "MISSED" && "View Missed Record →"}
                    </Link>
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
                      <th className="py-4 px-6">Pickup Schedule</th>
                      <th className="py-4 px-6">Pledged Materials</th>
                      <th className="py-4 px-6 text-right">Est. Weight</th>
                      <th className="py-4 px-6 text-right">Scale Weight</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePickupsList.map((item) => (
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

                        <td className="py-4 px-6 font-mono text-slate-600">
                          <p className="font-semibold text-slate-900">{item.campaign?.pickupDate}</p>
                          <p className="text-[10px] text-slate-500">{item.campaign?.pickupTime}</p>
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
                            <span className="text-slate-400 italic">Pending weigh-in</span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center">
                          {getPickupStatusBadge(item.pickup.status)}
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
            </>
          )}
        </section>
      </main>
    </div>
  );
}
