"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import {
  initializeDatabase,
  getCampaignById,
  createPledge,
  createPickup,
} from "@/lib/services";
import { Session, Campaign, WasteMaterial, Pledge } from "@/types";
import { ResidentNavbar } from "@/components/ResidentNavbar";

export default function CampaignDetailPage({
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

  // Pledge flow state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMaterials, setSelectedMaterials] = useState<WasteMaterial[]>([]);
  const [estimatedWeight, setEstimatedWeight] = useState<number>(10);
  const [pledgeNotes, setPledgeNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successPledge, setSuccessPledge] = useState<Pledge | null>(null);

  useEffect(() => {
    async function loadCampaign() {
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

        const loadedCampaign = await getCampaignById(campaignId);
        if (!loadedCampaign) {
          router.push("/resident/pickups");
          return;
        }

        setCampaign(loadedCampaign);

        // Preselect first accepted material
        if (loadedCampaign.acceptedMaterials.length > 0) {
          setSelectedMaterials([loadedCampaign.acceptedMaterials[0]]);
        }
      } catch (error) {
        console.error("Error loading campaign details:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCampaign();
  }, [campaignId, router]);

  // Toggle material selection
  const handleToggleMaterial = (material: WasteMaterial) => {
    if (selectedMaterials.includes(material)) {
      if (selectedMaterials.length === 1) {
        setErrorMessage("Please select at least one recyclable material category.");
        return;
      }
      setSelectedMaterials(selectedMaterials.filter((m) => m !== material));
    } else {
      setSelectedMaterials([...selectedMaterials, material]);
    }
    setErrorMessage("");
  };

  // Validation before proceeding to step 2/3
  const handleProceedToReview = () => {
    setErrorMessage("");
    if (selectedMaterials.length === 0) {
      setErrorMessage("At least one accepted material must be selected.");
      return;
    }
    if (estimatedWeight <= 0 || isNaN(estimatedWeight)) {
      setErrorMessage("Estimated weight must be greater than 0 kg.");
      return;
    }
    setStep(2);
  };

  // Submit Pledge into IndexedDB
  const handleConfirmPledge = async () => {
    if (!session || !campaign) return;

    if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
      setErrorMessage("This campaign is no longer active for new pledges.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Create Pledge in IndexedDB
      const pledgeId = await createPledge({
        campaignId: campaign.id,
        residentId: session.user.id,
        materials: selectedMaterials,
        estimatedWeight: Number(estimatedWeight),
        status: "PLEDGED",
        createdAt: new Date().toISOString(),
      });

      // 2. Create matching Pickup for Collector manifest in IndexedDB
      await createPickup({
        pledgeId,
        campaignId: campaign.id,
        residentId: session.user.id,
        collectorId: "user_col_001", // Assigned demo collector partner
        actualWeight: null,
        status: "PENDING",
        completedAt: null,
      });

      setSuccessPledge({
        id: pledgeId,
        campaignId: campaign.id,
        residentId: session.user.id,
        materials: selectedMaterials,
        estimatedWeight: Number(estimatedWeight),
        status: "PLEDGED",
        createdAt: new Date().toISOString(),
      });

      setStep(3);

      // Auto redirect after 2.5 seconds
      setTimeout(() => {
        router.push("/resident/pledges");
      }, 2500);
    } catch (err) {
      console.error("Failed to create pledge:", err);
      setErrorMessage("An error occurred while saving your pledge. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  if (loading || !session || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 text-2xl animate-pulse mb-3">
          ♻
        </div>
        <p className="text-sm font-semibold">Loading drive details...</p>
      </div>
    );
  }

  const isPledgeable = campaign.status === "ACTIVE" || campaign.status === "UPCOMING";
  const estimatedCo2 = (estimatedWeight * 2.1).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-20">
      {/* Shared Resident Navigation */}
      <ResidentNavbar session={session} />

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Campaign Banner */}
        <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              Drive Status: {campaign.status}
            </span>
            <span className="text-xs font-bold text-slate-500 font-mono">
              📅 {campaign.pickupDate} ({campaign.pickupTime})
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {campaign.title}
          </h1>

          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {campaign.description}
          </p>

          {/* Drive Metadata Highlights */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-700">
            <div>
              <span className="text-slate-400 font-medium">Pickup Schedule:</span>
              <p className="font-bold text-slate-900 mt-0.5">{campaign.pickupDate} • {campaign.pickupTime}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Society Community:</span>
              <p className="font-bold text-slate-900 mt-0.5">{session.society.name}, {session.society.city}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 font-medium">Collection Instructions:</span>
              <p className="font-semibold text-emerald-900 mt-0.5 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100">
                {campaign.collectionInstructions}
              </p>
            </div>
          </div>
        </div>

        {/* Pledge Section or Closed Notice */}
        {!isPledgeable ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
            <h2 className="text-lg font-bold">This Drive Is No Longer Accepting Pledges</h2>
            <p className="text-xs text-amber-700 mt-1">
              This campaign is marked as {campaign.status}. Please explore other active society drives.
            </p>
            <Link
              href="/resident/pickups"
              className="mt-4 inline-flex items-center rounded-xl bg-amber-800 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-900 transition"
            >
              Browse Active Drives
            </Link>
          </div>
        ) : (
          /* Interactive Multi-Step Pledge Box */
          <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-lg shadow-emerald-950/5">
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Step {step} of 3
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  {step === 1 && "Select Materials & Estimate Weight"}
                  {step === 2 && "Review & Confirm Household Pledge"}
                  {step === 3 && "Pledge Confirmed!"}
                </h2>
              </div>

              {step === 2 && (
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  ← Edit Selections
                </button>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            {/* ----------------- STEP 1: SELECT MATERIALS & WEIGHT ----------------- */}
            {step === 1 && (
              <div className="space-y-6">
                {/* 1. Materials Checklist */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    1. Select Recyclable Materials You Wish to Pledge:
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Choose one or more categories accepted in this campaign.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {campaign.acceptedMaterials.map((material) => {
                      const isSelected = selectedMaterials.includes(material);
                      return (
                        <button
                          key={material}
                          type="button"
                          onClick={() => handleToggleMaterial(material)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-600"
                              : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/80"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {material.replace("_", " ")}
                            </p>
                            <p className="text-[10px] text-slate-500">Accepted</p>
                          </div>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-300 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Estimated Weight Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Estimated Total Weight (kg):
                    </label>
                    <span className="text-base font-extrabold text-emerald-800">
                      {estimatedWeight} kg
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Give your best estimate. The collector will log the exact scale weight at your door.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="number"
                      min="0.5"
                      max="200"
                      step="0.5"
                      value={estimatedWeight}
                      onChange={(e) => setEstimatedWeight(Math.max(0.5, Number(e.target.value)))}
                      className="w-32 rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />

                    {/* Quick Add Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 15, 25, 40].map((kg) => (
                        <button
                          key={kg}
                          type="button"
                          onClick={() => setEstimatedWeight(kg)}
                          className={`rounded-xl px-3 py-2 text-xs font-bold border transition ${
                            estimatedWeight === kg
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {kg} kg
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Estimated Impact Callout */}
                <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌱</span>
                    <div>
                      <p className="font-bold text-emerald-950">Estimated Climate Offset</p>
                      <p className="text-emerald-700">This pledge will prevent ≈ {estimatedCo2} kg of CO₂ emissions</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-800 text-sm">+{estimatedCo2} kg</span>
                </div>

                {/* Next Button */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProceedToReview}
                    className="flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 active:scale-98"
                  >
                    <span>Proceed to Review</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- STEP 2: REVIEW & CONFIRM ----------------- */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-slate-500">Drive Name:</span>
                    <span className="font-bold text-slate-900">{campaign.title}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-slate-500">Pickup Date & Time:</span>
                    <span className="font-bold text-slate-900">{campaign.pickupDate} ({campaign.pickupTime})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-slate-500">Pledged Materials:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                      {selectedMaterials.map((m) => getMaterialBadge(m))}
                    </div>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-slate-500">Estimated Total Weight:</span>
                    <span className="font-extrabold text-emerald-800 text-sm">{estimatedWeight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pickup Location:</span>
                    <span className="font-bold text-slate-900">{session.user.unitOrFlat} • {session.society.name}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  ✓ <strong>Pickup Guarantee:</strong> Once confirmed, a pickup task is automatically dispatched to the certified society collector. You can view progress anytime under <em>My Pledges</em>.
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    ← Back to Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPledge}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 active:scale-98 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Saving to IndexedDB...</span>
                    ) : (
                      <>
                        <span>Confirm & Submit Pledge</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ----------------- STEP 3: SUCCESS STATE ----------------- */}
            {step === 3 && successPledge && (
              <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-3xl shadow-inner">
                  ✓
                </div>

                <h3 className="text-2xl font-extrabold text-slate-900">
                  Pledge Successfully Registered!
                </h3>

                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Your pledge of <strong>{successPledge.estimatedWeight} kg</strong> for <em>{campaign.title}</em> has been saved to the local IndexedDB database and queued for doorstep pickup.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/resident/pledges"
                    className="rounded-xl bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-emerald-800"
                  >
                    View in My Pledges List
                  </Link>
                  <Link
                    href="/resident"
                    className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Go to Dashboard
                  </Link>
                </div>

                <p className="text-[11px] text-slate-400 pt-2">
                  Redirecting automatically to My Pledges...
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
