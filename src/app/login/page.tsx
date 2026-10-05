"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRole } from "@/types";
import {
  DEMO_USERS,
  DEMO_SOCIETY,
  saveSession,
  getSession,
  getRedirectPathForRole,
} from "@/lib/auth";
import { initializeDatabase } from "@/lib/services/initService";

export default function LoginPage() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<UserRole>("RESIDENT");
  const [email, setEmail] = useState("aarav@greenvalley.res");
  const [password, setPassword] = useState("demo123");
  const [selectedUserId, setSelectedUserId] = useState<string>("user_res_001");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize IndexedDB with demo seed if empty & check session
  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.error("DB init error:", err);
    });

    const existing = getSession();
    if (existing?.user?.role) {
      // Optional: keep user on login page or let them click redirect
    }
  }, []);

  // When role tab changes, update default selected user
  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage("");
    const usersInRole = DEMO_USERS.filter((u) => u.role === role);
    if (usersInRole.length > 0) {
      const first = usersInRole[0];
      setSelectedUserId(first.id);
      setEmail(first.email);
      setPassword(first.passwordHint);
    }
  };

  const handleSelectDemoUser = (user: typeof DEMO_USERS[0]) => {
    setSelectedRole(user.role);
    setSelectedUserId(user.id);
    setEmail(user.email);
    setPassword(user.passwordHint);
    setErrorMessage("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your demo password.");
      return;
    }

    setLoading(true);

    // Find user or create mock profile for selected role
    const matchedUser = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    const activeUser = matchedUser || {
      id: `user_${selectedRole.toLowerCase()}_custom`,
      name: email.split("@")[0].replace(".", " ").toUpperCase(),
      email: email.trim(),
      role: selectedRole,
      societyId: DEMO_SOCIETY.id,
      unitOrFlat: selectedRole === "RESIDENT" ? "Flat C-104" : "Society Coordinator",
      avatar: selectedRole === "ADMIN" ? "🏛️" : selectedRole === "COLLECTOR" ? "🚚" : "👤",
      createdAt: new Date().toISOString(),
      passwordHint: password,
      roleLabel: selectedRole === "ADMIN" ? "Society Admin" : selectedRole === "COLLECTOR" ? "Certified Collector" : "Resident",
      description: "Active local demo session",
    };

    // Save session locally
    saveSession(activeUser, DEMO_SOCIETY);

    // Redirect to proper destination based on role
    const destination = getRedirectPathForRole(activeUser.role);
    router.push(destination);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-50 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Header / Back Link */}
      <div className="mx-auto w-full max-w-lg flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Home</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Local Demo Mode
        </span>
      </div>

      {/* Main Login Card */}
      <div className="mx-auto w-full max-w-lg my-auto">
        <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-8 shadow-xl shadow-emerald-950/5 backdrop-blur-sm">
          {/* Logo & Heading */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white shadow-md shadow-emerald-700/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
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
            <h1 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign in to Waste<span className="text-emerald-600">Slot</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {DEMO_SOCIETY.name} • {DEMO_SOCIETY.city}
            </p>
          </div>

          {/* Role Tabs */}
          <div className="mt-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Demo Role
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleRoleTabChange("RESIDENT")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  selectedRole === "RESIDENT"
                    ? "bg-white text-emerald-800 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👤</span>
                <span>Resident</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleTabChange("ADMIN")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  selectedRole === "ADMIN"
                    ? "bg-white text-emerald-800 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🏛️</span>
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleTabChange("COLLECTOR")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  selectedRole === "COLLECTOR"
                    ? "bg-white text-emerald-800 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🚚</span>
                <span>Collector</span>
              </button>
            </div>
          </div>

          {/* 1-Click Quick Select Demo Accounts */}
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-slate-500 mb-2">
              Instant 1-Click Demo Profiles:
            </p>
            <div className="space-y-1.5">
              {DEMO_USERS.filter((u) => u.role === selectedRole).map((user) => {
                const isSelected = selectedUserId === user.id && email === user.email;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(user)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{user.avatar}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {user.name} <span className="font-normal text-slate-500">({user.unitOrFlat})</span>
                        </p>
                        <p className="text-[10px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      Auto-fill
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@greenvalley.res"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">Demo password prefilled</span>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
            </div>

            {/* Destination Notice */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
              <span>Target Portal:</span>
              <span className="font-bold text-emerald-800">
                {selectedRole === "ADMIN" ? "/admin" : selectedRole === "COLLECTOR" ? "/collector" : "/resident"}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-800/20 transition hover:bg-emerald-800 hover:shadow-lg active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <span>Entering Demo Session...</span>
              ) : (
                <>
                  <span>Enter WasteSlot Demo</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Demo notice pill */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-normal">
              💡 <strong>Demo Application:</strong> All session and role operations remain purely local in your browser. No external database or password verification required.
            </p>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="mx-auto w-full max-w-lg text-center text-xs text-slate-400">
        WasteSlot • Sustainable Housing Society Waste Coordination
      </div>
    </div>
  );
}
