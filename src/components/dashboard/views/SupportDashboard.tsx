"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, ShieldCheck, RefreshCw, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import type { DashboardSummaryData } from "@/services/api/dashboardService";
import { KpiCard } from "../KpiCard";
import { UpcomingFollowUps } from "../UpcomingFollowUps";
import { RecentActivity } from "../RecentActivity";

interface SupportDashboardProps {
  data: DashboardSummaryData;
  onRefresh?: () => void;
  isRefetching?: boolean;
}

export function SupportDashboard({
  data,
  onRefresh,
  isRefetching = false,
}: SupportDashboardProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Support Banner */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 sm:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              <span>Operational Support Desk</span>
            </span>
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              System Healthy
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Support Operations & Verification
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Neutral operational console for document validation queues, student enrollment verification, and partner dispute assistance.
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
            href="/support"
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Support Queue</span>
          </Link>
        </div>
      </div>

      {/* Support Operational KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <UpcomingFollowUps
            followUps={data.upcomingFollowUps}
            title="Pending Verification Queue"
            viewAllHref="/support"
          />
        </div>

        <div className="space-y-6">
          <RecentActivity
            activities={data.recentActivity}
            title="Operational Verification Log"
          />

          {/* Quick System Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-outline-variant shadow-card space-y-3">
            <h3 className="text-base font-bold text-on-surface">Service Health Check</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl">
                <span className="font-semibold text-slate-700">API Gateway & Auth Middleware</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl">
                <span className="font-semibold text-slate-700">Redis Cache & Rate Limiting</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-xl">
                <span className="font-semibold text-slate-700">Tenant Isolation Scoping</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Enforced
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
