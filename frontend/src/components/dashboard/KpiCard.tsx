"use client";

import React from "react";
import {
  Users,
  UserPlus,
  Clock,
  GraduationCap,
  DollarSign,
  Building2,
  CheckCircle,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { KpiMetric } from "@/services/api/dashboardService";

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  "user-plus": UserPlus,
  clock: Clock,
  "graduation-cap": GraduationCap,
  "dollar-sign": DollarSign,
  building: Building2,
  "check-circle": CheckCircle,
  shield: Shield,
};

interface KpiCardProps {
  metric: KpiMetric;
  className?: string;
}

export function KpiCard({ metric, className = "" }: KpiCardProps) {
  const IconComponent = metric.iconName ? ICON_MAP[metric.iconName] || Users : Users;

  const isUrgent = metric.changeType === "urgent";
  const isIncrease = metric.changeType === "increase";
  const isDecrease = metric.changeType === "decrease";

  return (
    <div
      className={`relative bg-white rounded-2xl p-5 border transition-all shadow-card hover:shadow-soft flex flex-col justify-between gap-3 ${
        metric.highlight
          ? "border-amber-300 ring-1 ring-amber-200/50 bg-gradient-to-br from-white to-amber-50/30"
          : "border-outline-variant"
      } ${className}`}
    >
      {/* Top row: Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant truncate">
          {metric.label}
        </span>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isUrgent
              ? "bg-rose-50 text-rose-600 border border-rose-100"
              : metric.highlight
              ? "bg-amber-100/70 text-amber-800 border border-amber-200"
              : "bg-primary-fixed/60 text-primary border border-primary/10"
          }`}
        >
          <IconComponent className="w-4 h-4" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="space-y-1">
        <div
          className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isUrgent ? "text-rose-600" : "text-on-surface"
          }`}
        >
          {metric.value}
        </div>

        {/* Change Indicator / Sub-label */}
        {metric.change && (
          <div className="flex items-center gap-1.5 text-xs">
            {isUrgent ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                <AlertTriangle className="w-3 h-3" />
                {metric.change}
              </span>
            ) : isIncrease ? (
              <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <ArrowUpRight className="w-3 h-3" />
                {metric.change}
              </span>
            ) : isDecrease ? (
              <span className="inline-flex items-center gap-0.5 font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                <ArrowDownRight className="w-3 h-3" />
                {metric.change}
              </span>
            ) : (
              <span className="font-semibold text-slate-600">{metric.change}</span>
            )}

            {metric.trendLabel && (
              <span className="text-on-surface-variant font-medium text-[11px] truncate">
                {metric.trendLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
