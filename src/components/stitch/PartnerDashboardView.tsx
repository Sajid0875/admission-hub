"use client";

import React from "react";
import { ArrowUp, AlertTriangle, CheckCircle, Phone, Mail, Plus } from "lucide-react";

interface PartnerDashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenAddLead: () => void;
  onSelectLead: (leadId: string) => void;
}

export function PartnerDashboardView({ onNavigate, onOpenAddLead, onSelectLead }: PartnerDashboardViewProps) {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* KPI Scroll Cards */}
      <section className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {/* Total Leads */}
        <div className="flex-shrink-0 flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-soft">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Leads</span>
          <span className="text-2xl font-bold text-on-surface">1,248</span>
          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>12%</span>
          </div>
        </div>

        {/* New Leads */}
        <div className="flex-shrink-0 flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-soft">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">New Leads</span>
          <span className="text-2xl font-bold text-on-surface">42</span>
          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <ArrowUp className="w-3.5 h-3.5" />
            <span>5%</span>
          </div>
        </div>

        {/* Follow Ups Due */}
        <div className="flex-shrink-0 flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-soft">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Follow Ups Due</span>
          <span className="text-2xl font-bold text-error">18</span>
          <div className="flex items-center gap-1 text-error text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>High Priority</span>
          </div>
        </div>

        {/* Admissions */}
        <div className="flex-shrink-0 flex-1 min-w-[140px] bg-white p-4 rounded-xl border border-outline-variant flex flex-col gap-1 shadow-soft">
          <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Admissions</span>
          <span className="text-2xl font-bold text-on-surface">120</span>
          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>This Month</span>
          </div>
        </div>
      </section>

      {/* Pipeline Overview */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-on-surface">Pipeline Overview</h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {/* Stage: New */}
          <div className="flex-shrink-0 w-52 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-on-surface">New</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">42</span>
            </div>
            <div className="flex flex-col gap-2">
              <div
                onClick={() => onSelectLead("lead_1")}
                className="bg-white p-3 rounded-lg border border-outline-variant hover:border-primary/40 cursor-pointer transition-all shadow-sm"
              >
                <div className="text-sm font-medium text-on-surface">Zainab R.</div>
                <div className="text-xs text-on-surface-variant">Just now</div>
              </div>
              <div
                onClick={() => onSelectLead("lead_2")}
                className="bg-white p-3 rounded-lg border border-outline-variant hover:border-primary/40 cursor-pointer transition-all shadow-sm"
              >
                <div className="text-sm font-medium text-on-surface">Omar F.</div>
                <div className="text-xs text-on-surface-variant">2h ago</div>
              </div>
            </div>
          </div>

          {/* Stage: Contacted */}
          <div className="flex-shrink-0 w-52 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-on-surface">Contacted</span>
              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-semibold">28</span>
            </div>
            <div className="flex flex-col gap-2">
              <div
                onClick={() => onSelectLead("lead_3")}
                className="bg-white p-3 rounded-lg border border-outline-variant hover:border-primary/40 cursor-pointer transition-all shadow-sm"
              >
                <div className="text-sm font-medium text-on-surface">Fatima M.</div>
                <div className="text-xs text-on-surface-variant">Yesterday</div>
              </div>
            </div>
          </div>

          {/* Stage: Follow Up */}
          <div className="flex-shrink-0 w-52 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-on-surface">Follow Up</span>
              <span className="bg-error/10 text-error px-2 py-0.5 rounded-full text-xs font-semibold">18</span>
            </div>
            <div className="flex flex-col gap-2">
              <div
                onClick={() => onSelectLead("lead_4")}
                className="bg-white p-3 rounded-lg border border-outline-variant border-l-4 border-l-error hover:border-primary/40 cursor-pointer transition-all shadow-sm"
              >
                <div className="text-sm font-medium text-on-surface">Ali Khan</div>
                <div className="text-xs text-error font-medium">Today 2:00 PM</div>
              </div>
            </div>
          </div>

          {/* Stage: Admitted */}
          <div className="flex-shrink-0 w-52 bg-surface-container-low p-3 rounded-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-on-surface">Admitted</span>
              <span className="bg-emerald-600/10 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold">120</span>
            </div>
            <div className="flex flex-col gap-2">
              <div
                onClick={() => onSelectLead("lead_5")}
                className="bg-white p-3 rounded-lg border border-outline-variant border-l-4 border-l-emerald-500 hover:border-primary/40 cursor-pointer transition-all shadow-sm"
              >
                <div className="text-sm font-medium text-on-surface">Hassan T.</div>
                <div className="text-xs text-emerald-600 font-medium">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Follow Ups */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-on-surface">Today&apos;s Follow Ups</h2>
          <button
            onClick={() => onNavigate("follow_ups")}
            className="text-primary text-sm font-semibold hover:underline"
          >
            View All
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {/* Item 1 */}
          <div className="bg-white p-4 rounded-xl border border-outline-variant flex items-center justify-between shadow-soft hover:shadow-md transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm">
                AK
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-on-surface">Ali Khan</span>
                <span className="text-xs text-error font-medium">2:00 PM · High Priority</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="tel:+15551234567"
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                title="Call student"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="mailto:ali@example.com"
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                title="Email student"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Item 2 */}
          <div className="bg-white p-4 rounded-xl border border-outline-variant flex items-center justify-between shadow-soft hover:shadow-md transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-tertiary-container text-white flex items-center justify-center font-bold text-sm">
                AhK
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-on-surface">Ahmed Khan</span>
                <span className="text-xs text-on-surface-variant">4:00 PM · Schedule demo</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="tel:+15559876543"
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                title="Call student"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="mailto:ahmed@example.com"
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                title="Email student"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Item 3 */}
          <div className="bg-white p-4 rounded-xl border border-outline-variant flex items-center justify-between shadow-soft hover:shadow-md transition-all">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary font-bold flex items-center justify-center text-sm">
                SA
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-on-surface">Sara Ali</span>
                <span className="text-xs text-on-surface-variant">5:30 PM · Fee discussion</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="tel:+15554567890"
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                title="Call student"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="mailto:sara@example.com"
                className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-colors"
                title="Email student"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button for Mobile / Quick Action */}
      <button
        onClick={onOpenAddLead}
        className="fixed bottom-24 right-6 bg-primary text-white w-14 h-14 rounded-full shadow-elevated flex items-center justify-center hover:bg-primary-hover active:scale-95 transition-all z-40"
        aria-label="Add new lead"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
