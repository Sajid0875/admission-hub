"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LogOut, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getAuthorizedNavItems } from "./navigationConfig";

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const authorizedItems = getAuthorizedNavItems(user?.role, user?.permissions);

  // Pick primary 4 items for bottom bar
  const bottomBarItems = authorizedItems.slice(0, 4);

  const handleSignOut = () => {
    onClose();
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Slide-over Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
              WD
            </div>
            <div>
              <span className="text-sm font-bold text-on-surface block">Kinetic CRM</span>
              <span className="text-[11px] text-on-surface-variant font-medium block -mt-0.5">Partner Portal</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Bar */}
        {user && (
          <div className="p-3 bg-surface-container-low border-b border-outline-variant text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-on-surface block truncate">{user.name}</span>
                <span className="text-[10px] text-primary font-semibold uppercase block">
                  {user.role.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 p-3 overflow-y-auto space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Modules
          </div>

          {authorizedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <div className="p-3 border-t border-outline-variant">
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Fixed Mobile Bottom Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-outline-variant flex items-center justify-around py-1.5 px-2 md:hidden shadow-elevated"
      >
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1.5 min-w-[56px] rounded-xl transition-all ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
