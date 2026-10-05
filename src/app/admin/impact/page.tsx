"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getSocietyImpactStats,
  getCampaigns,
  getPledges,
  getPickups,
  getUsersBySociety,
  getSociety,
} from "@/lib/services";
import {
  Session,
  ImpactStats,
  Campaign,
  Pledge,
  Pickup,
  User,
  Society,
  WasteMaterial,
} from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

export default function AdminImpactPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [societyUsers, setSocietyUsers] = useState<User[]>([]);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);

  useEffect(() => {
    async function loadImpactData() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.push("/login");
          return;
        }

        // Verify ADMIN role
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
          loadedImpact,
        ] = await Promise.all([
          getSociety(societyId),
          getCampaigns(societyId),
          getPledges(),
          getPickups(),
          getUsersBySociety(societyId),
          getSocietyImpactStats(societyId),
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
        setImpactStats(loadedImpact);
      } catch (error) {
        console.error("Error loading admin impact data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadImpactData();
  }, [router]);

  // Lookup maps
  const campaignMap = useMemo(() => {
    const map = new Map<string, Campaign>();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    societyUsers.forEach((u) => map.set(u.id, u));
    return map;
  }, [societyUsers]);

  const pledgeMap = useMemo(() => {
    const map = new Map<string, Pledge>();
    pledges.forEach((p) => map.set(p.id, p));
    return map;
  }, [pledges]);

  // 1. Total Waste Collected (actual completed pickup weight in kg)
  const totalCollectedKg = useMemo(() => {
    return pickups
      .filter((p) => p.status === "COMPLETED" && p.actualWeight !== null)
      .reduce((sum, p) => sum + (p.actualWeight || 0), 0);
  }, [pickups]);

  // 2. Total Waste Pledged (estimated weight from resident pledges in kg)
  const totalPledgedKg = useMemo(() => {
    return pledges.reduce((sum, p) => sum + (p.estimatedWeight || 0), 0);
  }, [pledges]);

  // 3. Participating Households (unique residents who have submitted pledges)
  const participatingHouseholdsCount = useMemo(() => {
    const uniqueResidents = new Set(pledges.map((p) => p.residentId));
    return uniqueResidents.size;
  }, [pledges]);

  // 4. Completed Pickups (count pickups with COMPLETED status)
  const completedPickupsCount = useMemo(() => {
    return pickups.filter((p) => p.status === "COMPLETED").length;
  }, [pickups]);

  // 5. Campaigns Completed (count completed campaigns)
  const completedCampaignsCount = useMemo(() => {
    return campaigns.filter((c) => c.status === "COMPLETED").length;
  }, [campaigns]);

  // 6. Material Breakdown
  const materialsConfig: Record<
    WasteMaterial,
    { label: string; icon: string; bg: string; text: string; bar: string }
  > = {
    E_WASTE: {
      label: "E-Waste & Gadgets",
      icon: "⚡",
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      bar: "bg-emerald-600",
    },
    PLASTIC: {
      label: "Plastic Packaging",
      icon: "🧴",
      bg: "bg-teal-100",
      text: "text-teal-800",
      bar: "bg-teal-500",
    },
    PAPER: {
      label: "Paper & Newsprint",
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

  // Calculate material breakdown from pledges and completed collections
  const materialWeights = useMemo<Record<WasteMaterial, { pledged: number; collected: number }>>(() => {
    const breakdown: Record<WasteMaterial, { pledged: number; collected: number }> = {
      E_WASTE: { pledged: 0, collected: 0 },
      PLASTIC: { pledged: 0, collected: 0 },
      PAPER: { pledged: 0, collected: 0 },
      CARDBOARD: { pledged: 0, collected: 0 },
      METAL: { pledged: 0, collected: 0 },
      GLASS: { pledged: 0, collected: 0 },
    };

    // Calculate pledged weights per material
    for (const pledge of pledges) {
      const perMatWeight = (pledge.estimatedWeight || 0) / (pledge.materials.length || 1);
      for (const m of pledge.materials) {
        if (breakdown[m]) {
          breakdown[m].pledged += perMatWeight;
        }
      }
    }

    // Calculate collected weights per material from completed pickups
    for (const pickup of pickups) {
      if (pickup.status === "COMPLETED" && pickup.actualWeight !== null) {
        const pledge = pledgeMap.get(pickup.pledgeId);
        if (pledge && pledge.materials.length > 0) {
          const perMatWeight = pickup.actualWeight / pledge.materials.length;
          for (const m of pledge.materials) {
            if (breakdown[m]) {
              breakdown[m].collected += perMatWeight;
            }
          }
        }
      }
    }

    return breakdown;
  }, [pledges, pickups, pledgeMap]);

  // 7. Collection Progress percentage
  const collectionProgressPercent = useMemo(() => {
    if (totalPledgedKg <= 0) return 0;
    return Math.min(100, Math.round((totalCollectedKg / totalPledgedKg) * 100));
  }, [totalCollectedKg, totalPledgedKg]);

  // 8. Recent Impact Activity: recently completed pickups
  const recentCompletedPickups = useMemo(() => {
    return pickups
      .filter((p) => p.status === "COMPLETED" && p.actualWeight !== null)
      .map((pickup) => {
        const pledge = pledgeMap.get(pickup.pledgeId);
        const campaign = campaignMap.get(pickup.campaignId);
        const resident = userMap.get(pickup.residentId);

        return {
          id: pickup.id,
          campaignTitle: campaign?.title || "Society Drive",
          residentName: resident?.name || "Society Resident",
          unitOrFlat: resident?.unitOrFlat || "Flat Resident",
          materials: pledge?.materials || [],
          actualWeight: pickup.actualWeight || 0,
          completedAt: pickup.completedAt || campaign?.pickupDate || new Date().toISOString(),
        };
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5);
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

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          🌱
        </div>
        <p className="text-sm font-semibold">Calculating society environmental impact...</p>
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
              <span className="text-slate-500">Environmental Impact</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Society Environmental Impact & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verified carbon diversion, landfill reduction, and material recovery metrics for {society?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 shadow-xs">
              📍 {society?.name} • {society?.city}
            </span>
          </div>
        </div>

        {/* ----------------- 1. FIVE PRIMARY KPI CARDS ----------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {/* 1. Total Waste Collected */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-300">
              <span>Total Collected</span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {Math.round(totalCollectedKg * 10) / 10} <span className="text-xs font-semibold text-emerald-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Verified doorstep scale weight
            </p>
          </div>

          {/* 2. Total Waste Pledged */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Total Pledged</span>
              <span className="text-base">📋</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {Math.round(totalPledgedKg * 10) / 10} <span className="text-xs font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {pledges.length} total resident pledges
            </p>
          </div>

          {/* 3. Participating Households */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Households</span>
              <span className="text-base">🏡</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {participatingHouseholdsCount} <span className="text-xs font-semibold text-slate-400">/ {society?.totalHouseholds || 120}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {Math.round((participatingHouseholdsCount / (society?.totalHouseholds || 120)) * 100)}% society adoption
            </p>
          </div>

          {/* 4. Completed Pickups */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Pickups Done</span>
              <span className="text-base">✓</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-800">
              {completedPickupsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Certified collector weigh-ins
            </p>
          </div>

          {/* 5. Campaigns Completed */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Completed Drives</span>
              <span className="text-base">🏆</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {completedCampaignsCount} <span className="text-xs font-semibold text-slate-400">/ {campaigns.length}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Full cycle recycling drives
            </p>
          </div>
        </section>

        {/* ----------------- 2. COLLECTION PROGRESS INDICATOR ----------------- */}
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Fulfillment Target
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Collection Progress: Pledged vs Actual Collected
              </h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              {collectionProgressPercent}% Realized
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-600" />
                <span className="font-bold text-slate-900">
                  Collected Scale Weight: {Math.round(totalCollectedKg * 10) / 10} kg
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                <span>Pledged Target: {Math.round(totalPledgedKg * 10) / 10} kg</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                style={{ width: `${collectionProgressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500">CO₂ Diverted from Atmosphere</p>
                <p className="text-base font-bold text-emerald-800 mt-0.5">
                  {impactStats?.co2SavedKg ?? Math.round(totalCollectedKg * 2.1 * 10) / 10} kg CO₂
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500">Freshwater Conserved</p>
                <p className="text-base font-bold text-teal-800 mt-0.5">
                  {impactStats?.waterSavedLitres ?? Math.round(totalCollectedKg * 18.5)} Litres
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <p className="text-slate-500">Forest Equivalent Protected</p>
                <p className="text-base font-bold text-amber-800 mt-0.5">
                  {impactStats?.treesSavedEquivalent ?? Math.round(totalCollectedKg * 0.04 * 10) / 10} Trees
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------- 3. MATERIAL-WISE BREAKDOWN ----------------- */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Material-Wise Diverted Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Collected scrap and pledge distribution across 6 recyclability streams
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              6 Verified Categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(materialsConfig) as WasteMaterial[]).map((matKey) => {
              const config = materialsConfig[matKey];
              const data = materialWeights[matKey];
              const collected = Math.round(data.collected * 10) / 10;
              const pledged = Math.round(data.pledged * 10) / 10;
              const pct = totalPledgedKg > 0 ? Math.round((data.pledged / totalPledgedKg) * 100) : 0;

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
                      {pct}%
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Collected:</span>
                      <span className="font-extrabold text-emerald-800">
                        {collected > 0 ? `${collected} kg ✓` : "0.0 kg"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Pledged:</span>
                      <span className="font-semibold text-slate-700">{pledged} kg</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bar} transition-all duration-500`}
                        style={{
                          width: `${Math.min(100, Math.max(pct, pledged > 0 ? 5 : 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------- 4. RECENT IMPACT ACTIVITY ----------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Completed Collections</h2>
              <p className="text-xs text-slate-500">
                Verified household pickups with real certified scale weights
              </p>
            </div>
            <Link
              href="/admin/collections"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
            >
              View All Collections →
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {recentCompletedPickups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No completed pickups recorded yet. Completed weigh-ins will appear here automatically.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Campaign Drive</th>
                      <th className="py-3.5 px-4">Resident & Flat</th>
                      <th className="py-3.5 px-4">Recycled Materials</th>
                      <th className="py-3.5 px-4 text-right">Verified Weight</th>
                      <th className="py-3.5 px-4 text-right">Completion Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentCompletedPickups.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.campaignTitle}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{item.residentName}</p>
                          <p className="text-[10px] text-slate-500">{item.unitOrFlat}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.materials.map((m) => getMaterialBadge(m))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            {item.actualWeight} kg ✓
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {new Date(item.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
