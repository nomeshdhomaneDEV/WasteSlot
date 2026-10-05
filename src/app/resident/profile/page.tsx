"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getSociety,
  getPledgesByResident,
  getResidentImpactStats,
} from "@/lib/services";
import { Session, Society, ImpactStats } from "@/types";
import { ResidentNavbar } from "@/components/ResidentNavbar";

export default function ResidentProfilePage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [pledgeCount, setPledgeCount] = useState<number>(0);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
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

        const [loadedSociety, loadedPledges, loadedImpact] = await Promise.all([
          getSociety(currentSession.society.id),
          getPledgesByResident(currentSession.user.id),
          getResidentImpactStats(currentSession.user.id),
        ]);

        setSociety(loadedSociety || currentSession.society);
        setPledgeCount(loadedPledges.length);
        setImpactStats(loadedImpact);
      } catch (error) {
        console.error("Failed to load resident profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl animate-pulse mb-3">
          👤
        </div>
        <p className="text-sm font-semibold">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-16">
      {/* Shared Resident Navigation */}
      <ResidentNavbar session={session} />

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
              <span>👤</span> Resident Account
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Resident Profile & Society Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your local demo credentials and residential society association.
            </p>
          </div>
        </div>

        {/* ----------------- 1. RESIDENT IDENTITY CARD ----------------- */}
        <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-4xl text-white shadow-md shadow-emerald-700/20">
                {session.user.avatar || "👤"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{session.user.name}</h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    Resident
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{session.user.email}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">
                  📍 {session.user.unitOrFlat || "Flat Resident"}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 active:scale-98 self-start sm:self-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out / Switch Demo User</span>
            </button>
          </div>

          {/* Account Detail Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">User Identifier (Local DB):</span>
              <p className="font-mono font-bold text-slate-800">{session.user.id}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Role Type:</span>
              <p className="font-bold text-emerald-800 uppercase">{session.user.role}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Household Flat:</span>
              <p className="font-bold text-slate-800">{session.user.unitOrFlat || "Standard Unit"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Session Status:</span>
              <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                Active Browser Demo Session
              </p>
            </div>
          </div>
        </div>

        {/* ----------------- 2. RESIDENTIAL SOCIETY CARD ----------------- */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-xl">
                🏛️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Registered Housing Society</h3>
                <p className="text-xs text-slate-500">Coordinated community recycling zone</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              Verified Society
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Society Name:</span>
              <p className="font-bold text-slate-900 text-sm">{society?.name || session.society.name}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">City & Region:</span>
              <p className="font-bold text-slate-900 text-sm">{society?.city || session.society.city}</p>
            </div>
            <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Registered Address:</span>
              <p className="font-semibold text-slate-800">{society?.address || session.society.address}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Total Participating Households:</span>
              <p className="font-bold text-emerald-800 text-sm">{society?.totalHouseholds || session.society.totalHouseholds} Homes</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-1">
              <span className="text-slate-400 font-medium">Society ID:</span>
              <p className="font-mono font-bold text-slate-800">{society?.id || session.society.id}</p>
            </div>
          </div>
        </div>

        {/* ----------------- 3. HOUSEHOLD PARTICIPATION SUMMARY ----------------- */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h3 className="text-base font-bold text-slate-900">Participation Snapshot</h3>
            <p className="text-xs text-slate-500">Overview of your lifetime contributions</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-2xl font-extrabold text-slate-900">{pledgeCount}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Pledges Placed</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-2xl font-extrabold text-emerald-800">
                {impactStats?.totalCollectedKg ?? 0} kg
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Actual Collected</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-2xl font-extrabold text-teal-800">
                {impactStats?.co2SavedKg ?? 0} kg
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">CO₂ Offset</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>💡 All data is stored in your local browser storage via IndexedDB.</span>
            <Link
              href="/resident/impact"
              className="font-bold text-emerald-700 hover:text-emerald-900"
            >
              View Full Impact Report →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
