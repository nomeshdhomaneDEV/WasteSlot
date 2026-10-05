"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getCampaigns,
  getPledges,
  getPickups,
  getUsersBySociety,
  getSocietyImpactStats,
  getSociety,
} from "@/lib/services";
import { Session, Campaign, Pledge, Pickup, User, ImpactStats, Society, WasteMaterial, CampaignStatus } from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

export default function AdminDashboardPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // IndexedDB data states
  const [society, setSociety] = useState<Society | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [societyUsers, setSocietyUsers] = useState<User[]>([]);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);

  // Modal states
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showResidentsModal, setShowResidentsModal] = useState(false);
  const [showQuickActionModal, setShowQuickActionModal] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const currentSession = getSession();
        if (!currentSession) {
          router.push("/login");
          return;
        }

        // Role verification
        if (currentSession.user.role !== "ADMIN") {
          router.push(getRedirectPathForRole(currentSession.user.role));
          return;
        }

        setSession(currentSession);
        await initializeDatabase();

        const societyId = currentSession.society.id;

        // Fetch society data concurrently from IndexedDB services
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

        // Security / Data Isolation: Filter pledges & pickups strictly for this society's campaigns
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
        console.error("Error loading admin dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
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

  // Calculate campaign metrics
  const activeCampaignsCount = useMemo(() => {
    return campaigns.filter((c) => c.status === "ACTIVE" || c.status === "UPCOMING").length;
  }, [campaigns]);

  // Participating households
  const participatingHouseholdsCount = useMemo(() => {
    const activeResidentIds = new Set(pledges.map((p) => p.residentId));
    return activeResidentIds.size;
  }, [pledges]);

  // Total expected weight & collected weight
  const totalExpectedKg = useMemo(() => {
    return impactStats?.totalPledgedKg ?? 0;
  }, [impactStats]);

  const totalCollectedKg = useMemo(() => {
    return impactStats?.totalCollectedKg ?? 0;
  }, [impactStats]);

  // Progress percentage
  const collectionProgressPercent = useMemo(() => {
    if (totalExpectedKg <= 0) return 0;
    return Math.min(100, Math.round((totalCollectedKg / totalExpectedKg) * 100));
  }, [totalCollectedKg, totalExpectedKg]);

  // Recent activity: combines latest pledges sorted by date
  const recentActivities = useMemo(() => {
    const combined = pledges.map((pledge) => {
      const pickup = pickups.find((p) => p.pledgeId === pledge.id);
      const resident = userMap.get(pledge.residentId);
      const campaign = campaignMap.get(pledge.campaignId);

      return {
        id: pledge.id,
        residentName: resident?.name || "Society Resident",
        unitOrFlat: resident?.unitOrFlat || "Flat Resident",
        campaignTitle: campaign?.title || "Society Drive",
        materials: pledge.materials,
        estimatedWeight: pledge.estimatedWeight,
        actualWeight: pickup?.actualWeight ?? null,
        status: pledge.status,
        date: pledge.createdAt,
      };
    });

    // Sort by latest date
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [pledges, pickups, userMap, campaignMap]);

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
      case "ACTIVE":
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />Active Drive</span>;
      case "UPCOMING":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">📅 Upcoming</span>;
      case "COMPLETED":
      case "COLLECTED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">✓ Completed</span>;
      case "SCHEDULED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">● Scheduled</span>;
      case "PLEDGED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">📌 Pledged</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          🏛️
        </div>
        <p className="text-sm font-semibold">Loading society admin console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-16">
      {/* Admin Navbar */}
      <AdminNavbar session={session} />

      {/* Main Admin Dashboard */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
              <span>🏛️</span> {society?.name || session.society.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Society Waste & Campaign Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live coordinator console for drives, household pledges, certified collections, and verified carbon offsets.
            </p>
          </div>

          {/* Quick Action Button Bar */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <Link
              href="/admin/campaigns/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              <span>+ Create Campaign</span>
            </Link>
            <Link
              href="/admin/residents"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>👥 Residents ({societyUsers.filter((u) => u.role === "RESIDENT").length})</span>
            </Link>
          </div>
        </div>

        {/* ----------------- 1. FOUR OVERVIEW KPI CARDS ----------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Active Campaigns */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Campaigns
              </span>
              <span className="text-base">📢</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {activeCampaignsCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {campaigns.length} total society drives on record
            </p>
          </div>

          {/* Card 2: Participating Households */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Households
              </span>
              <span className="text-base">🏡</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {participatingHouseholdsCount} <span className="text-xs font-semibold text-slate-400">/ {society?.totalHouseholds || 120}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {Math.round((participatingHouseholdsCount / (society?.totalHouseholds || 120)) * 100)}% society participation rate
            </p>
          </div>

          {/* Card 3: Expected Collection (kg) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Expected Collection
              </span>
              <span className="text-base">📋</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalExpectedKg} <span className="text-xs font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total pledged by residents
            </p>
          </div>

          {/* Card 4: Collected Waste (kg) */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Collected Waste
              </span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {totalCollectedKg} <span className="text-xs font-semibold text-emerald-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              {impactStats?.completedPickupsCount ?? 0} verified scale pickups completed
            </p>
          </div>
        </section>

        {/* ----------------- 2. COLLECTION PROGRESS CARD ----------------- */}
        <section className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Fulfillment Analytics
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Society Collection vs Expected Pledges
              </h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              {collectionProgressPercent}% Fulfillment Rate
            </span>
          </div>

          {/* Comparative visual bar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-600" />
                <span className="font-bold text-slate-800">
                  Verified Collected: {totalCollectedKg} kg
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                <span>Target Pledged: {totalExpectedKg} kg</span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                style={{ width: `${collectionProgressPercent}%` }}
              />
            </div>

            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <p className="text-xs text-slate-500">Total Society Pledges</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{pledges.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <p className="text-xs text-slate-500">Completed Pickups</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{impactStats?.completedPickupsCount ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <p className="text-xs text-slate-500">CO₂ Diverted</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">{impactStats?.co2SavedKg ?? 0} kg</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                <p className="text-xs text-slate-500">Trees Saved Equivalent</p>
                <p className="text-lg font-bold text-teal-700 mt-0.5">{impactStats?.treesSavedEquivalent ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------- 3. CAMPAIGN OVERVIEW ----------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Campaigns Overview</h2>
              <p className="text-xs text-slate-500">Active, scheduled and past recycling drives in {society?.name}</p>
            </div>
            <button
              onClick={() => setShowQuickActionModal("CREATE_CAMPAIGN")}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
            >
              + Add Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((camp) => {
              // Calculate specific pledges for this campaign
              const campPledges = pledges.filter((p) => p.campaignId === camp.id);
              const campPledgedKg = campPledges.reduce((acc, curr) => acc + (curr.estimatedWeight || 0), 0);

              return (
                <div
                  key={camp.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-emerald-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {getStatusBadge(camp.status)}
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        📅 {camp.pickupDate}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{camp.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {camp.description}
                    </p>

                    <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Pledged:</span>
                        <span className="font-bold text-emerald-800">{campPledgedKg} kg ({campPledges.length} flats)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Window:</span>
                        <span className="font-semibold text-slate-700">{camp.pickupTime}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Accepted Materials:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {camp.acceptedMaterials.map((m) => getMaterialBadge(m))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedCampaign(camp)}
                      className="w-full rounded-xl bg-slate-100 hover:bg-emerald-700 hover:text-white py-2.5 text-xs font-bold text-slate-700 transition"
                    >
                      View Campaign Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ----------------- 4. RECENT SOCIETY ACTIVITY ----------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Society Activity</h2>
              <p className="text-xs text-slate-500">Live feed of resident pledges and verified collector weigh-ins</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {pledges.length} Total Activity Records
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Resident & Unit</th>
                      <th className="py-3.5 px-4">Target Drive</th>
                      <th className="py-3.5 px-4">Pledged Materials</th>
                      <th className="py-3.5 px-4">Est. Weight</th>
                      <th className="py-3.5 px-4">Verified Scale Weight</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentActivities.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{act.residentName}</p>
                          <p className="text-[10px] text-slate-500">{act.unitOrFlat}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{act.campaignTitle}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {act.materials.map((m) => getMaterialBadge(m))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {act.estimatedWeight} kg
                        </td>
                        <td className="py-3.5 px-4">
                          {act.actualWeight !== null ? (
                            <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {act.actualWeight} kg ✓
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending weigh-in</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(act.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ----------------- 5. QUICK ACTIONS & TOOLS ----------------- */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Admin Tools & Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Link
              href="/admin/campaigns/new"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/40 transition shadow-xs group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📢</div>
              <p className="text-xs font-bold text-slate-800">Create Campaign</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Schedule new drive</p>
            </Link>

            <Link
              href="/admin/campaigns"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/40 transition shadow-xs group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📋</div>
              <p className="text-xs font-bold text-slate-800">View Campaigns</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{campaigns.length} drives</p>
            </Link>

            <Link
              href="/admin/residents"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/40 transition shadow-xs group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">👥</div>
              <p className="text-xs font-bold text-slate-800">View Residents</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{societyUsers.filter((u) => u.role === "RESIDENT").length} enrolled</p>
            </Link>

            <Link
              href="/admin/collections"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/40 transition shadow-xs group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🚚</div>
              <p className="text-xs font-bold text-slate-800">View Collections</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{pickups.length} pickup logs</p>
            </Link>

            <Link
              href="/admin/impact"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/40 transition shadow-xs group col-span-2 sm:col-span-1"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🌱</div>
              <p className="text-xs font-bold text-slate-800">View Impact</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{impactStats?.co2SavedKg ?? 0} kg CO₂</p>
            </Link>
          </div>
        </section>
      </main>

      {/* ----------------- MODAL: CAMPAIGN DETAILS ----------------- */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedCampaign.status)}
                <span className="text-xs font-bold text-slate-500 font-mono">📅 {selectedCampaign.pickupDate}</span>
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
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{selectedCampaign.description}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pickup Date & Window:</span>
                  <span className="font-bold text-slate-900">{selectedCampaign.pickupDate} ({selectedCampaign.pickupTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Society:</span>
                  <span className="font-bold text-slate-900">{society?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Campaign ID:</span>
                  <span className="font-mono font-bold text-slate-700">{selectedCampaign.id}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Accepted Recyclables:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCampaign.acceptedMaterials.map((m) => getMaterialBadge(m))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Collection Instructions:</p>
                <p className="text-xs text-slate-600 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 leading-relaxed">
                  {selectedCampaign.collectionInstructions}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: RESIDENTS LIST ----------------- */}
      {showResidentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Enrolled Society Residents</h3>
                <p className="text-xs text-slate-500">{society?.name} directory in IndexedDB</p>
              </div>
              <button
                onClick={() => setShowResidentsModal(false)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
              {societyUsers.filter((u) => u.role === "RESIDENT").map((user) => {
                const userPledges = pledges.filter((p) => p.residentId === user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{user.avatar || "👤"}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.unitOrFlat} • {user.email}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                      {userPledges.length} Pledges
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowResidentsModal(false)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: QUICK ACTION PREVIEW ----------------- */}
      {showQuickActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl mb-3">
              {showQuickActionModal === "CREATE_CAMPAIGN" && "📢"}
              {showQuickActionModal === "VIEW_CAMPAIGNS" && "📋"}
              {showQuickActionModal === "COLLECTIONS" && "🚚"}
              {showQuickActionModal === "IMPACT" && "🌱"}
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              {showQuickActionModal === "CREATE_CAMPAIGN" && "Campaign Creation"}
              {showQuickActionModal === "VIEW_CAMPAIGNS" && "All Society Campaigns"}
              {showQuickActionModal === "COLLECTIONS" && "Collector Manifest Logs"}
              {showQuickActionModal === "IMPACT" && "Total Society Carbon Offset"}
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {showQuickActionModal === "CREATE_CAMPAIGN" &&
                "The dedicated Campaign Creation flow with multi-material selector and schedule broadcast will be unlocked in the next Admin module step."}
              {showQuickActionModal === "VIEW_CAMPAIGNS" &&
                `Currently managing ${campaigns.length} campaigns for ${society?.name} directly loaded from IndexedDB.`}
              {showQuickActionModal === "COLLECTIONS" &&
                `Tracking ${pickups.length} pickups across ${society?.name} with ${totalCollectedKg} kg total collected waste.`}
              {showQuickActionModal === "IMPACT" &&
                `Your society has offset ${impactStats?.co2SavedKg ?? 0} kg CO₂ and conserved ${impactStats?.waterSavedLitres ?? 0} L freshwater.`}
            </p>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
              <button
                onClick={() => setShowQuickActionModal(null)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
