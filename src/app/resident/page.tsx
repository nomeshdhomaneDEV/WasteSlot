"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getPledgesByResident,
  getPickupsByResident,
  getCampaigns,
  getResidentImpactStats,
} from "@/lib/services";
import { Session, Campaign, Pledge, Pickup, ImpactStats, WasteMaterial } from "@/types";
import { ResidentNavbar } from "@/components/ResidentNavbar";

export default function ResidentDashboard() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states from IndexedDB
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);

  // Modal detail state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Map campaigns for quick lookup
  const campaignMap = useMemo(() => {
    const map = new Map<string, Campaign>();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  // Load and verify session & database data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const currentSession = getSession();

        if (!currentSession) {
          router.push("/login");
          return;
        }

        // Role verification
        if (currentSession.user.role !== "RESIDENT") {
          router.push(getRedirectPathForRole(currentSession.user.role));
          return;
        }

        setSession(currentSession);

        // Ensure database is initialized
        await initializeDatabase();

        const residentId = currentSession.user.id;
        const societyId = currentSession.society.id;

        // Fetch data concurrently from IndexedDB services
        const [loadedCampaigns, loadedPledges, loadedPickups, loadedImpact] = await Promise.all([
          getCampaigns(societyId),
          getPledgesByResident(residentId),
          getPickupsByResident(residentId),
          getResidentImpactStats(residentId),
        ]);

        setCampaigns(loadedCampaigns);
        setPledges(loadedPledges);
        setPickups(loadedPickups);
        setImpactStats(loadedImpact);
      } catch (error) {
        console.error("Error loading resident dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  // Find next upcoming/active pickup for highlight card
  const upcomingPickup = useMemo(() => {
    const activePickup = pickups.find(
      (p) => p.status === "IN_PROGRESS" || p.status === "PENDING"
    );
    if (activePickup) {
      const linkedCampaign = campaignMap.get(activePickup.campaignId);
      return { pickup: activePickup, campaign: linkedCampaign };
    }

    // Otherwise show the first active or upcoming campaign
    const nextCampaign = campaigns.find((c) => c.status === "ACTIVE" || c.status === "UPCOMING");
    if (nextCampaign) {
      return { pickup: null, campaign: nextCampaign };
    }

    return null;
  }, [pickups, campaigns, campaignMap]);

  // Participated campaigns count
  const participatedCampaignsCount = useMemo(() => {
    const uniqueIds = new Set(pledges.map((p) => p.campaignId));
    return uniqueIds.size;
  }, [pledges]);

  // Upcoming pickups count
  const upcomingPickupsCount = useMemo(() => {
    return pickups.filter((p) => p.status === "PENDING" || p.status === "IN_PROGRESS").length;
  }, [pickups]);

  // Helper for material chip color
  const getMaterialBadge = (material: WasteMaterial) => {
    switch (material) {
      case "E_WASTE":
        return <span key={material} className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-semibold">⚡ E-Waste</span>;
      case "PLASTIC":
        return <span key={material} className="rounded-md bg-teal-100 text-teal-800 px-2 py-0.5 text-xs font-semibold">🧴 Plastic</span>;
      case "PAPER":
        return <span key={material} className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">📰 Paper</span>;
      case "CARDBOARD":
        return <span key={material} className="rounded-md bg-orange-100 text-orange-800 px-2 py-0.5 text-xs font-semibold">📦 Cardboard</span>;
      case "METAL":
        return <span key={material} className="rounded-md bg-slate-200 text-slate-800 px-2 py-0.5 text-xs font-semibold">🥫 Metal</span>;
      case "GLASS":
        return <span key={material} className="rounded-md bg-cyan-100 text-cyan-800 px-2 py-0.5 text-xs font-semibold">🍶 Glass</span>;
      default:
        return <span key={material} className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium">{material}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COLLECTED":
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">✓ Collected</span>;
      case "SCHEDULED":
      case "ACTIVE":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">● Active / Scheduled</span>;
      case "IN_PROGRESS":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">⏳ In Progress</span>;
      case "UPCOMING":
      case "PLEDGED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">📌 Pledged / Upcoming</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 animate-pulse text-2xl mb-4">
          ♻
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading your resident portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      {/* Shared Resident Navigation */}
      <ResidentNavbar session={session} />

      {/* -------------------- MAIN DASHBOARD CONTENT -------------------- */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Resident Portal • Green Valley Residency
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {greeting}, {session.user.name}!
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your household recycling and e-waste coordination hub.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 shadow-sm">
              <span>📍 {session.user.unitOrFlat || "Flat Resident"}</span>
            </span>
          </div>
        </div>

        {/* -------------------- 1. SUMMARY KPI CARDS -------------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Upcoming Pickups */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Upcoming Pickups
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-sm">
                🚚
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {upcomingPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {upcomingPickupsCount > 0 ? "Pickups in progress/scheduled" : "No active pickup pending"}
            </p>
          </div>

          {/* Card 2: My Pledges */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                My Pledges
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800 text-sm">
                📋
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {pledges.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {pledges.filter((p) => p.status === "COLLECTED").length} fulfilled pickups
            </p>
          </div>

          {/* Card 3: Collected Waste */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Collected Waste
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-sm">
                ⚖️
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-800">
              {impactStats?.totalCollectedKg ?? 0} <span className="text-sm font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {impactStats?.totalPledgedKg ?? 0} kg total pledged
            </p>
          </div>

          {/* Card 4: Environmental Impact */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                CO₂ Offset
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-emerald-200 text-sm">
                🌱
              </div>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {impactStats?.co2SavedKg ?? 0} <span className="text-sm font-semibold text-emerald-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              ≈ {impactStats?.treesSavedEquivalent ?? 0} trees saved
            </p>
          </div>
        </section>

        {/* -------------------- 2. UPCOMING PICKUP SPOTLIGHT CARD -------------------- */}
        {upcomingPickup && upcomingPickup.campaign && (
          <section className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 relative overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-emerald-100 backdrop-blur-sm">
                    {upcomingPickup.pickup ? "NEXT SCHEDULED PICKUP" : "FEATURED SOCIETY DRIVE"}
                  </span>
                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    Status: {upcomingPickup.pickup?.status || upcomingPickup.campaign.status}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {upcomingPickup.campaign.title}
                </h2>

                <p className="text-sm text-emerald-100/90 leading-relaxed">
                  {upcomingPickup.campaign.description}
                </p>

                {/* Pickup Date, Time & Instruction */}
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-emerald-100">
                  <div className="flex items-center gap-1.5">
                    <span>📅</span>
                    <span>{upcomingPickup.campaign.pickupDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>⏰</span>
                    <span>{upcomingPickup.campaign.pickupTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Doorstep / Floor Collection</span>
                  </div>
                </div>

                {/* Accepted Materials */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-emerald-200">Accepted:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {upcomingPickup.campaign.acceptedMaterials.map((m) => getMaterialBadge(m))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setSelectedCampaign(upcomingPickup.campaign || null)}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-900 shadow-md transition hover:bg-emerald-50 active:scale-98"
                >
                  View Details & Instructions
                </button>
              </div>
            </div>
          </section>
        )}

        {/* -------------------- 3. AVAILABLE CAMPAIGNS SECTION -------------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Available Society Campaigns</h2>
              <p className="text-xs text-slate-500">
                Upcoming and active recycling drives in {session.society.name}
              </p>
            </div>
            <Link
              href="/resident/pickups"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
            >
              View All Drives →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-emerald-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {getStatusBadge(camp.status)}
                    <span className="text-[11px] text-slate-500 font-mono">{camp.pickupDate}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{camp.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {camp.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span>⏰</span>
                      <span>{camp.pickupTime}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {camp.acceptedMaterials.map((m) => getMaterialBadge(m))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
                  <Link
                    href={`/resident/pickups/${camp.id}`}
                    className="flex-1 text-center rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 shadow-sm"
                  >
                    View & Pledge
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedCampaign(camp)}
                    className="px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    title="Quick preview details"
                  >
                    ℹ️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------- 4. RECENT PLEDGES TABLE -------------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Recent Pledges</h2>
              <p className="text-xs text-slate-500">
                Track your declared scrap, pickup statuses and verified collected weights
              </p>
            </div>
            <Link
              href="/resident/pledges"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
            >
              View Full History →
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {pledges.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No pledges recorded yet. Join an available campaign to pledge recyclables!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Drive / Campaign</th>
                      <th className="py-3.5 px-4">Materials</th>
                      <th className="py-3.5 px-4">Est. Weight</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Verified Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pledges.map((pledge) => {
                      const linkedCamp = campaignMap.get(pledge.campaignId);
                      const linkedPickup = pickups.find((p) => p.pledgeId === pledge.id);

                      return (
                        <tr key={pledge.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">
                              {linkedCamp?.title || pledge.campaignId}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(pledge.createdAt).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {pledge.materials.map((m) => getMaterialBadge(m))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {pledge.estimatedWeight} kg
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(pledge.status)}
                          </td>
                          <td className="py-3.5 px-4">
                            {linkedPickup?.actualWeight !== null && linkedPickup?.actualWeight !== undefined ? (
                              <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {linkedPickup.actualWeight} kg ✓
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending weigh-in</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* -------------------- 5. MY IMPACT PREVIEW -------------------- */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Environmental Impact</h2>
            <p className="text-xs text-slate-500">
              Verified savings generated by your household recycling participation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Impact Highlights */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <span>🌿</span>
                  <span>Household Savings</span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-200/60">
                    <span className="text-slate-600">Total Collected Weight:</span>
                    <span className="font-extrabold text-emerald-900 text-sm">{impactStats?.totalCollectedKg ?? 0} kg</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-200/60">
                    <span className="text-slate-600">Completed Pickups:</span>
                    <span className="font-extrabold text-emerald-900 text-sm">{impactStats?.completedPickupsCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-200/60">
                    <span className="text-slate-600">Participated Campaigns:</span>
                    <span className="font-extrabold text-emerald-900 text-sm">{participatedCampaignsCount}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-200 text-[11px] text-emerald-800 font-medium">
                Verified data computed directly from on-site scale logs in IndexedDB.
              </div>
            </div>

            {/* Environmental Conversion Metrics */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <span>🌍</span>
                  <span>Carbon & Resource Offsets</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-xl font-extrabold text-emerald-700">{impactStats?.co2SavedKg ?? 0}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">kg CO₂ Prevented</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <p className="text-xl font-extrabold text-teal-700">{impactStats?.waterSavedLitres ?? 0}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">L Water Saved</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 border border-emerald-100 text-center">
                  <p className="text-sm font-bold text-emerald-900">
                    ≈ {impactStats?.treesSavedEquivalent ?? 0} Trees Saved Equivalent
                  </p>
                </div>
              </div>
            </div>

            {/* Pledged Materials Distribution */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-3">
                <span>📊</span>
                <span>Materials Diverted</span>
              </div>
              <div className="space-y-2 text-xs">
                {impactStats && Object.entries(impactStats.materialsBreakdown).map(([material, kg]) => {
                  if (kg <= 0) return null;
                  return (
                    <div key={material} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">{material.replace("_", " ")}</span>
                      <span className="font-bold text-emerald-700">{Math.round(kg * 10) / 10} kg</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* -------------------- CAMPAIGN DETAIL MODAL -------------------- */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedCampaign.status)}
                <span className="text-xs font-bold text-slate-500">{selectedCampaign.pickupDate}</span>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedCampaign.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{selectedCampaign.description}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pickup Date & Time:</span>
                  <span className="font-bold text-slate-800">{selectedCampaign.pickupDate} ({selectedCampaign.pickupTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Society Location:</span>
                  <span className="font-bold text-slate-800">{session.society.name}, {session.society.city}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Accepted Recyclables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCampaign.acceptedMaterials.map((m) => getMaterialBadge(m))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Collection Instructions:</p>
                <p className="text-xs text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 leading-relaxed">
                  {selectedCampaign.collectionInstructions}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
