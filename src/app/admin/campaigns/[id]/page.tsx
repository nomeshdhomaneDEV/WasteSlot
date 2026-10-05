"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getCampaignById,
  updateCampaignStatus,
  getPledges,
  getPickups,
  getUsersBySociety,
} from "@/lib/services";
import { Session, Campaign, Pledge, Pickup, User, WasteMaterial, CampaignStatus } from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

export default function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [societyUsers, setSocietyUsers] = useState<User[]>([]);

  const [actionLoading, setActionLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
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

        const [loadedCampaign, allPledges, allPickups, loadedUsers] = await Promise.all([
          getCampaignById(campaignId),
          getPledges(campaignId),
          getPickups(campaignId),
          getUsersBySociety(currentSession.society.id),
        ]);

        if (!loadedCampaign || loadedCampaign.societyId !== currentSession.society.id) {
          router.push("/admin/campaigns");
          return;
        }

        setCampaign(loadedCampaign);
        setPledges(allPledges);
        setPickups(allPickups);
        setSocietyUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading campaign detail:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [campaignId, router]);

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    societyUsers.forEach((u) => map.set(u.id, u));
    return map;
  }, [societyUsers]);

  const pickupMap = useMemo(() => {
    const map = new Map<string, Pickup>();
    pickups.forEach((p) => {
      if (p.pledgeId) map.set(p.pledgeId, p);
    });
    return map;
  }, [pickups]);

  // Aggregate metrics
  const totalPledgedKg = useMemo(() => {
    const sum = pledges.reduce((acc, curr) => acc + (curr.estimatedWeight || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [pledges]);

  const totalCollectedKg = useMemo(() => {
    const completedPickups = pickups.filter((p) => p.status === "COMPLETED");
    const sum = completedPickups.reduce((acc, curr) => acc + (curr.actualWeight || 0), 0);
    return Math.round(sum * 10) / 10;
  }, [pickups]);

  const progressPercent = useMemo(() => {
    if (totalPledgedKg <= 0) return 0;
    return Math.min(100, Math.round((totalCollectedKg / totalPledgedKg) * 100));
  }, [totalCollectedKg, totalPledgedKg]);

  // Status transitions
  const handleUpdateStatus = async (newStatus: CampaignStatus) => {
    if (!campaign) return;

    // Validate allowed transitions
    const current = campaign.status;
    const isValid =
      (current === "UPCOMING" && (newStatus === "ACTIVE" || newStatus === "CANCELLED")) ||
      (current === "ACTIVE" && (newStatus === "COMPLETED" || newStatus === "CANCELLED"));

    if (!isValid) {
      alert(`Invalid status transition from ${current} to ${newStatus}.`);
      return;
    }

    setActionLoading(true);
    try {
      await updateCampaignStatus(campaign.id, newStatus);
      setCampaign({ ...campaign, status: newStatus });
      setStatusFeedback(`Campaign status successfully updated to ${newStatus}!`);

      setTimeout(() => {
        setStatusFeedback(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to update campaign status:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getMaterialBadge = (material: WasteMaterial) => {
    switch (material) {
      case "E_WASTE":
        return <span key={material} className="rounded-md bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-semibold">⚡ E-Waste</span>;
      case "PLASTIC":
        return <span key={material} className="rounded-md bg-teal-100 text-teal-800 px-2.5 py-1 text-xs font-semibold">🧴 Plastic</span>;
      case "PAPER":
        return <span key={material} className="rounded-md bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-semibold">📰 Paper</span>;
      case "CARDBOARD":
        return <span key={material} className="rounded-md bg-orange-100 text-orange-800 px-2.5 py-1 text-xs font-semibold">📦 Cardboard</span>;
      case "METAL":
        return <span key={material} className="rounded-md bg-slate-200 text-slate-800 px-2.5 py-1 text-xs font-semibold">🥫 Metal</span>;
      case "GLASS":
        return <span key={material} className="rounded-md bg-cyan-100 text-cyan-800 px-2.5 py-1 text-xs font-semibold">🍶 Glass</span>;
      default:
        return <span key={material} className="rounded-md bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium">{material}</span>;
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />Active Drive</span>;
      case "UPCOMING":
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">📅 Upcoming Drive</span>;
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">✓ Completed</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-200">✕ Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  if (loading || !session || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          📢
        </div>
        <p className="text-sm font-semibold">Loading campaign workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-20">
      {/* Admin Navbar */}
      <AdminNavbar session={session} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Breadcrumb & Status Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>All Campaigns</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-mono text-slate-400">{campaign.id}</span>
          </div>

          {/* Status Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {campaign.status === "UPCOMING" && (
              <>
                <button
                  onClick={() => handleUpdateStatus("ACTIVE")}
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-98 disabled:opacity-50"
                >
                  🚀 Activate Campaign Now
                </button>
                <button
                  onClick={() => handleUpdateStatus("CANCELLED")}
                  disabled={actionLoading}
                  className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-2 text-xs font-bold transition active:scale-98 disabled:opacity-50"
                >
                  Cancel Drive
                </button>
              </>
            )}

            {campaign.status === "ACTIVE" && (
              <>
                <button
                  onClick={() => handleUpdateStatus("COMPLETED")}
                  disabled={actionLoading}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold shadow-xs transition active:scale-98 disabled:opacity-50"
                >
                  ✓ Mark as Completed
                </button>
                <button
                  onClick={() => handleUpdateStatus("CANCELLED")}
                  disabled={actionLoading}
                  className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-2 text-xs font-bold transition active:scale-98 disabled:opacity-50"
                >
                  Cancel Drive
                </button>
              </>
            )}

            {(campaign.status === "COMPLETED" || campaign.status === "CANCELLED") && (
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                Finalized State ({campaign.status})
              </span>
            )}
          </div>
        </div>

        {/* Feedback Message */}
        {statusFeedback && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
            <span>✓</span> {statusFeedback}
          </div>
        )}

        {/* Campaign Info Card */}
        <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {getStatusBadge(campaign.status)}
            <span className="text-xs font-bold text-slate-500 font-mono">
              📅 {campaign.pickupDate} ({campaign.pickupTime})
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {campaign.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-4xl">
              {campaign.description}
            </p>
          </div>

          {/* Accepted Materials */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Accepted Material Streams:
            </p>
            <div className="flex flex-wrap gap-2">
              {campaign.acceptedMaterials.map((m) => getMaterialBadge(m))}
            </div>
          </div>

          {/* Details Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 font-medium">Pickup Window:</span>
              <p className="font-bold text-slate-900 mt-0.5">{campaign.pickupTime}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Community Zone:</span>
              <p className="font-bold text-slate-900 mt-0.5">{session.society.name}, {session.society.city}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Created On:</span>
              <p className="font-bold text-slate-900 mt-0.5">{new Date(campaign.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="sm:col-span-3 pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 font-medium">Collection Instructions:</span>
              <p className="font-semibold text-emerald-900 mt-0.5 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                {campaign.collectionInstructions}
              </p>
            </div>
          </div>
        </div>

        {/* ----------------- 4 KPI SUMMARY CARDS FOR THIS CAMPAIGN ----------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pledges</span>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">{pledges.length}</p>
            <p className="mt-1 text-xs text-slate-500">Participating households</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Pledged</span>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">{totalPledgedKg} <span className="text-xs font-semibold text-slate-400">kg</span></p>
            <p className="mt-1 text-xs text-slate-500">Estimated scrap weight</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Actual Collected</span>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-900">{totalCollectedKg} <span className="text-xs font-semibold text-emerald-700">kg</span></p>
            <p className="mt-1 text-xs text-emerald-700">Verified doorstep weigh-ins</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Fulfillment</span>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">{progressPercent}%</p>
            <p className="mt-1 text-xs text-emerald-200/80">Collected vs estimated</p>
          </div>
        </section>

        {/* ----------------- PLEDGES & PICKUPS FOR THIS CAMPAIGN ----------------- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Registered Household Pledges</h2>
              <p className="text-xs text-slate-500">Flats participating in this specific drive</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {pledges.length} Pledges Registered
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {pledges.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-slate-700">No resident pledges registered yet for this campaign.</p>
                <p className="text-slate-400">When residents pledge recyclables, their entries will appear here automatically.</p>
              </div>
            ) : (
              <>
                {/* Mobile View (Cards: 360px - 768px) */}
                <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                  {pledges.map((pledge) => {
                    const resident = userMap.get(pledge.residentId);
                    const pickup = pickupMap.get(pledge.id);

                    return (
                      <div key={pledge.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{resident?.name || "Society Resident"}</p>
                            <p className="text-[10px] text-slate-500">{resident?.unitOrFlat || "Flat Resident"}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700">
                            {pickup?.status || pledge.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {pledge.materials.map((m) => getMaterialBadge(m))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                          <div>
                            <span className="text-slate-400">Est: </span>
                            <span className="font-bold text-slate-800">{pledge.estimatedWeight} kg</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Actual: </span>
                            {pickup?.actualWeight !== null && pickup?.actualWeight !== undefined ? (
                              <span className="font-extrabold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                                {pickup.actualWeight} kg ✓
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending</span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[10px] font-mono">
                            {new Date(pledge.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View (Table: >= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-4 px-5">Resident & Flat</th>
                        <th className="py-4 px-5">Pledged Materials</th>
                        <th className="py-4 px-5">Est. Weight</th>
                        <th className="py-4 px-5">Verified Scale Weight</th>
                        <th className="py-4 px-5">Pickup Status</th>
                        <th className="py-4 px-5">Pledged At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pledges.map((pledge) => {
                        const resident = userMap.get(pledge.residentId);
                        const pickup = pickupMap.get(pledge.id);

                        return (
                          <tr key={pledge.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-4 px-5">
                              <p className="font-bold text-slate-900">{resident?.name || "Society Resident"}</p>
                              <p className="text-[10px] text-slate-500">{resident?.unitOrFlat || "Flat Resident"}</p>
                            </td>

                            <td className="py-4 px-5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {pledge.materials.map((m) => getMaterialBadge(m))}
                              </div>
                            </td>

                            <td className="py-4 px-5 font-bold text-slate-800 text-sm">
                              {pledge.estimatedWeight} kg
                            </td>

                            <td className="py-4 px-5">
                              {pickup?.actualWeight !== null && pickup?.actualWeight !== undefined ? (
                                <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs">
                                  {pickup.actualWeight} kg ✓
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Pending weigh-in</span>
                              )}
                            </td>

                            <td className="py-4 px-5">
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700">
                                {pickup?.status || pledge.status}
                              </span>
                            </td>

                            <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                              {new Date(pledge.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

