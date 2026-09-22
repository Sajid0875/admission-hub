"use client";

import React from "react";
import Link from "next/link";
import { Globe, Building2, RefreshCw, ArrowRight } from "lucide-react";
import type { DashboardSummaryData } from "@/services/api/dashboardService";
import { KpiCard } from "../KpiCard";
import { PipelineSummary } from "../PipelineSummary";
import { UpcomingFollowUps } from "../UpcomingFollowUps";
import { RecentActivity } from "../RecentActivity";
import { CommissionSummary } from "../CommissionSummary";

interface SuperAdminDashboardProps {
  data: DashboardSummaryData;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function SuperAdminDashboard({
  data,
  onRefresh,
  isRefetching = false,
}: SuperAdminDashboardProps) {
  // Prefer live KPI; never hardcode marketing fixture counts on the SA banner.
  const activePartnersKpi = data.kpis.find((k) => k.id === "active_partners");
  const activePartnersLabel = activePartnersKpi
    ? `${activePartnersKpi.value} Active Partners`
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Super Admin Global Banner */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-primary border border-primary/20 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>Global Multi-Tenant Platform</span>
            </span>
            {activePartnersLabel && (
              <span className="text-xs text-on-surface-variant font-medium">{activePartnersLabel}</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Super Admin Platform Overview
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Aggregate command center for ecosystem tenant health, platform lead velocity, network admissions, and pending partner payout authorizations.
          </p>
        </div>

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

          <Link
            href="/partners"
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5"
          >
            <Building2 className="w-4 h-4" />
            <span>Manage Partners</span>
          </Link>
        </div>
      </div>

      {/* Global KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Global Network Pipeline */}
      <PipelineSummary
        stages={data.pipeline}
        title="Network Pipeline Overview"
        viewAllHref="/leads"
      />

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Global Partner Reminders & Activity */}
        <div className="space-y-6">
          <UpcomingFollowUps
            followUps={data.upcomingFollowUps}
            title="Critical Tenant Reminders"
            viewAllHref="/audit"
          />

          <RecentActivity
            activities={data.recentActivity}
            title="Global Platform Event Stream"
          />
        </div>

        {/* Right: Global Payout Approvals & Commission Overview */}
        <div className="space-y-6">
          {data.commission && (
            <CommissionSummary
              commission={data.commission}
              isSuperAdminView={true}
              viewDetailsHref="/commissions"
            />
          )}

          {/* Partner directory shortcut — live partner rows live on /partners */}
          <div className="bg-white rounded-3xl p-6 border border-outline-variant shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-on-surface">Partner Directory</h3>
              </div>
              <Link href="/partners" className="text-xs font-semibold text-primary hover:underline">
                View All Partners
              </Link>
            </div>
            <p className="text-xs text-on-surface-variant">
              {activePartnersLabel
                ? `${activePartnersLabel} on the platform. Open the directory to approve, suspend, or review commission terms.`
                : "Open the partner directory to manage tenant onboarding and commission agreements."}
            </p>
            <Link
              href="/partners"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Open Partner Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
