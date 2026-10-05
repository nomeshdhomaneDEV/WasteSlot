"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getPledgesByResident,
  getPickupsByResident,
  getCampaigns,
} from "@/lib/services";
import { Session, Pledge, Pickup, Campaign, WasteMaterial, PledgeStatus } from "@/types";
import { ResidentNavbar } from "@/components/ResidentNavbar";

export default function ResidentPledgesPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COLLECTED">("ALL");

  useEffect(() => {
    async function loadPledges() {
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

        const [loadedPledges, loadedPickups, loadedCampaigns] = await Promise.all([
          getPledgesByResident(residentId),
          getPickupsByResident(residentId),
          getCampaigns(societyId),
        ]);

        // Sort latest first
        loadedPledges.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setPledges(loadedPledges);
        setPickups(loadedPickups);
        setCampaigns(loadedCampaigns);
      } catch (error) {
        console.error("Failed to load resident pledges:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPledges();
  }, [router]);

  const campaignMap = useMemo(() => {
    const map = new Map<string, Campaign>();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  const pickupMap = useMemo(() => {
    const map = new Map<string, Pickup>();
    pickups.forEach((p) => {
      if (p.pledgeId) map.set(p.pledgeId, p);
    });
    return map;
  }, [pickups]);

  const filteredPledges = useMemo(() => {
    return pledges.filter((p) => {
      if (statusFilter === "ACTIVE") {
        return p.status === "PLEDGED" || p.status === "SCHEDULED";
      }
      if (statusFilter === "COLLECTED") {
        return p.status === "COLLECTED";
      }
      return true;
    });
  }, [pledges, statusFilter]);

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

  const getStatusBadge = (status: PledgeStatus) => {
    switch (status) {
      case "COLLECTED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">✓ Collected</span>;
      case "SCHEDULED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">● Scheduled</span>;
      case "PLEDGED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">📌 Pledged</span>;
      case "CANCELLED":
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-200">✕ Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl animate-pulse mb-3">
          ♻
        </div>
        <p className="text-sm font-semibold">Loading your pledge records...</p>
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
              <span>📋</span> {session.user.name} ({session.user.unitOrFlat})
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Recyclable Pledges
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              History of your scrap declarations, estimated weights, and certified weigh-in results.
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 border border-slate-200 text-center shadow-sm">
              <p className="text-xs text-slate-400 font-medium">Total Pledges</p>
              <p className="text-lg font-extrabold text-slate-900">{pledges.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-3 border border-slate-200 text-center shadow-sm">
              <p className="text-xs text-slate-400 font-medium">Fulfilled</p>
              <p className="text-lg font-extrabold text-emerald-700">
                {pledges.filter((p) => p.status === "COLLECTED").length}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="inline-flex rounded-xl bg-slate-200/80 p-1">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === "ALL" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Pledges ({pledges.length})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === "ACTIVE" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Pending / Scheduled ({pledges.filter((p) => p.status === "PLEDGED" || p.status === "SCHEDULED").length})
          </button>
          <button
            onClick={() => setStatusFilter("COLLECTED")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === "COLLECTED" ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Collected ({pledges.filter((p) => p.status === "COLLECTED").length})
          </button>
        </div>

        {/* Pledges List */}
        {filteredPledges.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3">
            <div className="text-3xl">📦</div>
            <p className="text-base font-semibold text-slate-800">No pledges found in this view.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ready to recycle? Browse available campaigns in your society and pledge your materials.
            </p>
            <Link
              href="/resident/pickups"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition"
            >
              Browse Active Society Drives
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Cards (shown on small screens) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredPledges.map((pledge) => {
                const linkedCamp = campaignMap.get(pledge.campaignId);
                const linkedPickup = pickupMap.get(pledge.id);

                return (
                  <div
                    key={pledge.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      {getStatusBadge(pledge.status)}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(pledge.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {linkedCamp?.title || pledge.campaignId}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Drive Date: {linkedCamp?.pickupDate || "Upcoming"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {pledge.materials.map((m) => getMaterialBadge(m))}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Est. Weight:</span>
                        <p className="font-bold text-slate-800">{pledge.estimatedWeight} kg</p>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400">Verified Actual:</span>
                        {linkedPickup?.actualWeight !== null && linkedPickup?.actualWeight !== undefined ? (
                          <p className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {linkedPickup.actualWeight} kg ✓
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">Pending weigh-in</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-5">Pledge ID & Date</th>
                    <th className="py-4 px-5">Drive / Campaign</th>
                    <th className="py-4 px-5">Pledged Materials</th>
                    <th className="py-4 px-5">Est. Weight</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5">Verified Scale Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPledges.map((pledge) => {
                    const linkedCamp = campaignMap.get(pledge.campaignId);
                    const linkedPickup = pickupMap.get(pledge.id);

                    return (
                      <tr key={pledge.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-5">
                          <p className="font-mono font-bold text-slate-800">{pledge.id}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(pledge.createdAt).toLocaleDateString()} at {new Date(pledge.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-900">{linkedCamp?.title || pledge.campaignId}</p>
                          <p className="text-[10px] text-slate-500 font-mono">📅 {linkedCamp?.pickupDate}</p>
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {pledge.materials.map((m) => getMaterialBadge(m))}
                          </div>
                        </td>

                        <td className="py-4 px-5 font-bold text-slate-700 text-sm">
                          {pledge.estimatedWeight} kg
                        </td>

                        <td className="py-4 px-5">
                          {getStatusBadge(pledge.status)}
                        </td>

                        <td className="py-4 px-5">
                          {linkedPickup?.actualWeight !== null && linkedPickup?.actualWeight !== undefined ? (
                            <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
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
          </div>
        )}
      </main>
    </div>
  );
}
