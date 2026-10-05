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
} from "@/lib/services";
import { Session, Campaign, Pledge, Pickup, WasteMaterial, CampaignStatus } from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

export default function AdminCampaignsListPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);

  const [statusFilter, setStatusFilter] = useState<"ALL" | CampaignStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadCampaigns() {
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

        // Fetch society campaigns, pledges and pickups
        const [loadedCampaigns, allPledges, allPickups] = await Promise.all([
          getCampaigns(societyId),
          getPledges(),
          getPickups(),
        ]);

        // Security / Data Isolation: filter for this society only
        const campIds = new Set(loadedCampaigns.map((c) => c.id));
        const societyPledges = allPledges.filter((p) => campIds.has(p.campaignId));
        const societyPickups = allPickups.filter((p) => campIds.has(p.campaignId));

        // Sort by date descending
        loadedCampaigns.sort(
          (a, b) => new Date(b.pickupDate).getTime() - new Date(a.pickupDate).getTime()
        );

        setCampaigns(loadedCampaigns);
        setPledges(societyPledges);
        setPickups(societyPickups);
      } catch (error) {
        console.error("Failed to load admin campaigns:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCampaigns();
  }, [router]);

  // Map campaign pledges & collected weights
  const campaignStats = useMemo(() => {
    const map = new Map<string, { pledgedKg: number; collectedKg: number; pledgesCount: number }>();

    campaigns.forEach((camp) => {
      const campPledges = pledges.filter((p) => p.campaignId === camp.id);
      const campPickups = pickups.filter((p) => p.campaignId === camp.id && p.status === "COMPLETED");

      const pledgedKg = campPledges.reduce((acc, curr) => acc + (curr.estimatedWeight || 0), 0);
      const collectedKg = campPickups.reduce((acc, curr) => acc + (curr.actualWeight || 0), 0);

      map.set(camp.id, {
        pledgedKg: Math.round(pledgedKg * 10) / 10,
        collectedKg: Math.round(collectedKg * 10) / 10,
        pledgesCount: campPledges.length,
      });
    });

    return map;
  }, [campaigns, pledges, pickups]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      if (statusFilter !== "ALL" && camp.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = camp.title.toLowerCase().includes(query);
        const matchDesc = camp.description.toLowerCase().includes(query);
        const matchMaterials = camp.acceptedMaterials.some((m) =>
          m.toLowerCase().includes(query)
        );
        if (!matchTitle && !matchDesc && !matchMaterials) return false;
      }

      return true;
    });
  }, [campaigns, statusFilter, searchQuery]);

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

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />Active</span>;
      case "UPCOMING":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">📅 Upcoming</span>;
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">✓ Completed</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-200">✕ Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          📢
        </div>
        <p className="text-sm font-semibold">Loading society campaigns...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-16">
      {/* Admin Navbar */}
      <AdminNavbar session={session} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
              <span>🏛️</span> {session.society.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Campaign Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create and monitor recycling drives, pickup dates, and accepted material streams.
            </p>
          </div>

          <Link
            href="/admin/campaigns/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-emerald-800/15 transition hover:bg-emerald-800 active:scale-98 self-start sm:self-auto"
          >
            <span>+ Create New Campaign</span>
          </Link>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/80 p-1">
            {(["ALL", "UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition capitalize ${statusFilter === st
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {st === "ALL" ? `All (${campaigns.length})` : `${st.toLowerCase()} (${campaigns.filter((c) => c.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full sm:w-64 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Campaigns Listing */}
        {filteredCampaigns.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3">
            <div className="text-3xl">📢</div>
            <p className="text-base font-semibold text-slate-800">No campaigns found in this view.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ready to announce a new society recycling drive? Create your first campaign now.
            </p>
            <Link
              href="/admin/campaigns/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
            >
              + Create Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Cards (shown on small screens) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredCampaigns.map((camp) => {
                const stats = campaignStats.get(camp.id) || { pledgedKg: 0, collectedKg: 0, pledgesCount: 0 };

                return (
                  <div
                    key={camp.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      {getStatusBadge(camp.status)}
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        📅 {camp.pickupDate}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{camp.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Time: {camp.pickupTime}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {camp.acceptedMaterials.map((m) => getMaterialBadge(m))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Pledged Weight:</span>
                        <p className="font-bold text-slate-800">{stats.pledgedKg} kg ({stats.pledgesCount} flats)</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Actual Collected:</span>
                        <p className="font-extrabold text-emerald-800">{stats.collectedKg} kg</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/admin/campaigns/${camp.id}`}
                        className="w-full flex items-center justify-center rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                      >
                        Manage Campaign & Status →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-5">Campaign Title & Date</th>
                    <th className="py-4 px-5">Accepted Materials</th>
                    <th className="py-4 px-5">Pledged (Expected)</th>
                    <th className="py-4 px-5">Actual Collected</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCampaigns.map((camp) => {
                    const stats = campaignStats.get(camp.id) || { pledgedKg: 0, collectedKg: 0, pledgesCount: 0 };

                    return (
                      <tr key={camp.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-900 text-sm">{camp.title}</p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            📅 {camp.pickupDate} ({camp.pickupTime})
                          </p>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {camp.acceptedMaterials.map((m) => getMaterialBadge(m))}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-800 text-sm">{stats.pledgedKg} kg</p>
                          <p className="text-[10px] text-slate-400">{stats.pledgesCount} participating flats</p>
                        </td>

                        <td className="py-4 px-5">
                          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs">
                            {stats.collectedKg} kg ✓
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          {getStatusBadge(camp.status)}
                        </td>

                        <td className="py-4 px-5 text-right">
                          <Link
                            href={`/admin/campaigns/${camp.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-emerald-700 hover:text-white px-3.5 py-2 text-xs font-bold text-slate-700 transition"
                          >
                            <span>Manage</span>
                            <span>→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

