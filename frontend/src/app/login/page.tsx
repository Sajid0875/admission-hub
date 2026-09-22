"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2, Info } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { authService } from "@/services/api/authService";
import type { UserRole } from "@/types/auth";
import type { NormalizedError } from "@/types/api";

const PRESET_ACCOUNTS: { role: UserRole; label: string; email: string; password: string; desc: string }[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    email: "admin@whitedavid23.local",
    password: "ChangeMe!Adm1n2026",
    desc: "prisma seed — stable credentials",
  },
  {
    role: "partner_admin",
    label: "Partner Admin",
    email: "partner@whitedavid23.com",
    password: "ChangeMe!Partner2026",
    desc: "prisma seed — stable credentials",
  },
  {
    role: "counselor",
    label: "Counselor",
    email: "counselor@whitedavid23.com",
    password: "ChangeMe!Counselor2026",
    desc: "prisma seed — stable credentials",
  },
  {
    role: "support",
    label: "Support",
    email: "support@whitedavid23.com",
    password: "ChangeMe!Support2026",
    desc: "prisma seed — stable credentials",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  const [email, setEmail] = useState("admin@whitedavid23.local");
  const [password, setPassword] = useState("ChangeMe!Adm1n2026");
  const [selectedRole, setSelectedRole] = useState<UserRole>("super_admin");
  const [isLoading, setIsLoading] = useState(false);

  // Client validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const setAuth = useAuthStore((state) => state.setAuth);
  const addToast = useUIStore((state) => state.addToast);

  // Redirect if already logged in
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace(returnUrl);
    }
  }, [isInitialized, isAuthenticated, router, returnUrl]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectPreset = (preset: typeof PRESET_ACCOUNTS[number]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setSelectedRole(preset.role);
    setErrors({});
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await authService.login({
        email: email.trim(),
        password,
      });

      setAuth(res.user, res.token, res.refreshToken);

      addToast({
        type: "success",
        title: "Signed In Successfully",
        message: `Welcome back, ${res.user.name}. Authenticated as ${res.user.role.replace("_", " ").toUpperCase()}.`,
      });

      router.push(returnUrl);
    } catch (err: unknown) {
      const normalized = err as NormalizedError;
      setErrors((prev) => ({
        ...prev,
        general: normalized.message || "Failed to sign in. Please verify your credentials.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white font-black text-xl shadow-md shadow-primary/25 mb-1">
            WD
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Kinetic CRM</h1>
          <p className="text-xs font-bold text-primary uppercase tracking-widest">
            WhiteDavid23 Partner Portal
          </p>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
            Role-governed admission pipeline, lead conversion & partner settlement platform.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-outline-variant rounded-3xl shadow-elevated space-y-6">
          {/* General Backend Error Alert */}
          {errors.general && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
              <div className="flex-1">
                <span className="font-bold block">Authentication Failed</span>
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          {/* Quick Role Preset Picker for Review & Testing */}
          <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/70 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-on-surface-variant">
                Quick Role Preset
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Phase 2 Verification</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_ACCOUNTS.map((preset) => (
                <button
                  type="button"
                  key={preset.role}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-xl text-left border text-xs transition-all ${
                    selectedRole === preset.role
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-white border-outline-variant text-on-surface hover:bg-slate-50"
                  }`}
                >
                  <span className="font-bold block text-[11px] truncate">{preset.label}</span>
                  <span
                    className={`text-[9px] block truncate mt-0.5 ${
                      selectedRole === preset.role ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {preset.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email-input"
                className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  aria-hidden="true"
                />
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  placeholder="name@company.com"
                  className={`w-full h-11 pl-10 pr-3.5 bg-surface-container-low border rounded-xl text-sm text-on-surface focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                      : "border-outline-variant focus:border-primary focus:ring-primary/20"
                  }`}
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-rose-600 font-semibold">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password-input"
                  className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider"
                >
                  Password
                </label>
                  <span className="text-[11px] text-slate-500 font-medium">Use Quick Role Preset</span>
              </div>
              <div className="relative">
                <Lock
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  aria-hidden="true"
                />
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`w-full h-11 pl-10 pr-3.5 bg-surface-container-low border rounded-xl text-sm text-on-surface font-mono focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                      : "border-outline-variant focus:border-primary focus:ring-primary/20"
                  }`}
                />
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-rose-600 font-semibold">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {selectedRole.replace("_", " ")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Contract Notice Footer */}
          <div className="pt-2 border-t border-outline-variant/60 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Connected to live API at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-base shadow-soft animate-pulse">
              WD
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading portal sign in...</span>
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}

