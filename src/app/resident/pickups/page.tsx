"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession, getRedirectPathForRole } from "@/lib/auth";
import { initializeDatabase, getCampaigns } from "@/lib/services";
import { Session, Campaign, WasteMaterial, CampaignStatus } from "@/types";
import { ResidentNavbar } from "@/components/ResidentNavbar";

export default function ResidentCampaignsPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "ACTIVE" | "UPCOMING">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
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

        const loadedCampaigns = await getCampaigns(currentSession.society.id);
        // Exclude CANCELLED campaigns from available drives
        const availableCampaigns = loadedCampaigns.filter((c) => c.status !== "CANCELLED");
        setCampaigns(availableCampaigns);
      } catch (error) {
        console.error("Failed to load campaigns:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      // Filter by status tab
      if (selectedFilter === "ACTIVE" && camp.status !== "ACTIVE") return false;
      if (selectedFilter === "UPCOMING" && camp.status !== "UPCOMING") return false;

      // Filter by search query
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
  }, [campaigns, selectedFilter, searchQuery]);

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
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Active Drive
          </span>
        );
      case "UPCOMING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
            <span>📅</span> Upcoming
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
            <span>✓</span> Completed
          </span>
        );
      default:
        return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl animate-pulse mb-3">
          ♻
        </div>
        <p className="text-sm font-semibold">Loading available drives...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-16">
      {/* Shared Resident Navigation */}
      <ResidentNavbar session={session} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
              <span>🌱</span> {session.society.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Recycling & E-Waste Pickup Drives
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select an active or upcoming society drive to pledge your household recyclable scrap.
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
            <button
              onClick={() => setSelectedFilter("ALL")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                selectedFilter === "ALL" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Drives ({campaigns.length})
            </button>
            <button
              onClick={() => setSelectedFilter("ACTIVE")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                selectedFilter === "ACTIVE" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Now ({campaigns.filter((c) => c.status === "ACTIVE").length})
            </button>
            <button
              onClick={() => setSelectedFilter("UPCOMING")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                selectedFilter === "UPCOMING" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Upcoming ({campaigns.filter((c) => c.status === "UPCOMING").length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drives or materials..."
              className="w-full sm:w-64 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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

        {/* Campaign Cards Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <p className="text-base font-semibold">No drives matching your selection.</p>
            <p className="text-xs text-slate-400 mt-1">Try switching filters or clearing your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((camp) => {
              const isPledgeable = camp.status === "ACTIVE" || camp.status === "UPCOMING";

              return (
                <div
                  key={camp.id}
                  className={`flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-lg ${
                    camp.status === "ACTIVE"
                      ? "border-emerald-300 ring-1 ring-emerald-500/20"
                      : "border-slate-200/80 hover:border-emerald-300"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Status & Date Tag */}
                    <div className="flex items-center justify-between gap-2">
                      {getStatusBadge(camp.status)}
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        📅 {camp.pickupDate}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {camp.title}
                      </h2>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {camp.description}
                      </p>
                    </div>

                    {/* Time Window */}
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pickup Window:</span>
                        <span className="font-semibold text-slate-800">{camp.pickupTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Collection:</span>
                        <span className="font-semibold text-slate-800">Doorstep Collection</span>
                      </div>
                    </div>

                    {/* Accepted Materials */}
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Accepted Materials:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {camp.acceptedMaterials.map((m) => getMaterialBadge(m))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer CTA */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {isPledgeable ? (
                      <Link
                        href={`/resident/pickups/${camp.id}`}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-xs font-bold text-white shadow-md shadow-emerald-800/15 transition hover:bg-emerald-800 active:scale-98"
                      >
                        <span>View Details & Pledge</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    ) : (
                      <Link
                        href={`/resident/pickups/${camp.id}`}
                        className="w-full flex items-center justify-center rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                      >
                        View Archived Drive Details
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
