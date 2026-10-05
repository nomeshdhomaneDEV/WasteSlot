"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession, getRedirectPathForRole } from "@/lib/auth";
import { initializeDatabase, createCampaign } from "@/lib/services";
import { Session, WasteMaterial } from "@/types";
import { AdminNavbar } from "@/components/AdminNavbar";

const ALL_MATERIALS: { id: WasteMaterial; label: string; icon: string; description: string }[] = [
  { id: "E_WASTE", label: "E-Waste", icon: "⚡", description: "Laptops, phones, cables, chargers, small appliances" },
  { id: "PLASTIC", label: "Plastic", icon: "🧴", description: "PET bottles, hard plastics, HDPE containers" },
  { id: "PAPER", label: "Paper & Books", icon: "📰", description: "Newspapers, office sheets, notebooks, magazines" },
  { id: "CARDBOARD", label: "Cardboard", icon: "📦", description: "Corrugated packaging boxes, delivery cartons" },
  { id: "METAL", label: "Metals", icon: "🥫", description: "Aluminum cans, copper, tin, iron scrap" },
  { id: "GLASS", label: "Glassware", icon: "🍶", description: "Bottles, clean jars, sorted glassware" },
];

export default function NewCampaignPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("09:00 AM – 01:00 PM");
  const [acceptedMaterials, setAcceptedMaterials] = useState<WasteMaterial[]>([
    "E_WASTE",
    "PLASTIC",
    "CARDBOARD",
  ]);
  const [collectionInstructions, setCollectionInstructions] = useState(
    "Place boxed/bundled items outside your flat door by 8:30 AM or deposit at the Clubhouse lobby."
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function init() {
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

      // Set default date to next Saturday
      const d = new Date();
      d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
      setPickupDate(d.toISOString().split("T")[0]);

      setLoading(false);
    }

    init();
  }, [router]);

  const handleToggleMaterial = (mat: WasteMaterial) => {
    if (acceptedMaterials.includes(mat)) {
      if (acceptedMaterials.length === 1) {
        setErrorMessage("At least one recyclable material category must be accepted.");
        return;
      }
      setAcceptedMaterials(acceptedMaterials.filter((m) => m !== mat));
    } else {
      setAcceptedMaterials([...acceptedMaterials, mat]);
    }
    setErrorMessage("");
  };

  const handleSelectAllMaterials = () => {
    setAcceptedMaterials(ALL_MATERIALS.map((m) => m.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Campaign title is required.");
      return;
    }

    if (!pickupDate) {
      setErrorMessage("Please specify the scheduled pickup date.");
      return;
    }

    if (!pickupTime.trim()) {
      setErrorMessage("Pickup time window is required.");
      return;
    }

    if (acceptedMaterials.length === 0) {
      setErrorMessage("At least one accepted recyclable material category must be selected.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please provide a brief campaign description for residents.");
      return;
    }

    if (!collectionInstructions.trim()) {
      setErrorMessage("Please provide collection instructions for flats.");
      return;
    }

    if (!session) return;

    setIsSubmitting(true);

    try {
      // Auto-use admin's societyId and default status = UPCOMING
      const newCampaignId = await createCampaign({
        societyId: session.society.id,
        title: title.trim(),
        description: description.trim(),
        pickupDate,
        pickupTime: pickupTime.trim(),
        acceptedMaterials,
        status: "UPCOMING",
        collectionInstructions: collectionInstructions.trim(),
        createdAt: new Date().toISOString(),
      });

      setSuccessMessage("Campaign scheduled successfully! Redirecting...");

      setTimeout(() => {
        router.push(`/admin/campaigns/${newCampaignId}`);
      }, 1500);
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setErrorMessage("An unexpected error occurred while saving the campaign.");
      setIsSubmitting(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-2xl animate-pulse mb-3">
          📢
        </div>
        <p className="text-sm font-semibold">Preparing campaign creator...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/15 to-slate-50 font-sans pb-20">
      {/* Admin Navbar */}
      <AdminNavbar session={session} />

      {/* Main Container */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Breadcrumb / Top Link */}
        <div className="flex items-center gap-3">
          <Link href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Campaigns</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-semibold text-slate-500">
            {session.society.name}
          </span>
        </div>

        {/* Title Card */}
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 mb-2">
            <span>📢</span> Schedule Society Drive
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create New Recycling Campaign
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish a scheduled scrap & e-waste drive for all households in {session.society.name}.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Messages */}
          {errorMessage && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <span>✓</span> {successMessage}
            </div>
          )}

          {/* 1. Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Campaign Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q2 Mega E-Waste & Plastic Drive"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* 2. Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Campaign Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose, target recyclables and campaign goals for society residents..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* 3. Schedule (Date & Time) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Pickup Date *
              </label>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Pickup Time Window *
              </label>
              <input
                type="text"
                required
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                placeholder="e.g. 10:00 AM – 02:00 PM"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* 4. Accepted Materials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Accepted Recyclable Materials * ({acceptedMaterials.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAllMaterials}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
              >
                Select All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_MATERIALS.map((mat) => {
                const isSelected = acceptedMaterials.includes(mat.id);
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleToggleMaterial(mat.id)}
                    className={`flex items-start justify-between p-3.5 rounded-2xl border text-left transition ${isSelected
                      ? "border-emerald-600 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-600"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{mat.icon}</span>
                        <p className="text-xs font-bold text-slate-900">{mat.label}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{mat.description}</p>
                    </div>
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${isSelected
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

          {/* 5. Collection Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Doorstep Collection Instructions *
            </label>
            <textarea
              required
              rows={2}
              value={collectionInstructions}
              onChange={(e) => setCollectionInstructions(e.target.value)}
              placeholder="e.g. Place boxed materials outside your flat door by 9:00 AM..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Metadata Card Notice */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Society:</span>
              <span className="font-bold text-slate-900">{session.society.name} ({session.society.city})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Initial Status:</span>
              <span className="font-bold text-blue-700">UPCOMING</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
            <Link
              href="/admin/campaigns"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold text-slate-700 text-center hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white shadow-md shadow-emerald-800/15 transition hover:bg-emerald-800 active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Scheduling Campaign...</span>
              ) : (
                <>
                  <span>Publish Campaign to Residents</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

