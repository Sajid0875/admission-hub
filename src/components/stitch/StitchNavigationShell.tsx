"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  DollarSign,
  LogIn,
  Search,
  Bell,
  Menu,
  X,
  Shield,
  Layers,
  LogOut,
} from "lucide-react";
import { PartnerDashboardView } from "./PartnerDashboardView";
import { LeadsListView } from "./LeadsListView";
import { LeadDetailsView } from "./LeadDetailsView";
import { AddNewLeadModal } from "./AddNewLeadModal";
import { AdmissionsView } from "./AdmissionsView";
import { FollowUpsView } from "./FollowUpsView";
import { CommissionsView } from "./CommissionsView";
import { LoginView } from "./LoginView";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";

export type ScreenId = "dashboard" | "leads" | "lead_details" | "admissions" | "follow_ups" | "commissions" | "login";

export function StitchNavigationShell() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("lead_1");
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const addToast = useUIStore((state) => state.addToast);

  const handleSelectLead = (id: string) => {
    setSelectedLeadId(id);
    setActiveScreen("lead_details");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "leads", label: "Leads", icon: Users },
    { id: "admissions", label: "Admissions", icon: GraduationCap },
    { id: "follow_ups", label: "Follow Ups", icon: CalendarCheck },
    { id: "commissions", label: "Commissions", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col antialiased">
      {/* TopAppBar matching Stitch design */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-outline-variant z-40 px-4 sm:px-6 py-3 flex items-center justify-between shadow-soft">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => setActiveScreen("dashboard")}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-primary/20">
              WD
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-on-surface tracking-tight">Kinetic CRM</span>
              <span className="text-[11px] text-on-surface-variant block -mt-0.5">WhiteDavid23 Partner Portal</span>
            </div>
          </div>
        </div>

        {/* Desktop Screen Switcher Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant text-xs font-semibold">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id || (activeScreen === "lead_details" && item.id === "leads");
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id as ScreenId)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-white text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Active Role Tag */}
          {user && (
            <div className="hidden lg:flex items-center gap-1.5 bg-primary-fixed/50 px-2.5 py-1 rounded-lg text-primary text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>{user.role.replace("_", " ").toUpperCase()}</span>
            </div>
          )}

          <button
            onClick={() => {
              addToast({
                type: "info",
                title: "Global Search",
                message: "Search filter triggered across leads, admissions, and courses.",
              });
            }}
            className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              addToast({
                type: "info",
                title: "Notifications",
                message: "You have 3 new lead notifications and 1 payout update.",
              });
            }}
            className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-error absolute top-2 right-2 ring-2 ring-white" />
          </button>

          <button
            onClick={() => {
              if (activeScreen === "login") {
                setActiveScreen("dashboard");
              } else {
                setActiveScreen("login");
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              activeScreen === "login"
                ? "bg-primary text-white border-primary"
                : "border-outline-variant bg-white text-on-surface hover:bg-slate-50"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{activeScreen === "login" ? "App View" : "Login Screen"}</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-outline-variant p-4 space-y-2 animate-in slide-in-from-top duration-200 z-30 shadow-md">
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-2">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id as ScreenId);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors ${
                  isActive ? "bg-primary-fixed text-primary" : "text-on-surface hover:bg-surface-container-low"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Screen Content Body */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 md:pb-12 max-w-7xl w-full mx-auto">
        {activeScreen === "dashboard" && (
          <PartnerDashboardView
            onNavigate={(screen) => setActiveScreen(screen as ScreenId)}
            onOpenAddLead={() => setIsAddLeadModalOpen(true)}
            onSelectLead={handleSelectLead}
          />
        )}

        {activeScreen === "leads" && (
          <LeadsListView
            onSelectLead={handleSelectLead}
            onOpenAddLead={() => setIsAddLeadModalOpen(true)}
          />
        )}

        {activeScreen === "lead_details" && (
          <LeadDetailsView
            leadId={selectedLeadId}
            onBack={() => setActiveScreen("leads")}
            onMarkAdmitted={() => {}}
          />
        )}

        {activeScreen === "admissions" && <AdmissionsView />}

        {activeScreen === "follow_ups" && <FollowUpsView />}

        {activeScreen === "commissions" && <CommissionsView />}

        {activeScreen === "login" && (
          <LoginView onSuccess={() => setActiveScreen("dashboard")} />
        )}
      </main>

      {/* Add New Lead Modal */}
      <AddNewLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar matching Stitch Design */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 py-2 bg-white text-primary border-t border-outline-variant shadow-elevated md:hidden z-40">
        <button
          onClick={() => setActiveScreen("dashboard")}
          className={`flex flex-col items-center justify-center p-1.5 w-16 rounded-xl transition-all ${
            activeScreen === "dashboard"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setActiveScreen("leads")}
          className={`flex flex-col items-center justify-center p-1.5 w-16 rounded-xl transition-all ${
            activeScreen === "leads" || activeScreen === "lead_details"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Leads</span>
        </button>

        <button
          onClick={() => setActiveScreen("admissions")}
          className={`flex flex-col items-center justify-center p-1.5 w-16 rounded-xl transition-all ${
            activeScreen === "admissions"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Admissions</span>
        </button>

        <button
          onClick={() => setActiveScreen("commissions")}
          className={`flex flex-col items-center justify-center p-1.5 w-16 rounded-xl transition-all ${
            activeScreen === "commissions"
              ? "bg-primary text-white shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">Payouts</span>
        </button>
      </nav>
    </div>
  );
}
