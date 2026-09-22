"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Building2, Globe, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { authService } from "@/services/api/authService";
import { getAuthorizedNavItems } from "./navigationConfig";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const authorizedItems = getAuthorizedNavItems(user?.role, user?.permissions);

  const handleSignOut = () => {
    void authService.logout().finally(() => {
      logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    });
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-outline-variant flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-outline-variant flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-sm shadow-primary/25 group-hover:scale-105 transition-transform">
            WD
          </div>
          <div>
            <span className="text-sm font-bold text-on-surface tracking-tight block">Kinetic CRM</span>
            <span className="text-[11px] text-on-surface-variant font-medium block -mt-0.5">Partner Portal</span>
          </div>
        </Link>
      </div>

      {/* Tenant Context Indicator - Strict Tenant Scoping */}
      <div className="px-3 pt-3 pb-1">
        {user?.role === "super_admin" ? (
          <div className="bg-primary-fixed/40 border border-primary/20 rounded-xl p-2.5 flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Tenant Scope</span>
              <span className="text-xs font-semibold text-on-surface truncate block">Global Platform</span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-2.5 flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-on-surface-variant shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                  Partner Tenant
                </span>
                <span className="text-[10px] font-mono font-medium text-slate-500">{user?.partnerId || "partner_001"}</span>
              </div>
              <span className="text-xs font-bold text-on-surface truncate block">Apex Academy</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items List */}
      <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/80">
          Navigation
        </div>

        {authorizedItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onCloseMobile}
              className={`w-full px-3 py-2 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-on-surface-variant"}`} />
              <span className="truncate flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-primary-fixed text-primary"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Footer Profile & Sign Out */}
      <div className="p-3 border-t border-outline-variant bg-surface-container-lowest">
        <div className="bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between gap-2 border border-outline-variant/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-on-surface truncate block">
                {user?.name || "Authenticated User"}
              </span>
              <span className="text-[10px] font-semibold text-primary capitalize block">
                {user?.role ? user.role.replace("_", " ") : "Guest"}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign out of portal"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
