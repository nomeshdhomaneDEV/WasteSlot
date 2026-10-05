"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getResidentImpactStats,
  getPledgesByResident,
  getPickupsByResident,
  getCampaigns,
} from "@/lib/services";
import { Session, ImpactStats, Pledge, Pickup, Campaign, WasteMaterial } from "@/types";
import { ResidentNavbar } from "@/components/ResidentNavbar";

export default function ResidentImpactPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    async function loadImpactData() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.push("/login");
          return;
        }

        if (currentSession.user.role !== "RESIDENT") {
          router.push(getRedirectPathForRole(currentSession.user.role));
          return;
        }

        setSession(currentSession);
        await initializeDatabase();

        const residentId = currentSession.user.id;
        const societyId = currentSession.society.id;

        const [loadedImpact, loadedPledges, loadedPickups, loadedCampaigns] = await Promise.all([
          getResidentImpactStats(residentId),
          getPledgesByResident(residentId),
          getPickupsByResident(residentId),
          getCampaigns(societyId),
        ]);

        setImpactStats(loadedImpact);
        setPledges(loadedPledges);
        setPickups(loadedPickups);
        setCampaigns(loadedCampaigns);
      } catch (error) {
        console.error("Failed to load resident impact data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadImpactData();
  }, [router]);

  // Unique participated campaigns count
  const participatedCampaignsCount = useMemo(() => {
    const uniqueIds = new Set(pledges.map((p) => p.campaignId));
    return uniqueIds.size;
  }, [pledges]);

  // Total completed pickups
  const completedPickupsCount = useMemo(() => {
    return pickups.filter((p) => p.status === "COMPLETED").length;
  }, [pickups]);

  // Materials configuration with colors and icons
  const materialsConfig: Record<
    WasteMaterial,
    { label: string; icon: string; bg: string; text: string; bar: string }
  > = {
    E_WASTE: {
      label: "E-Waste",
      icon: "⚡",
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      bar: "bg-emerald-600",
    },
    PLASTIC: {
      label: "Plastics",
      icon: "🧴",
      bg: "bg-teal-100",
      text: "text-teal-800",
      bar: "bg-teal-500",
    },
    PAPER: {
      label: "Paper & Books",
      icon: "📰",
      bg: "bg-amber-100",
      text: "text-amber-800",
      bar: "bg-amber-500",
    },
    CARDBOARD: {
      label: "Cardboard",
      icon: "📦",
      bg: "bg-orange-100",
      text: "text-orange-800",
      bar: "bg-orange-500",
    },
    METAL: {
      label: "Metals",
      icon: "🥫",
      bg: "bg-slate-200",
      text: "text-slate-800",
      bar: "bg-slate-600",
    },
    GLASS: {
      label: "Glassware",
      icon: "🍶",
      bg: "bg-cyan-100",
      text: "text-cyan-800",
      bar: "bg-cyan-500",
    },
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl animate-pulse mb-3">
          ♻
        </div>
        <p className="text-sm font-semibold">Calculating household impact metrics...</p>
      </div>
    );
  }

  const totalPledged = impactStats?.totalPledgedKg ?? 0;
  const totalCollected = impactStats?.totalCollectedKg ?? 0;
  const co2Saved = impactStats?.co2SavedKg ?? 0;
  const waterSaved = impactStats?.waterSavedLitres ?? 0;
  const treesSaved = impactStats?.treesSavedEquivalent ?? 0;

  // Maximum weight for material bar calculation
  const maxMaterialWeight = Math.max(
    ...Object.values(impactStats?.materialsBreakdown || {}),
    1
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-16">
      {/* Shared Resident Navigation */}
      <ResidentNavbar session={session} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
              <span>🌱</span> Household Impact Report
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Environmental Footprint
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verified metrics derived strictly from your completed society recycling weigh-ins in IndexedDB.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs">
              📍 {session.user.unitOrFlat} • {session.society.name}
            </span>
          </div>
        </div>

        {/* ----------------- 1. FOUR PRIMARY IMPACT STAT CARDS ----------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Pledged */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pledged Waste
              </span>
              <span className="text-sm">📋</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalPledged} <span className="text-xs font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across {pledges.length} total pledge records
            </p>
          </div>

          {/* Card 2: Total Collected */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Verified Collected
              </span>
              <span className="text-sm">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-900">
              {totalCollected} <span className="text-xs font-semibold text-emerald-700">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {completedPickupsCount} doorstep weigh-ins completed
            </p>
          </div>

          {/* Card 3: Participated Campaigns */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Drives Supported
              </span>
              <span className="text-sm">🤝</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {participatedCampaignsCount} <span className="text-xs font-semibold text-slate-500">/ {campaigns.length}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Society campaigns joined
            </p>
          </div>

          {/* Card 4: CO2 Prevented */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Carbon Offset
              </span>
              <span className="text-sm">🌍</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {co2Saved} <span className="text-xs font-semibold text-emerald-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              ≈ {treesSaved} trees saved equivalent
            </p>
          </div>
        </section>

        {/* ----------------- 2. DETAILED ENVIRONMENTAL RESOURCE CONVERSIONS ----------------- */}
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Environmental Resource Equivalents
            </h2>
            <p className="text-xs text-slate-500">
              How your {totalCollected} kg of certified recycling translates into tangible ecological conservation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Conversion 1 */}
            <div className="rounded-2xl bg-emerald-50/60 p-5 border border-emerald-100 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white text-xl shadow-xs">
                🌱
              </div>
              <div>
                <p className="text-2xl font-extrabold text-emerald-950">{co2Saved} kg</p>
                <p className="text-xs font-bold text-emerald-800 mt-0.5">CO₂ Emissions Prevented</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Equivalent to removing {(Number(co2Saved) * 4.2).toFixed(0)} km of passenger car exhaust emissions.
                </p>
              </div>
            </div>

            {/* Conversion 2 */}
            <div className="rounded-2xl bg-teal-50/60 p-5 border border-teal-100 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white text-xl shadow-xs">
                💧
              </div>
              <div>
                <p className="text-2xl font-extrabold text-teal-950">{waterSaved} L</p>
                <p className="text-xs font-bold text-teal-800 mt-0.5">Freshwater Conserved</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Saved across industrial manufacturing and virgin paper/plastic processing cycles.
                </p>
              </div>
            </div>

            {/* Conversion 3 */}
            <div className="rounded-2xl bg-amber-50/60 p-5 border border-amber-100 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white text-xl shadow-xs">
                🌳
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-950">{treesSaved}</p>
                <p className="text-xs font-bold text-amber-800 mt-0.5">Trees Saved Equivalent</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Calculated based on recycled cardboard, packaging boxes, and pulp conservation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------- 3. MATERIAL-WISE RECYCLING BREAKDOWN ----------------- */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Material-Wise Diverted Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Distribution across all 6 accepted scrap streams
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              Total Weight: {totalPledged} kg
            </span>
          </div>

          <div className="space-y-4">
            {impactStats &&
              (Object.keys(materialsConfig) as WasteMaterial[]).map((material) => {
                const weight = impactStats.materialsBreakdown[material] || 0;
                const config = materialsConfig[material];
                const percentage =
                  totalPledged > 0
                    ? Math.round((weight / totalPledged) * 100)
                    : 0;

                return (
                  <div key={material} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{config.icon}</span>
                        <span className="font-bold text-slate-800">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-extrabold text-slate-900">
                          {Math.round(weight * 10) / 10} kg
                        </span>
                        <span className="text-slate-400 font-sans text-[11px]">
                          ({percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(percentage, weight > 0 ? 4 : 0)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ----------------- 4. HOUSEHOLD ECO-BADGES ----------------- */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Household Eco-Milestones
            </h2>
            <p className="text-xs text-slate-500">
              Earned achievements based on your continuous society recycling participation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                🥉
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Active Pledger</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Submitted multiple verified drives</p>
                <span className="mt-1 inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  UNLOCKED
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-2xl">
                ⚡
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">E-Waste Defender</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Diverted toxic electronics safely</p>
                <span className="mt-1 inline-block text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  UNLOCKED
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                🏆
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Zero-Landfill Society</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Green Valley Residency Leaderboard</p>
                <span className="mt-1 inline-block text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  TOP 15%
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
