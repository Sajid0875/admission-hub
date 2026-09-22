"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Menu,
  Bell,
  Search,
  Shield,
  Building2,
  LogOut,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { UserRole } from "@/types/auth";
import { MOCK_ROLE_PROFILES, authService } from "@/services/api/authService";
import { notificationService } from "@/services/api/adminService";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  pageTitle?: string;
}

export function Header({
  onToggleMobileMenu,
  isMobileMenuOpen,
  pageTitle,
}: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const addToast = useUIStore((state) => state.addToast);

  // Live unread badge — polls while authenticated; drawer invalidates this key on mark-read.
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
        setIsRoleSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    void authService.logout().finally(() => {
      logout();
      addToast({
        type: "info",
        title: "Signed Out",
        message: "You have been signed out of the partner portal.",
      });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    });
  };

  // Quick switch role for testing / demoing different portal perspectives
  const handleSwitchRolePreset = (role: UserRole) => {
    const profile = MOCK_ROLE_PROFILES[role];
    const newUser = {
      ...profile,
      email: `${role}@whitedavid23.com`,
      lastLogin: new Date().toISOString(),
    };
    setAuth(newUser, `jwt_mock_${role}_${Date.now()}`);
    setIsRoleSwitcherOpen(false);
    setIsProfileOpen(false);
    addToast({
      type: "success",
      title: "Switched Role Perspective",
      message: `Now operating as ${role.replace("_", " ").toUpperCase()}`,
    });
  };

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-outline-variant z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-soft">
      {/* Left: Mobile Toggle & Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-on-surface capitalize">
            {pageTitle || "Dashboard"}
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-medium">
            <span>WhiteDavid23</span>
            <span>•</span>
            {user?.role === "super_admin" ? (
              <span className="font-semibold text-primary">Global Scope</span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Building2 className="w-3 h-3 text-primary" />
                Apex Academy ({user?.partnerId || "partner_001"})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions, Badges & Profile */}
      <div className="flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
        {/* Search trigger */}
        <button
          onClick={() => {
            addToast({
              type: "info",
              title: "Global Search",
              message: "Search leads, admissions, courses, and commission records.",
            });
          }}
          className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label="Global search"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Notifications trigger — badge only when unreadCount > 0 */}
        <button
          onClick={() => setIsNotificationOpen(true)}
          className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors relative"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[0.5rem] h-2 px-0.5 rounded-full bg-rose-500 ring-2 ring-white flex items-center justify-center">
              {unreadCount > 9 ? (
                <span className="sr-only">{unreadCount} unread</span>
              ) : null}
            </span>
          )}
        </button>

        {/* Role Badge Indicator */}
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-fixed text-primary border border-primary/20 select-none">
            <Shield className="w-3.5 h-3.5" />
            <span className="uppercase">{user.role.replace("_", " ")}</span>
          </div>
        )}

        {/* User Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-container-low transition-colors border border-transparent hover:border-outline-variant"
            aria-label="User profile menu"
            aria-expanded={isProfileOpen}
          >
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-outline-variant rounded-2xl shadow-elevated p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
              {/* User info banner */}
              <div className="p-3 border-b border-outline-variant/60">
                <p className="text-xs font-bold text-on-surface truncate">{user?.name}</p>
                <p className="text-[11px] text-on-surface-variant truncate">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-primary-fixed text-primary">
                    {user?.role.replace("_", " ")}
                  </span>
                  {user?.partnerId && (
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {user.partnerId}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Role Tester for QA / Verification */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => setIsRoleSwitcherOpen(!isRoleSwitcherOpen)}
                  className="w-full px-3 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-xl flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>Switch Role Preview</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isRoleSwitcherOpen ? "rotate-180" : ""}`} />
                </button>

                {isRoleSwitcherOpen && (
                  <div className="mt-1 pl-2 space-y-1 bg-surface-container-low/70 p-1.5 rounded-xl">
                    {(["super_admin", "partner_admin", "team_member", "support"] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleSwitchRolePreset(r)}
                        className={`w-full px-2.5 py-1.5 text-[11px] font-semibold rounded-lg flex items-center justify-between transition-colors ${
                          user?.role === r ? "bg-primary text-white" : "text-slate-700 hover:bg-white"
                        }`}
                      >
                        <span className="capitalize">{r.replace("_", " ")}</span>
                        {user?.role === r && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sign Out Action */}
              <div className="border-t border-outline-variant/60 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Notification Center */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </header>
  );
}
