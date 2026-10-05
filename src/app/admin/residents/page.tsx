"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getUsersBySociety,
  getCampaigns,
  getPledges,
  getPickups,
  getSociety,
} from "@/lib/services";
import { Session, User, Campaign, Pledge, Pickup, Society, WasteMaterial } from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

interface ResidentStats {
  user: User;
  pledgesCount: number;
  completedPickupsCount: number;
  totalEstimatedKg: number;
  totalCollectedKg: number;
  participationStatus: "ACTIVE_RECYCLER" | "PLEDGED" | "REGISTERED";
  pledges: Pledge[];
  pickups: Pickup[];
}

export default function AdminResidentsPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);
  const [residents, setResidents] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResident, setSelectedResident] = useState<ResidentStats | null>(null);

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

        const societyId = currentSession.society.id;

        // Fetch data concurrently from IndexedDB
        const [loadedSociety, loadedUsers, loadedCampaigns, allPledges, allPickups] =
          await Promise.all([
            getSociety(societyId),
            getUsersBySociety(societyId),
            getCampaigns(societyId),
            getPledges(),
            getPickups(),
          ]);

        // Security / Data Isolation: Strictly filter campaigns, pledges, pickups for this society
        const societyCampaignIds = new Set(loadedCampaigns.map((c) => c.id));
        const societyPledges = allPledges.filter((p) => societyCampaignIds.has(p.campaignId));
        const societyPickups = allPickups.filter((p) => societyCampaignIds.has(p.campaignId));

        // Filter only residents belonging to this society
        const societyResidents = loadedUsers.filter((u) => u.role === "RESIDENT");

        setSociety(loadedSociety || currentSession.society);
        setResidents(societyResidents);
        setCampaigns(loadedCampaigns);
        setPledges(societyPledges);
        setPickups(societyPickups);
      } catch (error) {
        console.error("Error loading admin residents data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const campaignMap = useMemo(() => {
    const map = new Map<string, Campaign>();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  // Aggregate resident statistics
  const residentStatsList = useMemo<ResidentStats[]>(() => {
    return residents.map((resident) => {
      const userPledges = pledges.filter((p) => p.residentId === resident.id);
      const userPickups = pickups.filter((p) => p.residentId === resident.id);

      const pledgesCount = userPledges.length;
      const completedPickups = userPickups.filter((p) => p.status === "COMPLETED");
      const completedPickupsCount = completedPickups.length;

      const totalEstimatedKg = userPledges.reduce(
        (sum, p) => sum + (Number(p.estimatedWeight) || 0),
        0
      );

      const totalCollectedKg = completedPickups.reduce(
        (sum, p) => sum + (Number(p.actualWeight) || 0),
        0
      );

      let participationStatus: "ACTIVE_RECYCLER" | "PLEDGED" | "REGISTERED" = "REGISTERED";
      if (completedPickupsCount > 0) {
        participationStatus = "ACTIVE_RECYCLER";
      } else if (pledgesCount > 0) {
        participationStatus = "PLEDGED";
      }

      return {
        user: resident,
        pledgesCount,
        completedPickupsCount,
        totalEstimatedKg: Math.round(totalEstimatedKg * 10) / 10,
        totalCollectedKg: Math.round(totalCollectedKg * 10) / 10,
        participationStatus,
        pledges: userPledges,
        pickups: userPickups,
      };
    });
  }, [residents, pledges, pickups]);

  // Search filtered residents
  const filteredResidents = useMemo(() => {
    if (!searchQuery.trim()) return residentStatsList;
    const query = searchQuery.toLowerCase().trim();
    return residentStatsList.filter(
      (r) =>
        r.user.name.toLowerCase().includes(query) ||
        r.user.email.toLowerCase().includes(query) ||
        (r.user.unitOrFlat && r.user.unitOrFlat.toLowerCase().includes(query))
    );
  }, [residentStatsList, searchQuery]);

  // Overall society summary KPIs
  const totalEnrolled = residentStatsList.length;
  const activeContributors = residentStatsList.filter((r) => r.pledgesCount > 0).length;
  const totalSocietyEstimatedKg = residentStatsList.reduce(
    (sum, r) => sum + r.totalEstimatedKg,
    0
  );
  const totalSocietyCollectedKg = residentStatsList.reduce(
    (sum, r) => sum + r.totalCollectedKg,
    0
  );

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

  const getStatusBadge = (status: "ACTIVE_RECYCLER" | "PLEDGED" | "REGISTERED") => {
    switch (status) {
      case "ACTIVE_RECYCLER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Active Recycler
          </span>
        );
      case "PLEDGED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
            ● Pledged
          </span>
        );
      case "REGISTERED":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            ○ Enrolled
          </span>
        );
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          👥
        </div>
        <p className="text-sm font-semibold">Loading society residents directory...</p>
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
              <span className="text-slate-500">Society Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Registered Society Residents
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Household recycling participation, active pledges, and verified collection totals for {society?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/admin/campaigns/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition"
            >
              <span>+ Schedule Campaign</span>
            </Link>
          </div>
        </div>

        {/* ---------------- 1. TOP SUMMARY CARDS ---------------- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Total Enrolled</span>
              <span className="text-base">👥</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalEnrolled}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              of {society?.totalHouseholds || 120} society flats registered
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Active Contributors</span>
              <span className="text-base">🌟</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-emerald-800">
              {activeContributors}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {totalEnrolled > 0 ? Math.round((activeContributors / totalEnrolled) * 100) : 0}% enrolled participation
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Total Pledged</span>
              <span className="text-base">📋</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">
              {Math.round(totalSocietyEstimatedKg * 10) / 10} <span className="text-xs font-semibold text-slate-500">kg</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cumulative estimated pledges
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-300">
              <span>Verified Collected</span>
              <span className="text-base">⚖️</span>
            </div>
            <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">
              {Math.round(totalSocietyCollectedKg * 10) / 10} <span className="text-xs font-semibold text-emerald-300">kg</span>
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Completed scale pickups
            </p>
          </div>
        </section>

        {/* ---------------- 2. SEARCH BAR ---------------- */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative w-full sm:w-96">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by resident name, email, or flat..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-500 self-end sm:self-auto font-medium">
            Showing <span className="font-bold text-slate-900">{filteredResidents.length}</span> of {residentStatsList.length} residents
          </div>
        </section>

        {/* ---------------- 3. RESIDENTS DIRECTORY (MOBILE CARDS + DESKTOP TABLE) ---------------- */}
        {filteredResidents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl mb-3">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching residents found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? `No resident matches "${searchQuery}". Try clearing the search filter.` : "No registered residents found in this society."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <section className="space-y-4">
            {/* --- Mobile View (Cards: 360px - 768px) --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredResidents.map((item) => (
                <div
                  key={item.user.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-xl">
                        {item.user.avatar || "👤"}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{item.user.name}</h3>
                        <p className="text-xs font-semibold text-emerald-800">{item.user.unitOrFlat || "Flat Resident"}</p>
                      </div>
                    </div>
                    {getStatusBadge(item.participationStatus)}
                  </div>

                  <p className="text-xs text-slate-500 truncate">{item.user.email}</p>

                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Pledges</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-0.5">{item.pledgesCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Est. Waste</p>
                      <p className="text-sm font-extrabold text-slate-800 mt-0.5">{item.totalEstimatedKg} kg</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Collected</p>
                      <p className="text-sm font-extrabold text-emerald-800 mt-0.5">{item.totalCollectedKg} kg</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedResident(item)}
                    className="w-full rounded-xl bg-slate-100 hover:bg-emerald-700 hover:text-white py-2 text-xs font-bold text-slate-700 transition"
                  >
                    View Resident History ({item.pledgesCount})
                  </button>
                </div>
              ))}
            </div>

            {/* --- Desktop View (Table: >= 768px) --- */}
            <div className="hidden md:block rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-6">Resident & Unit</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6 text-center">Pledges Made</th>
                    <th className="py-4 px-6 text-right">Est. Weight</th>
                    <th className="py-4 px-6 text-right">Verified Weight</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResidents.map((item) => (
                    <tr key={item.user.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                            {item.user.avatar || "👤"}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{item.user.name}</p>
                            <p className="text-[11px] font-semibold text-emerald-800">{item.user.unitOrFlat || "Flat Resident"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {item.user.email}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                          {item.pledgesCount} {item.pledgesCount === 1 ? "pledge" : "pledges"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-700">
                        {item.totalEstimatedKg} kg
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-emerald-800">
                        {item.totalCollectedKg > 0 ? (
                          <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.totalCollectedKg} kg ✓
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">0.0 kg</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {getStatusBadge(item.participationStatus)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedResident(item)}
                          className="rounded-xl bg-slate-100 hover:bg-emerald-700 hover:text-white px-3 py-1.5 text-xs font-bold text-slate-700 transition"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* ----------------- MODAL: RESIDENT PLEDGES & PICKUPS HISTORY ----------------- */}
      {selectedResident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                  {selectedResident.user.avatar || "👤"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedResident.user.name}</h3>
                    {getStatusBadge(selectedResident.participationStatus)}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedResident.user.unitOrFlat} • {selectedResident.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResident(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Stats */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Pledges</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{selectedResident.pledgesCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Estimated Waste</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{selectedResident.totalEstimatedKg} kg</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Scale Collected</p>
                <p className="text-base font-bold text-emerald-800 mt-0.5">{selectedResident.totalCollectedKg} kg</p>
              </div>
            </div>

            {/* Pledges Activity List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Participation Records ({selectedResident.pledges.length})
              </h4>

              {selectedResident.pledges.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No pledges recorded yet for this resident.
                </div>
              ) : (
                selectedResident.pledges.map((pledge) => {
                  const campaign = campaignMap.get(pledge.campaignId);
                  const pickup = selectedResident.pickups.find((p) => p.pledgeId === pledge.id);

                  return (
                    <div
                      key={pledge.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {campaign?.title || "Society Campaign"}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {campaign?.pickupDate || new Date(pledge.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {pledge.materials.map((m) => getMaterialBadge(m))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <div>
                          <span className="text-slate-500">Pledged: </span>
                          <span className="font-bold text-slate-800">{pledge.estimatedWeight} kg</span>
                        </div>

                        <div>
                          <span className="text-slate-500">Collected: </span>
                          {pickup?.actualWeight !== null && pickup?.actualWeight !== undefined ? (
                            <span className="font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                              {pickup.actualWeight} kg ✓
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending scale weighing</span>
                          )}
                        </div>

                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                          {pledge.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedResident(null)}
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
