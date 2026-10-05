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
  getSociety,
} from "@/lib/services";
import {
  Session,
  Campaign,
  Pledge,
  Pickup,
  Society,
  WasteMaterial,
} from "@/types";
import { CollectorNavbar } from "@/components/CollectorNavbar";

export default function CollectorImpactPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);

  useEffect(() => {
    async function loadImpactData() {
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
        ] = await Promise.all([
          getSociety(societyId),
          getCampaigns(societyId),
          getPledges(),
          getPickups(),
        ]);

        // Security / Data Isolation: Filter for collector's assigned society
        const societyCampaignIds = new Set(loadedCampaigns.map((c) => c.id));
        const societyPledges = allPledges.filter((p) => societyCampaignIds.has(p.campaignId));
        const societyPickups = allPickups.filter((p) => societyCampaignIds.has(p.campaignId));

        setSociety(loadedSociety || currentSession.society);
        setCampaigns(loadedCampaigns);
        setPledges(societyPledges);
        setPickups(societyPickups);
      } catch (error) {
        console.error("Error loading collector impact data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadImpactData();
  }, [router]);

  const pledgeMap = useMemo(() => {
    const map = new Map<string, Pledge>();
    pledges.forEach((p) => map.set(p.id, p));
    return map;
  }, [pledges]);

  // Completed pickups
  const completedPickups = useMemo(() => {
    return pickups.filter((p) => p.status === "COMPLETED" && p.actualWeight !== null);
  }, [pickups]);

  // 1. Total pickups completed
  const totalCompletedCount = completedPickups.length;

  // 2. Total waste collected (kg)
  const totalCollectedKg = useMemo(() => {
    const total = completedPickups.reduce((sum, p) => sum + (p.actualWeight || 0), 0);
    return Math.round(total * 10) / 10;
  }, [completedPickups]);

  // 3. Average collected weight per pickup
  const averageWeightPerPickup = useMemo(() => {
    if (totalCompletedCount === 0) return 0;
    return Math.round((totalCollectedKg / totalCompletedCount) * 10) / 10;
  }, [totalCollectedKg, totalCompletedCount]);

  // 4. Total campaigns serviced
  const totalCampaignsServiced = useMemo(() => {
    const uniqueCampaignIds = new Set(completedPickups.map((p) => p.campaignId));
    return uniqueCampaignIds.size;
  }, [completedPickups]);

  // Environmental Equivalents
  const co2PreventedKg = Math.round(totalCollectedKg * 2.1 * 10) / 10;
  const treesSaved = Math.round(totalCollectedKg * 0.04 * 10) / 10;
  const waterConservedLitres = Math.round(totalCollectedKg * 18.5);

  // 5. Material Breakdown Configuration
  const materialsConfig: Record<
    WasteMaterial,
    { label: string; icon: string; bg: string; text: string; bar: string }
  > = {
    E_WASTE: {
      label: "E-Waste & Electronics",
      icon: "⚡",
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      bar: "bg-emerald-600",
    },
    PLASTIC: {
      label: "Plastics & Packaging",
      icon: "🧴",
      bg: "bg-teal-100",
      text: "text-teal-800",
      bar: "bg-teal-500",
    },
    PAPER: {
      label: "Paper & Print",
      icon: "📰",
      bg: "bg-amber-100",
      text: "text-amber-800",
      bar: "bg-amber-500",
    },
    CARDBOARD: {
      label: "Cardboard & Cartons",
      icon: "📦",
      bg: "bg-orange-100",
      text: "text-orange-800",
      bar: "bg-orange-500",
    },
    METAL: {
      label: "Metals & Scrap",
      icon: "🥫",
      bg: "bg-slate-200",
      text: "text-slate-800",
      bar: "bg-slate-600",
    },
    GLASS: {
      label: "Glass Bottles & Jars",
      icon: "🍶",
      bg: "bg-cyan-100",
      text: "text-cyan-800",
      bar: "bg-cyan-500",
    },
  };

  // Material-wise collected weights calculated from real completed pickups
  const materialWeights = useMemo<Record<WasteMaterial, number>>(() => {
    const weights: Record<WasteMaterial, number> = {
      E_WASTE: 0,
      PLASTIC: 0,
      PAPER: 0,
      CARDBOARD: 0,
      METAL: 0,
      GLASS: 0,
    };

    for (const pkp of completedPickups) {
      if (pkp.actualWeight !== null) {
        const pledge = pledgeMap.get(pkp.pledgeId);
        if (pledge && pledge.materials.length > 0) {
          const perMatWeight = pkp.actualWeight / pledge.materials.length;
          for (const m of pledge.materials) {
            if (weights[m] !== undefined) {
              weights[m] += perMatWeight;
            }
          }
        }
      }
    }

    return weights;
  }, [completedPickups, pledgeMap]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 text-2xl animate-pulse mb-3">
          🌱
        </div>
        <p className="text-sm font-semibold">Calculating collector impact metrics...</p>
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
              <span className="text-slate-500">Field Impact</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Collector Performance & Environmental Impact
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verified metric audit for operator {session.user.name} servicing {society?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs">
              📍 {society?.name} • {session.user.unitOrFlat || "FastRecycle Partner"}
            </span>
          </div>
        </div>

        {/* ---------------- 1. FOUR PRIMARY KPI METRIC CARDS ---------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Waste Collected */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-teal-900 to-teal-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-teal-300">
              <span>Total Waste Collected</span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {totalCollectedKg} <span className="text-xs font-semibold text-teal-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-teal-200/80">
              Cumulative scale verified haul
            </p>
          </div>

          {/* Card 2: Total Pickups Completed */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Completed Pickups</span>
              <span className="text-base">✓</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-teal-800">
              {totalCompletedCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Flats collected & verified
            </p>
          </div>

          {/* Card 3: Average Weight per Pickup */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Avg Weight / Pickup</span>
              <span className="text-base">📊</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {averageWeightPerPickup} <span className="text-xs font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Average yield per household
            </p>
          </div>

          {/* Card 4: Total Campaigns Serviced */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Drives Serviced</span>
              <span className="text-base">🤝</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalCampaignsServiced} <span className="text-xs font-semibold text-slate-400">/ {campaigns.length}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Society drives collected
            </p>
          </div>
        </section>

        {/* ---------------- 2. MATERIAL-WISE COLLECTED BREAKDOWN ---------------- */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Material-Wise Diverted Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Verified collection weight across all 6 accepted scrap streams
              </p>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200 self-start sm:self-auto">
              Total Weight: {totalCollectedKg} kg
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(materialsConfig) as WasteMaterial[]).map((matKey) => {
              const config = materialsConfig[matKey];
              const weight = Math.round(materialWeights[matKey] * 10) / 10;
              const percentage = totalCollectedKg > 0 ? Math.round((weight / totalCollectedKg) * 100) : 0;

              return (
                <div
                  key={matKey}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-xs border border-slate-200">
                        {config.icon}
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900">{config.label}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">{matKey}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {percentage}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Collected:</span>
                      <span className="font-extrabold text-teal-900">
                        {weight > 0 ? `${weight} kg ✓` : "0.0 kg"}
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                        style={{
                          width: `${Math.min(100, Math.max(percentage, weight > 0 ? 5 : 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------- 3. ENVIRONMENTAL CONSERVATION EQUIVALENCIES ---------------- */}
        <section className="rounded-3xl border border-teal-900/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Ecological Offset Equivalencies
            </h2>
            <p className="text-xs text-slate-500">
              Real ecological conservation created through your {totalCollectedKg} kg of field collections
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-teal-50/60 p-5 border border-teal-100 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white text-xl shadow-xs">
                🌱
              </div>
              <div>
                <p className="text-2xl font-extrabold text-teal-950">{co2PreventedKg} kg</p>
                <p className="text-xs font-bold text-teal-800 mt-0.5">CO₂ Emissions Prevented</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Avoided industrial emissions by rerouting recyclables to certified processors.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-cyan-50/60 p-5 border border-cyan-100 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white text-xl shadow-xs">
                💧
              </div>
              <div>
                <p className="text-2xl font-extrabold text-cyan-950">{waterConservedLitres} L</p>
                <p className="text-xs font-bold text-cyan-800 mt-0.5">Freshwater Conserved</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Saved across industrial manufacturing and pulp washing cycles.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50/60 p-5 border border-amber-100 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white text-xl shadow-xs">
                🌳
              </div>
              <div>
                <p className="text-2xl font-extrabold text-amber-950">{treesSaved}</p>
                <p className="text-xs font-bold text-amber-800 mt-0.5">Trees Saved Equivalent</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Timber and paper pulp conservation through collected cartons and newspapers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

