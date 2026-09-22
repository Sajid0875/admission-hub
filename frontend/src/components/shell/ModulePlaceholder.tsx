"use client";

import React from "react";
import { Layers, Shield, Calendar, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserRole, Permission } from "@/types/auth";
import { RoleGate } from "@/components/auth/RoleGate";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AccessDenied } from "@/components/auth/AccessDenied";

interface ModulePlaceholderProps {
  title: string;
  phaseScheduled: string;
  description: string;
  supportedRoles: UserRole[];
  requiredPermission?: Permission;
}

export function ModulePlaceholder({
  title,
  phaseScheduled,
  description,
  supportedRoles,
  requiredPermission,
}: ModulePlaceholderProps) {
  const user = useAuthStore((state) => state.user);

  const content = (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-primary">
              {phaseScheduled}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">Shell Verified</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">{title}</h1>
          <p className="text-sm text-on-surface-variant mt-1 max-w-2xl">{description}</p>
        </div>

        {/* Current user context */}
        {user && (
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 shrink-0 text-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
              Active Context
            </span>
            <div className="font-semibold text-on-surface flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="capitalize">{user.role.replace("_", " ")}</span>
            </div>
            {user.partnerId ? (
              <span className="text-[11px] text-slate-600 block">Apex Academy ({user.partnerId})</span>
            ) : (
              <span className="text-[11px] text-primary font-semibold block">Global Multi-Tenant Scope</span>
            )}
          </div>
        )}
      </div>

      {/* Placeholder Details Card */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-on-surface">Module Architecture & RBAC Ready</h2>
            <p className="text-xs text-on-surface-variant">
              Route navigation, RBAC clearance, and tenant boundaries are verified for this screen.
            </p>
          </div>
        </div>

        {/* Role Matrix */}
        <div className="border border-outline-variant rounded-2xl p-4 bg-surface-container-low space-y-3">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
            Authorized Roles for this Module:
          </span>
          <div className="flex flex-wrap gap-2">
            {supportedRoles.map((role) => (
              <span
                key={role}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-outline-variant text-slate-700 capitalize flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{role.replace("_", " ")}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <Calendar className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">Implementation Scope Notice</span>
            <span>
              Per Phase 2 prompt requirements, business modules are reserved for their respective phases.
              This placeholder confirms that route protection, sidebar navigation, and role authorization operate correctly.
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Wrap with RoleGate and/or PermissionGate to trigger AccessDenied (403) for unauthorized roles
  return (
    <RoleGate
      allowedRoles={supportedRoles}
      fallback={
        <AccessDenied
          title={`Access Denied to ${title}`}
          message={`Your active role does not have authorization to view the ${title} module.`}
          requiredRole={supportedRoles.map((r) => r.replace("_", " ")).join(", ")}
          requiredPermission={requiredPermission}
        />
      }
    >
      {requiredPermission ? (
        <PermissionGate
          permission={requiredPermission}
          fallback={
            <AccessDenied
              title={`Permission Denied to ${title}`}
              message={`Your account lacks the '${requiredPermission}' permission required for this module.`}
              requiredPermission={requiredPermission}
            />
          }
        >
          {content}
        </PermissionGate>
      ) : (
        content
      )}
    </RoleGate>
  );
}
