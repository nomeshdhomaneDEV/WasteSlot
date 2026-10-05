"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"admin" | "resident" | "collector">("resident");
  const [pledgeWeight, setPledgeWeight] = useState(15);

  // Dynamic impact calculation based on slider
  const co2Saved = (pledgeWeight * 2.1).toFixed(1);
  const waterSaved = Math.round(pledgeWeight * 18.5);
  const treesEquivalent = (pledgeWeight * 0.04).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* -------------------- NAVBAR -------------------- */}
      <header className="sticky top-0 z-50 w-full border-b border-emerald-950/10 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white shadow-md shadow-emerald-700/20 transition-transform group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
                <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
                <path d="m14 16-3 3 3 3" />
                <path d="M8.293 13.596 11 9l2.707 4.596" />
                <path d="m2.5 12 3-3-3-3" />
                <path d="m17.5 7.5 3.5 3.5-3.5 3.5" />
                <path d="M12 2a10 10 0 0 0-3.9 19.2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-emerald-950">
                Waste<span className="text-emerald-600">Slot</span>
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-emerald-700 -mt-1">
                Eco-Coordination
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="transition hover:text-emerald-700">
              How It Works
            </a>
            <a href="#problem" className="transition hover:text-emerald-700">
              The Challenge
            </a>
            <a href="#materials" className="transition hover:text-emerald-700">
              Materials
            </a>
            <a href="#features" className="transition hover:text-emerald-700">
              Platform
            </a>
            <a href="#impact" className="transition hover:text-emerald-700">
              Impact
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50"
            >
              Role Portal
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-800 hover:shadow-md active:scale-98"
            >
              <span>Demo Login</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Mobile menu toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-b border-emerald-900/10 bg-white px-4 py-4 md:hidden shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-3 font-medium text-slate-700">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
              >
                How It Works
              </a>
              <a
                href="#problem"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
              >
                The Challenge
              </a>
              <a
                href="#materials"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Materials
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Platform
              </a>
              <a
                href="#impact"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 hover:bg-emerald-50 hover:text-emerald-800"
              >
                Impact Calculator
              </a>
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-lg bg-emerald-700 py-2.5 text-center text-sm font-semibold text-white shadow-sm"
                >
                  Enter Demo Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* -------------------- HERO SECTION -------------------- */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Subtle background glow circles */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 right-10 -z-10 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Copy & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm mb-6 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Next-Gen Society Recycling & E-Waste Pickup</span>
              </div>

              {/* Tagline & Headline */}
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Turn everyday waste into{" "}
                <span className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  measurable impact.
                </span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl max-w-2xl">
                WasteSlot unites <strong>Society Admins</strong>, <strong>Residents</strong>, and <strong>Certified Collectors</strong> into a seamless, verified pickup cycle. Schedule drives, pledge recyclable materials, and monitor collective carbon savings in real time.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4 w-full sm:w-auto">
                <a
                  href="#how-it-works"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 hover:shadow-xl active:scale-98"
                >
                  <span>See How It Works</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#impact"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-900"
                >
                  <span>Simulate Impact</span>
                </a>
              </div>

              {/* Key Trust Metrics */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200/80 pt-6 w-full max-w-lg">
                <div>
                  <p className="text-2xl font-bold text-emerald-900">100%</p>
                  <p className="text-xs font-medium text-slate-500">Verified Scale Weight</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-900">0%</p>
                  <p className="text-xs font-medium text-slate-500">E-Waste to Landfills</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-900">3-Way</p>
                  <p className="text-xs font-medium text-slate-500">Synced Workflows</p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Eco Dashboard Preview Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-3xl border border-emerald-900/10 bg-white/90 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur-xl">
                {/* Header of Preview Card */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Green Valley Residency</h2>
                      <p className="text-xs text-slate-500">Pune • 120 Households</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    ACTIVE DRIVE
                  </span>
                </div>

                {/* Campaign Highlight Box */}
                <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 p-4 text-white shadow-inner">
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <span>Upcoming Society Drive</span>
                    <span>Sat, 10:00 AM</span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-white">
                    Mega E-Waste & Recyclable Pickup
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-md bg-emerald-800/80 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                      E-Waste
                    </span>
                    <span className="rounded-md bg-emerald-800/80 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                      Plastic
                    </span>
                    <span className="rounded-md bg-emerald-800/80 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                      Cardboard
                    </span>
                    <span className="rounded-md bg-emerald-800/80 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                      Metal
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-800/60 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-emerald-300">Pledged So Far</p>
                      <p className="text-lg font-extrabold text-white">420 kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-emerald-300">Participating Flats</p>
                      <p className="text-lg font-extrabold text-emerald-300">38 Units</p>
                    </div>
                  </div>
                </div>

                {/* Live Activity Step Item */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                        ✓
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">Flat B-402 Pledged</p>
                        <p className="text-[10px] text-slate-500">2 Old Laptops + 8kg Books</p>
                      </div>
                    </div>
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                      Pledged
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-[10px]">
                        ⚖
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">Collector Verified</p>
                        <p className="text-[10px] text-slate-500">Actual Weight: 14.2 kg logged</p>
                      </div>
                    </div>
                    <span className="font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded text-[10px]">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Micro Footer on Card */}
                <div className="mt-4 rounded-xl bg-emerald-50/70 p-3 text-center border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-950">
                    🌱 Impact: <span className="text-emerald-700 font-bold">+29.8 kg CO₂ Diverted</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- THE PROBLEM VS SOLUTION SECTION -------------------- */}
      <section id="problem" className="py-16 md:py-24 bg-white border-y border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Why WasteSlot
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              The Urban Society Waste Challenge
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Housing societies generate tons of recyclable goods and hazardous e-waste every month, yet most of it ends up in mixed city landfills due to poor coordination.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Old Way */}
            <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">The Traditional Chaos</h3>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">✕</span>
                    <span><strong>Unregulated E-Waste:</strong> Batteries, toxic circuit boards, and lead solder mixed into general wet waste.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">✕</span>
                    <span><strong>Scattered Scrap Vendors:</strong> Unverified random scrap buyers entering society premises at irregular times.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">✕</span>
                    <span><strong>Zero Visibility:</strong> Society committees have no record of actual weight recycled or carbon saved.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">✕</span>
                    <span><strong>Low Participation:</strong> Residents forget scrap collection dates without timely alerts and easy pledging.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-red-200/60 text-xs font-semibold text-red-700">
                Result: High landfill contamination & wasted recyclable value.
              </div>
            </div>

            {/* The WasteSlot Way */}
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-6 sm:p-8 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-800/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-emerald-950">The WasteSlot Standard</h3>
                </div>
                <ul className="mt-6 space-y-4 text-sm text-slate-800">
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Scheduled Bulk Campaigns:</strong> Admin announces drives with specific accepted materials in advance.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Instant 1-Click Pledges:</strong> Residents declare recyclables & estimated weights effortlessly.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Verified Doorstep Weighing:</strong> Certified collectors weigh scrap on-site and record accurate numbers.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span><strong>Measurable Environmental Impact:</strong> Automated CO₂ offsets, trees saved, and society ranking statistics.</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-200 text-xs font-semibold text-emerald-900">
                Result: 100% accountable, zero-landfill society recycling drives.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- HOW IT WORKS (3 ROLES) -------------------- */}
      <section id="how-it-works" className="py-16 md:py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Coordinated Workflow
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              How WasteSlot Works
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              A closed-loop 3-step synchronization between society administrators, residents, and verified pickup partners.
            </p>
          </div>

          {/* Role selector tabs */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex rounded-xl bg-slate-200/80 p-1.5 shadow-inner">
              <button
                onClick={() => setActiveTab("admin")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "admin"
                    ? "bg-emerald-800 text-white shadow-md"
                    : "text-slate-700 hover:text-emerald-900"
                }`}
              >
                1. Society Admin
              </button>
              <button
                onClick={() => setActiveTab("resident")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "resident"
                    ? "bg-emerald-800 text-white shadow-md"
                    : "text-slate-700 hover:text-emerald-900"
                }`}
              >
                2. Resident
              </button>
              <button
                onClick={() => setActiveTab("collector")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === "collector"
                    ? "bg-emerald-800 text-white shadow-md"
                    : "text-slate-700 hover:text-emerald-900"
                }`}
              >
                3. Collector
              </button>
            </div>
          </div>

          {/* Interactive Role Card Display */}
          <div className="mt-8 mx-auto max-w-4xl">
            {activeTab === "admin" && (
              <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-10 shadow-xl shadow-emerald-950/5 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Step 1 • Society Leadership
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900">
                      Admin Launches Drive Campaign
                    </h3>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                      The Society Committee creates a scheduled waste drive (e.g. Saturday E-Waste & Plastic Drive). They select accepted materials, set collection instructions, and define the pickup window for all flats.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Designate materials: E-Waste, Plastic, Metal, Paper, etc.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Broadcast campaign details automatically to all residents.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Track aggregate society participation metrics on live dashboard.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="w-full md:w-80 rounded-2xl bg-slate-900 p-5 text-white shadow-md">
                    <p className="text-xs text-emerald-400 font-mono">STATUS: UPCOMING → ACTIVE</p>
                    <p className="mt-2 text-base font-bold">E-Waste & Scrap Special</p>
                    <p className="text-xs text-slate-400 mt-1">Green Valley Residency • Pune</p>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
                      <span>Target: 500 kg</span>
                      <span className="text-emerald-400">Accepted: 5 Streams</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "resident" && (
              <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-10 shadow-xl shadow-emerald-950/5 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Step 2 • Household Action
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900">
                      Resident Pledges Household Recyclables
                    </h3>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                      Residents browse upcoming campaigns in their society portal, select what materials they have at home (e.g. old monitors, newspapers, cartons), and enter an estimated weight in under 30 seconds.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Instant multi-category selection without complex forms.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Pre-scheduled pickup slot right at the society floor/door.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Accumulate household eco-credits and green impact scores.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="w-full md:w-80 rounded-2xl bg-emerald-950 p-5 text-white shadow-md">
                    <p className="text-xs text-emerald-300 font-mono">STATUS: PLEDGED</p>
                    <p className="mt-2 text-base font-bold">Flat A-301 Pledge</p>
                    <p className="text-xs text-emerald-200 mt-1">Est. Weight: ~18 kg</p>
                    <div className="mt-4 flex gap-1.5 flex-wrap">
                      <span className="bg-emerald-800 text-[10px] px-2 py-0.5 rounded text-white">E_WASTE</span>
                      <span className="bg-emerald-800 text-[10px] px-2 py-0.5 rounded text-white">CARDBOARD</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "collector" && (
              <div className="rounded-3xl border border-emerald-900/10 bg-white p-6 sm:p-10 shadow-xl shadow-emerald-950/5 animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Step 3 • Doorstep Verification
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900">
                      Collector Weighs & Completes Pickup
                    </h3>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                      On drive day, authorized collectors view the full society pickup manifest. They arrive with certified scales, record the exact collected weight, and update the status to Completed.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Streamlined society manifest with flat-by-flat checklist.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Exact weight entry updates resident & society stats in real-time.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Certified channel handover guaranteeing zero illegal dumping.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="w-full md:w-80 rounded-2xl bg-teal-950 p-5 text-white shadow-md">
                    <p className="text-xs text-teal-300 font-mono">STATUS: COMPLETED</p>
                    <p className="mt-2 text-base font-bold">Verified Weigh-in</p>
                    <p className="text-xs text-teal-200 mt-1">Actual Scale Weight: 21.4 kg</p>
                    <div className="mt-4 pt-3 border-t border-teal-800/80 flex justify-between text-xs">
                      <span>Collector: FastRecycle Pro</span>
                      <span className="text-emerald-300">✓ Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* -------------------- ACCEPTED MATERIAL STREAMS -------------------- */}
      <section id="materials" className="py-16 md:py-24 bg-white border-y border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Categorized Recycling
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Supported Recyclable Streams
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              WasteSlot supports comprehensive sorting across 6 primary recyclable categories to ensure high-grade recovery.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* E-Waste */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-800 group-hover:scale-110">
                ⚡
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">E-Waste</h3>
              <p className="mt-1 text-xs text-slate-500">Laptops, cables, batteries, PCBs</p>
            </div>

            {/* Plastic */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl text-teal-800 group-hover:scale-110">
                🧴
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Plastic</h3>
              <p className="mt-1 text-xs text-slate-500">PET bottles, HDPE containers</p>
            </div>

            {/* Paper */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl text-amber-800 group-hover:scale-110">
                📰
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Paper</h3>
              <p className="mt-1 text-xs text-slate-500">Newspapers, office paper, books</p>
            </div>

            {/* Cardboard */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl text-orange-800 group-hover:scale-110">
                📦
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Cardboard</h3>
              <p className="mt-1 text-xs text-slate-500">Shipping cartons, boxes</p>
            </div>

            {/* Metal */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-2xl text-slate-800 group-hover:scale-110">
                🥫
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Metal</h3>
              <p className="mt-1 text-xs text-slate-500">Aluminum cans, copper, brass</p>
            </div>

            {/* Glass */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-center transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-2xl text-cyan-800 group-hover:scale-110">
                🍶
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Glass</h3>
              <p className="mt-1 text-xs text-slate-500">Bottles, jars, sorted glass</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- KEY PLATFORM FEATURES -------------------- */}
      <section id="features" className="py-16 md:py-24 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Modern Architecture
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Engineered for Real-World Societies
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              Built with lightweight, responsive technology designed for high usability on any device.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:shadow-lg hover:border-emerald-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">Verified Scale Accuracy</h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                No guessing or inflated claims. Collectors weigh pickups at the doorstep, logging verified kilograms that update society records instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:shadow-lg hover:border-emerald-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">Real-Time Carbon Impact</h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Centralized environmental impact algorithms convert pledged & collected weights directly into CO₂ emission offsets and landfill diversion metric.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition hover:shadow-lg hover:border-emerald-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">Mobile-First UI</h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Designed for swift thumb access on smartphones (360px to 430px) as well as spacious desktop dashboards for society committee members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- ENVIRONMENTAL IMPACT CALCULATOR PREVIEW -------------------- */}
      <section id="impact" className="py-16 md:py-24 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 text-white relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Interactive Impact Estimator
            </span>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Calculate Your Household Eco-Contribution
            </h2>
            <p className="mt-4 text-base sm:text-lg text-emerald-100/80">
              See the direct environmental savings generated when your household participates in a WasteSlot society drive.
            </p>
          </div>

          <div className="mt-12 max-w-3xl mx-auto rounded-3xl border border-emerald-500/20 bg-emerald-900/40 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
            {/* Slider Control */}
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="weight-slider" className="text-sm font-semibold text-emerald-200">
                  Recyclables & E-Waste Pledged (kg):
                </label>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {pledgeWeight} kg
                </span>
              </div>
              <input
                id="weight-slider"
                type="range"
                min="2"
                max="100"
                value={pledgeWeight}
                onChange={(e) => setPledgeWeight(Number(e.target.value))}
                className="mt-4 w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="mt-2 flex justify-between text-[11px] text-emerald-400/60 font-mono">
                <span>2 kg (Small scrap)</span>
                <span>50 kg (Standard clean-up)</span>
                <span>100 kg (Society champion)</span>
              </div>
            </div>

            {/* Result Cards */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-emerald-950/80 border border-emerald-700/40 p-5 text-center">
                <div className="text-3xl font-black text-emerald-400">{co2Saved} kg</div>
                <p className="mt-1 text-xs font-medium text-emerald-200">CO₂ Emissions Prevented</p>
              </div>
              <div className="rounded-2xl bg-emerald-950/80 border border-emerald-700/40 p-5 text-center">
                <div className="text-3xl font-black text-teal-300">{waterSaved} L</div>
                <p className="mt-1 text-xs font-medium text-emerald-200">Freshwater Conserved</p>
              </div>
              <div className="rounded-2xl bg-emerald-950/80 border border-emerald-700/40 p-5 text-center">
                <div className="text-3xl font-black text-mint-300 text-emerald-300">{treesEquivalent}</div>
                <p className="mt-1 text-xs font-medium text-emerald-200">Trees Equivalent Saved</p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-emerald-300/60">
              *Calculated using standardized EPA waste diversion emission coefficients for multi-stream residential recycling.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------- FINAL CALL TO ACTION -------------------- */}
      <section id="campaigns-preview" className="py-16 md:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-800 p-8 sm:p-12 lg:p-16 text-white text-center shadow-xl relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
            <h2 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl max-w-3xl mx-auto">
              Ready to Turn Everyday Waste into Measurable Impact?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-emerald-100 max-w-2xl mx-auto">
              Join Green Valley Residency and leading residential societies in driving organized zero-landfill recycling campaigns today.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="#how-it-works"
                className="rounded-xl bg-white px-8 py-4 text-base font-bold text-emerald-900 shadow-lg transition hover:bg-emerald-50 hover:shadow-xl active:scale-98"
              >
                Explore Coordinated Workflow
              </a>
              <a
                href="#materials"
                className="rounded-xl border border-white/40 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                View Accepted Scrap
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FOOTER -------------------- */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
            {/* Column 1: Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
                  ♻
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  Waste<span className="text-emerald-400">Slot</span>
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400 max-w-sm">
                A responsive recycling and e-waste pickup coordination platform for modern housing societies.
              </p>
              <p className="mt-2 text-xs italic text-emerald-400">
                &ldquo;Turn everyday waste into measurable impact.&rdquo;
              </p>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Platform</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-emerald-400">How It Works</a></li>
                <li><a href="#materials" className="hover:text-emerald-400">Accepted Materials</a></li>
                <li><a href="#problem" className="hover:text-emerald-400">The Problem & Solution</a></li>
                <li><a href="#impact" className="hover:text-emerald-400">Impact Calculator</a></li>
              </ul>
            </div>

            {/* Column 3: Roles */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Users</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><span className="text-slate-400">Resident Portal</span></li>
                <li><span className="text-slate-400">Society Admin</span></li>
                <li><span className="text-slate-400">Certified Collector</span></li>
                <li><span className="text-slate-400">Housing Societies</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} WasteSlot. Built for sustainable residential communities.</p>
            <p className="flex items-center gap-1 text-emerald-400">
              <span>🌱 Zero-Landfill Coordination</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
