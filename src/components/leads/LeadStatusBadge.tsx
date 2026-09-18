"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LeadStatus, LeadPriority } from "@/types/lead";
import { Flame, Clock, CheckCircle2, XCircle, Sparkles, PhoneCall } from "lucide-react";

interface StatusConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIGS: Record<LeadStatus, StatusConfig> = {
  new: {
    label: "New Intake",
    bgClass: "bg-blue-50/80",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
    dotClass: "bg-blue-500",
    icon: Sparkles,
  },
  contacted: {
    label: "Contacted",
    bgClass: "bg-indigo-50/80",
    textClass: "text-indigo-700",
    borderClass: "border-indigo-200",
    dotClass: "bg-indigo-500",
    icon: PhoneCall,
  },
  follow_up: {
    label: "Follow Up",
    bgClass: "bg-amber-50/80",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    dotClass: "bg-amber-500",
    icon: Clock,
  },
  demo: {
    label: "Demo Booked",
    bgClass: "bg-purple-50/80",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    dotClass: "bg-purple-500",
    icon: Sparkles,
  },
  admitted: {
    label: "Admitted",
    bgClass: "bg-emerald-50/80",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    dotClass: "bg-emerald-500",
    icon: CheckCircle2,
  },
  lost: {
    label: "Lost",
    bgClass: "bg-rose-50/80",
    textClass: "text-rose-700",
    borderClass: "border-rose-200",
    dotClass: "bg-rose-500",
    icon: XCircle,
  },
};

export function LeadStatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: LeadStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.new;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs",
        config.bgClass,
        config.textClass,
        config.borderClass,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)} />
      {showIcon && <Icon className="w-3 h-3 shrink-0 opacity-80" />}
      <span>{config.label}</span>
    </span>
  );
}

export function LeadPriorityBadge({
  priority,
  className,
}: {
  priority: LeadPriority;
  className?: string;
}) {
  const isUrgent = priority === "urgent";
  const isHigh = priority === "high";
  const isMedium = priority === "medium";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border",
        isUrgent && "bg-red-50 text-red-700 border-red-200",
        isHigh && "bg-rose-50 text-rose-700 border-rose-200",
        isMedium && "bg-amber-50 text-amber-700 border-amber-200",
        !isUrgent && !isHigh && !isMedium && "bg-slate-50 text-slate-600 border-slate-200",
        className
      )}
    >
      {(isUrgent || isHigh) && <Flame className={cn("w-3 h-3 fill-current", isUrgent ? "text-red-500" : "text-rose-500")} />}
      <span className="capitalize">{priority}</span>
    </span>
  );
}

export function LeadScorePill({
  score,
  className,
}: {
  score?: number;
  className?: string;
}) {
  if (score === undefined || score === null) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const isHigh = score >= 80;
  const isMedium = score >= 50;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center text-xs font-bold px-2 py-0.5 rounded-lg border",
          isHigh && "bg-emerald-50 text-emerald-700 border-emerald-200",
          !isHigh && isMedium && "bg-blue-50 text-blue-700 border-blue-200",
          !isHigh && !isMedium && "bg-amber-50 text-amber-700 border-amber-200"
        )}
      >
        {score}
      </span>
      <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
    </div>
  );
}
