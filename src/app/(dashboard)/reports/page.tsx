"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  DollarSign,
  Clock,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { reportService } from "@/services/api/adminService";
import { useAuthStore } from "@/stores/useAuthStore";

export default function ReportsPage() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const partnerId = isSuperAdmin ? undefined : currentUser?.partnerId || undefined;

  const { data: report, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["reports", partnerId],
    queryFn: () => reportService.getReportsData(partnerId),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Analytics & Conversion Reports
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {isSuperAdmin ? "Network Aggregate" : "Partner Workspace"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Data-backed performance analytics, intake velocity, and lead source channel attribution.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
        >
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards (backend numbers only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-emerald-700 mt-2 block">
            {report?.conversionRate || "—"}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Lead to enrolled admission</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-slate-900 mt-2 block">
            {report?.totalInquiries ? report.totalInquiries.toLocaleString() : "—"}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Ingested student records</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admissions Converted</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-purple-700 mt-2 block">
            {report?.totalAdmissions ? report.totalAdmissions.toLocaleString() : "—"}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active fee-paying enrollments</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Deal Velocity</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-amber-700 mt-2 block">
            {report?.averageDealCycleDays ? `${report.averageDealCycleDays} days` : "—"}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Inquiry to admission cycle</span>
        </div>
      </div>

      {/* Charts / Data Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Intake Trends */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Enrollment Velocity</h3>
              <p className="text-xs text-slate-500">Inquiries vs converted admissions by month</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {report?.intakeTrend?.map((m) => (
              <div key={m.month} className="space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>{m.month} 2026</span>
                  <span>{m.admissions} admissions ({m.leads} inquiries)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (m.admissions / m.leads) * 100 * 3)}%` }}
                    title={`Admissions: ${m.admissions}`}
                  />
                  <div
                    className="h-full bg-blue-400 opacity-60"
                    style={{ width: `${Math.min(100, (m.leads / 350) * 100)}%` }}
                    title={`Inquiries: ${m.leads}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Channel Attribution</h3>
            <p className="text-xs text-slate-500">Inquiry origin percentage breakdown</p>
          </div>

          <div className="space-y-3 pt-2">
            {report?.sourceBreakdown?.map((s) => (
              <div key={s.source} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-800">{s.source}</span>
                  <span className="font-bold text-blue-600">{s.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
