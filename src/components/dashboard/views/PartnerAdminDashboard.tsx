"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building2, UserPlus, RefreshCw, Shield, Sparkles } from "lucide-react";
import type { DashboardSummaryData } from "@/services/api/dashboardService";
import { KpiCard } from "../KpiCard";
import { PipelineSummary } from "../PipelineSummary";
import { UpcomingFollowUps } from "../UpcomingFollowUps";
import { RecentActivity } from "../RecentActivity";
import { CommissionSummary } from "../CommissionSummary";
import { AddNewLeadModal } from "@/components/stitch/AddNewLeadModal";

interface PartnerAdminDashboardProps {
  data: DashboardSummaryData;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function PartnerAdminDashboard({
  data,
  onRefresh,
  isRefetching = false,
}: PartnerAdminDashboardProps) {
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Partner Tenant Greeting Banner */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-primary border border-primary/20">
              Partner Workspace
            </span>
            <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              {data.partnerName || "Apex Academy"} ({data.partnerId || "partner_001"})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Partner Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Live overview of candidate enquiries, admissions conversion funnel, counselor reminders, and earned partner commissions.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefetching}
              title="Refresh live metrics"
              aria-label="Refresh live metrics"
              className="p-2.5 rounded-xl border border-outline-variant bg-white text-on-surface-variant hover:text-on-surface hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddLeadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Lead Conversion Pipeline */}
      <PipelineSummary stages={data.pipeline} viewAllHref="/leads" />

      {/* 2-Column Split: Follow-ups & Activity/Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Priority Follow-ups */}
        <div className="space-y-6">
          <UpcomingFollowUps followUps={data.upcomingFollowUps} viewAllHref="/follow-ups" />
        </div>

        {/* Right: Commission Ledger Summary & Recent Activity */}
        <div className="space-y-6">
          {data.commission && (
            <CommissionSummary commission={data.commission} viewDetailsHref="/commissions" />
          )}

          <RecentActivity activities={data.recentActivity} />
        </div>
      </div>

      {/* Modal for adding lead */}
      <AddNewLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
      />
    </div>
  );
}
