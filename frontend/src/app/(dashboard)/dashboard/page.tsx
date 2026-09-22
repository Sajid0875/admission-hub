"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { dashboardService } from "@/services/api/dashboardService";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { PartnerAdminDashboard } from "@/components/dashboard/views/PartnerAdminDashboard";
import { TeamMemberDashboard } from "@/components/dashboard/views/TeamMemberDashboard";
import { SuperAdminDashboard } from "@/components/dashboard/views/SuperAdminDashboard";
import { SupportDashboard } from "@/components/dashboard/views/SupportDashboard";
import { AlertCircle, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dashboard", user?.role, user?.partnerId],
    queryFn: () => dashboardService.getDashboardSummary(user?.role, user?.partnerId),
    enabled: !!user,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  // 1. Loading State
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl p-8 shadow-card text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-on-surface">Unable to Load Dashboard</h3>
            <p className="text-xs text-on-surface-variant">
              {(error as { message?: string })?.message || "A network or server error occurred while retrieving dashboard analytics."}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => refetch()}
            className="gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </Button>
        </div>
      </div>
    );
  }

  // 3. Empty State fallback
  if (!data || data.kpis.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-outline-variant rounded-3xl p-8 shadow-card text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-on-surface-variant mx-auto flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-on-surface">No Dashboard Data Available</h3>
            <p className="text-xs text-on-surface-variant">
              No admissions or leads have been recorded for this role context yet.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            className="gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check for Updates</span>
          </Button>
        </div>
      </div>
    );
  }

  // 4. Role-Aware Dashboard Routing
  switch (user?.role) {
    case "super_admin":
      return (
        <SuperAdminDashboard
          data={data}
          onRefresh={() => refetch()}
          isRefetching={isRefetching}
        />
      );
    case "team_member":
    case "counselor":
      return (
        <TeamMemberDashboard
          data={data}
          onRefresh={() => refetch()}
          isRefetching={isRefetching}
        />
      );
    case "support":
      return (
        <SupportDashboard
          data={data}
          onRefresh={() => refetch()}
          isRefetching={isRefetching}
        />
      );
    case "partner_admin":
    default:
      return (
        <PartnerAdminDashboard
          data={data}
          onRefresh={() => refetch()}
          isRefetching={isRefetching}
        />
      );
  }
}
