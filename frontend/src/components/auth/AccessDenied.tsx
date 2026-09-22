"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/Button";

export interface AccessDeniedProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  requiredPermission?: string;
}

export function AccessDenied({
  title = "Access Restricted",
  message = "You do not have the required permissions or role clearance to access this module.",
  requiredRole,
  requiredPermission,
}: AccessDeniedProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-white border border-outline-variant rounded-3xl p-8 shadow-card space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-soft">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
            <Lock className="w-3 h-3" />
            <span>403 Forbidden</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">{title}</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        </div>

        {user && (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-xs text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant font-medium">Your Active Role:</span>
              <span className="font-bold text-primary capitalize">{user.role.replace("_", " ")}</span>
            </div>
            {user.partnerId && (
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-medium">Tenant ID:</span>
                <span className="font-mono text-on-surface font-semibold">{user.partnerId}</span>
              </div>
            )}
            {requiredRole && (
              <div className="flex items-center justify-between border-t border-outline-variant pt-1.5">
                <span className="text-on-surface-variant font-medium">Required Role:</span>
                <span className="font-semibold text-rose-600">{requiredRole}</span>
              </div>
            )}
            {requiredPermission && (
              <div className="flex items-center justify-between border-t border-outline-variant pt-1.5">
                <span className="text-on-surface-variant font-medium">Required Permission:</span>
                <span className="font-mono text-rose-600">{requiredPermission}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
