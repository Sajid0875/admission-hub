"use client";

import React, { useState } from "react";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { UserRole } from "@/types/auth";

interface LoginViewProps {
  onSuccess: () => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("partner@whitedavid23.com");
  const [password, setPassword] = useState("••••••••");
  const [selectedRole, setSelectedRole] = useState<UserRole>("partner_admin");
  const [isLoading, setIsLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const addToast = useUIStore((state) => state.addToast);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setAuth(
        {
          id: "usr_mock_1",
          name: "David White (Partner Admin)",
          email: email,
          role: selectedRole,
          partnerId: "partner_001",
          permissions:
            selectedRole === "super_admin"
              ? [
                  "partner:approve",
                  "partner:manage",
                  "report:view_all",
                  "audit:view",
                  "commission:approve_payout",
                  "lead:create",
                  "lead:read",
                  "lead:update",
                ]
              : ["lead:create", "lead:read", "lead:update", "commission:view", "commission:request_payout"],
        },
        "mock_jwt_token_sample"
      );

      setIsLoading(false);
      addToast({
        type: "success",
        title: "Signed In Successfully",
        message: `Welcome back to WhiteDavid23 Partner Portal as ${selectedRole.replace("_", " ")}.`,
      });
      onSuccess();
    }, 400);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-outline-variant rounded-3xl p-8 shadow-elevated space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-white font-bold text-xl shadow-md shadow-primary/20 mb-1">
            WD
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Kinetic CRM</h1>
          <h2 className="text-base font-bold text-primary">Partner Portal</h2>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
            Manage leads, admissions, and partner growth from one place.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-11 pl-10 pr-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Password
              </label>
              <a href="#" className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-3.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Quick Role Preset Picker */}
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant space-y-1.5 text-xs">
            <span className="font-semibold text-on-surface-variant block">Sign-in Role Mode:</span>
            <div className="flex flex-wrap gap-1.5">
              {(["partner_admin", "super_admin", "counselor"] as UserRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedRole === r
                      ? "bg-primary text-white"
                      : "bg-white border border-outline-variant text-on-surface-variant hover:bg-slate-50"
                  }`}
                >
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>{isLoading ? "Signing in..." : "Sign In"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
