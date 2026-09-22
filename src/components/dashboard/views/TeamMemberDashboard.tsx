"use client";

import React, { useState } from "react";
import { UserCheck, RefreshCw, UserPlus, Clock, Target } from "lucide-react";
import type { DashboardSummaryData } from "@/services/api/dashboardService";
import { KpiCard } from "../KpiCard";
import { PipelineSummary } from "../PipelineSummary";
import { UpcomingFollowUps } from "../UpcomingFollowUps";
import { RecentActivity } from "../RecentActivity";
import { AddNewLeadModal } from "@/components/stitch/AddNewLeadModal";

interface TeamMemberDashboardProps {
  data: DashboardSummaryData;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function TeamMemberDashboard({
  data,
  onRefresh,
  isRefetching = false,
}: TeamMemberDashboardProps) {
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Team Member Greeting Banner */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-fixed text-primary border border-primary/20">
              Counselor Workspace
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              Apex Academy ({data.partnerId || "partner_001"})
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            My Counseling Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Track your assigned leads, execute scheduled student call reminders, and reach your monthly enrollment targets.
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

          <button
            type="button"
            onClick={() => setIsAddLeadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Enquiry</span>
          </button>
        </div>
      </div>

      {/* Counselor KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Assigned Pipeline */}
      <PipelineSummary
        stages={data.pipeline}
        title="My Assigned Lead Pipeline"
        viewAllHref="/leads"
      />

      {/* 2-Column Split: Assigned Follow-ups & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <UpcomingFollowUps
            followUps={data.upcomingFollowUps}
            title="My Priority Follow-ups Today"
            viewAllHref="/follow-ups"
          />
        </div>

        <div className="space-y-6">
          <RecentActivity
            activities={data.recentActivity}
            title="My Recent Call & Intake Logs"
          />
        </div>
      </div>

      {/* Add Lead Modal */}
      <AddNewLeadModal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
      />
    </div>
  );
}
