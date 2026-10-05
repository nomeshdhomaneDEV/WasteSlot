"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getPickupById,
  getPledgeById,
  getCampaignById,
  getUserById,
  updatePickupStatus,
  completePickup,
} from "@/lib/services";
import {
  Session,
  Pickup,
  Pledge,
  Campaign,
  User,
  WasteMaterial,
  PickupStatus,
} from "@/types";
import { CollectorNavbar } from "@/components/CollectorNavbar";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CollectorPickupDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const pickupId = resolvedParams.id;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [pledge, setPledge] = useState<Pledge | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [resident, setResident] = useState<User | null>(null);

  // Weight Entry Modal states
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [actualWeightInput, setActualWeightInput] = useState<string>("");
  const [weightError, setWeightError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    async function loadPickupData() {
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

        const loadedPickup = await getPickupById(pickupId);
        if (!loadedPickup) {
          setLoading(false);
          return;
        }

        const [loadedPledge, loadedCampaign, loadedResident] = await Promise.all([
          loadedPickup.pledgeId ? getPledgeById(loadedPickup.pledgeId) : Promise.resolve(undefined),
          loadedPickup.campaignId ? getCampaignById(loadedPickup.campaignId) : Promise.resolve(undefined),
          loadedPickup.residentId ? getUserById(loadedPickup.residentId) : Promise.resolve(undefined),
        ]);

        // Security check: Verify campaign belongs to collector's society
        if (loadedCampaign && loadedCampaign.societyId !== currentSession.society.id) {
          router.push("/collector");
          return;
        }

        setPickup(loadedPickup);
        setPledge(loadedPledge || null);
        setCampaign(loadedCampaign || null);
        setResident(loadedResident || null);

        // Pre-fill weight input with pledge estimated weight if available
        if (loadedPledge && loadedPledge.estimatedWeight && !loadedPickup.actualWeight) {
          setActualWeightInput(String(loadedPledge.estimatedWeight));
        } else if (loadedPickup.actualWeight) {
          setActualWeightInput(String(loadedPickup.actualWeight));
        }
      } catch (error) {
        console.error("Error loading collector pickup details:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPickupData();
  }, [pickupId, router]);

  // Handle status update (e.g. Start Pickup, Mark Missed, Reset)
  const handleUpdateStatus = async (newStatus: PickupStatus) => {
    if (!pickup) return;
    try {
      setActionLoading(true);
      await updatePickupStatus(pickup.id, newStatus);
      
      // Reload fresh data from IndexedDB
      const refreshedPickup = await getPickupById(pickup.id);
      const refreshedPledge = pickup.pledgeId ? await getPledgeById(pickup.pledgeId) : null;
      
      setPickup(refreshedPickup || null);
      if (refreshedPledge) setPledge(refreshedPledge);

      setStatusMessage({
        text: `Pickup status updated to ${newStatus.replace("_", " ")} successfully.`,
        type: "success",
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to update status:", err);
      setStatusMessage({ text: "Failed to update pickup status. Please try again.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Weight Entry Modal with prefill
  const handleOpenWeightModal = () => {
    setWeightError(null);
    if (pledge?.estimatedWeight && !actualWeightInput) {
      setActualWeightInput(String(pledge.estimatedWeight));
    }
    setShowWeightModal(true);
  };

  // Handle Completion with Certified Scale Weight
  const handleConfirmCompletion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pickup) return;

    const trimmed = actualWeightInput.trim();
    if (!trimmed) {
      setWeightError("Please enter the actual measured scale weight.");
      return;
    }

    const weightNum = parseFloat(trimmed);
    if (isNaN(weightNum)) {
      setWeightError("Please enter a valid numeric scale weight.");
      return;
    }

    if (weightNum <= 0) {
      setWeightError("Weight must be greater than 0 kg.");
      return;
    }

    if (weightNum > 500) {
      setWeightError("Measured weight exceeds maximum single household limit (500 kg). Please verify.");
      return;
    }

    try {
      setActionLoading(true);
      setWeightError(null);

      // Perform completePickup transaction in Dexie
      await completePickup(pickup.id, weightNum);

      // Reload fresh data from IndexedDB
      const refreshedPickup = await getPickupById(pickup.id);
      const refreshedPledge = pickup.pledgeId ? await getPledgeById(pickup.pledgeId) : null;

      setPickup(refreshedPickup || null);
      if (refreshedPledge) setPledge(refreshedPledge);

      setShowWeightModal(false);
      setStatusMessage({
        text: `Pickup successfully completed! Verified scale weight of ${weightNum} kg recorded and resident pledge marked as COLLECTED.`,
        type: "success",
      });
    } catch (err) {
      console.error("Failed to complete pickup:", err);
      setWeightError("An error occurred while saving the collection to IndexedDB. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const getMaterialBadge = (material: WasteMaterial) => {
    switch (material) {
      case "E_WASTE":
        return (
          <span key={material} className="rounded-lg bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold">
            ⚡ E-Waste
          </span>
        );
      case "PLASTIC":
        return (
          <span key={material} className="rounded-lg bg-teal-100 text-teal-800 px-2.5 py-1 text-xs font-bold">
            🧴 Plastic
          </span>
        );
      case "PAPER":
        return (
          <span key={material} className="rounded-lg bg-amber-100 text-amber-800 px-2.5 py-1 text-xs font-bold">
            📰 Paper
          </span>
        );
      case "CARDBOARD":
        return (
          <span key={material} className="rounded-lg bg-orange-100 text-orange-800 px-2.5 py-1 text-xs font-bold">
            📦 Cardboard
          </span>
        );
      case "METAL":
        return (
          <span key={material} className="rounded-lg bg-slate-200 text-slate-800 px-2.5 py-1 text-xs font-bold">
            🥫 Metal
          </span>
        );
      case "GLASS":
        return (
          <span key={material} className="rounded-lg bg-cyan-100 text-cyan-800 px-2.5 py-1 text-xs font-bold">
            🍶 Glass
          </span>
        );
      default:
        return (
          <span key={material} className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-bold">
            {material}
          </span>
        );
    }
  };

  const getPickupStatusBadge = (status: PickupStatus) => {
    switch (status) {
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
            In Progress
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
            ⏳ Pending Route
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
            ✓ Collected & Scale Verified
          </span>
        );
      case "MISSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-200">
            ✕ Missed / Flat Locked
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800 text-2xl animate-pulse mb-3">
          🚚
        </div>
        <p className="text-sm font-semibold">Loading pickup order #{pickupId}...</p>
      </div>
    );
  }

  if (!pickup) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-16">
        <CollectorNavbar session={session} />
        <main className="mx-auto max-w-3xl px-4 pt-12 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
            <span className="text-4xl">🔍</span>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Pickup Record Not Found</h2>
            <p className="mt-2 text-xs text-slate-500">
              The requested pickup manifest ID does not exist or has been modified.
            </p>
            <Link
              href="/collector/pickups"
              className="mt-6 inline-block rounded-xl bg-teal-700 px-6 py-2.5 text-xs font-bold text-white hover:bg-teal-800 transition"
            >
              ← Back to Manifest
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/15 to-slate-50 font-sans pb-16">
      <CollectorNavbar session={session} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Status Toast Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between animate-in fade-in duration-200 shadow-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-red-50 text-red-900 border-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{statusMessage.type === "success" ? "🎉" : "⚠️"}</span>
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-white/60 transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 mb-1">
              <Link href="/collector" className="hover:underline">
                Collector Portal
              </Link>
              <span>/</span>
              <Link href="/collector/pickups" className="hover:underline">
                Manifest
              </Link>
              <span>/</span>
              <span className="text-slate-500 font-mono">{pickup.id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pickup Order Details
              </h1>
              {getPickupStatusBadge(pickup.status)}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/collector/pickups"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>← Back to Manifest</span>
            </Link>
          </div>
        </div>

        {/* ---------------- 1. QUICK ACTION BAR & STATUS CONTROLS ---------------- */}
        <section className="rounded-3xl border border-teal-900/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Field Status</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {pickup.status === "PENDING" && "Doorstep Visit Queued — Ready to start route"}
                {pickup.status === "IN_PROGRESS" && "Collector En Route — Active doorstep interaction"}
                {pickup.status === "COMPLETED" && `Completed & Scale Logged (${pickup.actualWeight} kg)`}
                {pickup.status === "MISSED" && "Resident Unavailable or Flat Door Closed"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {pickup.status === "PENDING" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("IN_PROGRESS")}
                    className="rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span>🚀 Start Pickup</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("MISSED")}
                    className="rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    Mark Missed
                  </button>
                </>
              )}

              {pickup.status === "IN_PROGRESS" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={handleOpenWeightModal}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 animate-pulse"
                  >
                    <span>⚖️ Complete Pickup & Enter Weight</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus("MISSED")}
                    className="rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    Mark Missed
                  </button>
                </>
              )}

              {pickup.status === "MISSED" && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus("PENDING")}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span>🔄 Reset to Pending</span>
                </button>
              )}

              {pickup.status === "COMPLETED" && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-300">
                  <span>✓ Verified Scale Weight:</span>
                  <span className="text-sm font-extrabold">{pickup.actualWeight} kg</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------- 2. RESIDENT & CAMPAIGN TWO-COLUMN DETAILS ---------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Resident & Address */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Resident Profile
              </span>
              <span className="text-xl">{resident?.avatar || "👤"}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-semibold">Resident Name</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{resident?.name || "Society Resident"}</p>
              </div>

              <div>
                <p className="text-slate-400 font-semibold">Flat / Door Number</p>
                <p className="text-sm font-extrabold text-teal-800 mt-0.5 bg-teal-50 inline-block px-2.5 py-1 rounded-lg border border-teal-200">
                  📍 {resident?.unitOrFlat || "Flat Resident"}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-semibold">Contact Email</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{resident?.email || "—"}</p>
              </div>

              <div>
                <p className="text-slate-400 font-semibold">Registered Society</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{session.society.name}, {session.society.city}</p>
              </div>
            </div>
          </div>

          {/* Column B: Campaign Information */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Campaign Drive Info
              </span>
              <span className="text-xl">📢</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-semibold">Drive Title</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{campaign?.title || "Society Campaign"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-400 font-semibold">Pickup Date</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">📅 {campaign?.pickupDate}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold">Time Window</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">⏰ {campaign?.pickupTime}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-400 font-semibold">Drive Description</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{campaign?.description || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 3. MATERIALS & WEIGHT VERIFICATION ---------------- */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Pledged Scrap Streams & Scale Verification
            </h2>
            <p className="text-xs text-slate-500">
              Resident pledge status: <strong className="text-teal-800">{pledge?.status || "PLEDGED"}</strong> • ID #{pledge?.id || "N/A"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Materials List */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Accepted Scrap Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {pledge?.materials.map((m) => getMaterialBadge(m)) || (
                  <span className="text-xs text-slate-400">No materials specified</span>
                )}
              </div>
            </div>

            {/* Weights Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Estimated Weight</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">{pledge?.estimatedWeight || 0} kg</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Declared by resident</p>
              </div>

              <div className="rounded-2xl bg-teal-50/50 p-4 border border-teal-100 text-center">
                <p className="text-[10px] font-bold uppercase text-teal-800">Actual Scale Weight</p>
                <p className="text-xl font-extrabold text-teal-900 mt-1">
                  {pickup.actualWeight !== null ? `${pickup.actualWeight} kg` : "—"}
                </p>
                <p className="text-[10px] text-teal-700 mt-0.5 font-medium">
                  {pickup.actualWeight !== null ? "Scale Verified" : "Pending Weigh-in"}
                </p>
              </div>
            </div>
          </div>

          {/* Completion Timestamp Details */}
          {pickup.status === "COMPLETED" && (
            <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-950">✓ Collection Completed & Locked</span>
                <span className="font-mono text-emerald-800 font-semibold">
                  {pickup.completedAt ? new Date(pickup.completedAt).toLocaleString() : "Verified"}
                </span>
              </div>
              <p className="text-emerald-800/90 text-[11px]">
                The resident pledge has been updated to <span className="font-bold">COLLECTED</span> and society impact stats have been credited.
              </p>
            </div>
          )}

          {/* Collection Instructions */}
          {campaign?.collectionInstructions && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Drive Collection Instructions
              </p>
              <p className="text-xs text-slate-600 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80 leading-relaxed">
                📢 {campaign.collectionInstructions}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* ----------------- MODAL: SCALE WEIGHT ENTRY FORM ----------------- */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span>
                <h3 className="text-lg font-bold text-slate-900">Doorstep Scale Weigh-in</h3>
              </div>
              <button
                onClick={() => setShowWeightModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCompletion} className="space-y-4">
              {/* Resident & Pledge Context Card */}
              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Resident & Flat:</span>
                  <span className="font-bold text-slate-900">{resident?.name} ({resident?.unitOrFlat})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pledged Estimate:</span>
                  <span className="font-bold text-slate-900">{pledge?.estimatedWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Accepted Materials:</span>
                  <span className="font-semibold text-teal-800">{pledge?.materials.join(", ")}</span>
                </div>
              </div>

              {/* Weight Input Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Actual Collected Scale Weight (kg) <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="500"
                    autoFocus
                    required
                    value={actualWeightInput}
                    onChange={(e) => {
                      setActualWeightInput(e.target.value);
                      if (weightError) setWeightError(null);
                    }}
                    placeholder="e.g. 16.5"
                    className="w-full rounded-2xl border-2 border-teal-600/60 pl-4 pr-12 py-3 text-lg font-extrabold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-bold text-slate-500">
                    kg
                  </div>
                </div>

                {weightError && (
                  <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                    <span>⚠️</span> {weightError}
                  </p>
                )}
              </div>

              {/* Quick weight adjustment presets */}
              {pledge?.estimatedWeight && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                    Quick Presets:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActualWeightInput(String(pledge.estimatedWeight))}
                      className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                    >
                      Exact Pledged ({pledge.estimatedWeight} kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(actualWeightInput) || pledge.estimatedWeight || 0;
                        setActualWeightInput(String(Math.max(0.1, Math.round((current + 0.5) * 10) / 10)));
                      }}
                      className="rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 px-2.5 py-1 text-xs font-bold transition border border-teal-200"
                    >
                      +0.5 kg
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseFloat(actualWeightInput) || pledge.estimatedWeight || 0;
                        setActualWeightInput(String(Math.max(0.1, Math.round((current - 0.5) * 10) / 10)));
                      }}
                      className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                    >
                      -0.5 kg
                    </button>
                  </div>
                </div>
              )}

              {/* Verification Confirmation notice */}
              <div className="rounded-xl bg-teal-50/60 p-3 border border-teal-100 text-[11px] text-teal-900 leading-relaxed">
                ℹ️ Confirming this weigh-in will lock the pickup as <span className="font-bold">COMPLETED</span> and transition the resident pledge to <span className="font-bold">COLLECTED</span> in real IndexedDB records.
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowWeightModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 text-xs font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? "Saving to IndexedDB..." : "✓ Confirm Scale Weight & Complete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

