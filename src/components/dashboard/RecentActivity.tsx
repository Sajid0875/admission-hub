"use client";

import React from "react";
import {
  Activity,
  UserPlus,
  PhoneCall,
  Calendar,
  GraduationCap,
  DollarSign,
  Building2,
  type LucideIcon,
} from "lucide-react";
import type { RecentActivityItem } from "@/services/api/dashboardService";

const ACTIVITY_ICON_MAP: Record<RecentActivityItem["type"], { icon: LucideIcon; color: string; bg: string }> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  lead_contacted: { icon: PhoneCall, color: "text-indigo-600", bg: "bg-indigo-50" },
  follow_up_scheduled: { icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
  admission_confirmed: { icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" },
  payout_requested: { icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
  partner_approved: { icon: Building2, color: "text-teal-600", bg: "bg-teal-50" },
};

interface RecentActivityProps {
  activities: RecentActivityItem[];
  title?: string;
}

export function RecentActivity({ activities, title = "Recent Activity" }: RecentActivityProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-outline-variant shadow-card text-center space-y-2">
        <p className="text-sm font-semibold text-on-surface">No recent activity</p>
        <p className="text-xs text-on-surface-variant">Operations and pipeline events will record here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-outline-variant shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-base font-bold text-on-surface tracking-tight">{title}</h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">Live Audit Log</span>
      </div>

      <div className="relative pl-3 border-l-2 border-outline-variant/70 space-y-4 my-2">
        {activities.map((item) => {
          const config = ACTIVITY_ICON_MAP[item.type] || {
            icon: Activity,
            color: "text-primary",
            bg: "bg-primary-fixed",
          };
          const IconComponent = config.icon;

          return (
            <div key={item.id} className="relative group">
              {/* Timeline marker */}
              <div
                className={`absolute -left-[19px] top-1 w-6 h-6 rounded-full ${config.bg} ${config.color} flex items-center justify-center border-2 border-white shadow-xs`}
              >
                <IconComponent className="w-3 h-3" />
              </div>

              {/* Activity content */}
              <div className="pl-4 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-on-surface">{item.title}</span>
                  <span className="text-[10px] text-slate-500 font-medium shrink-0">
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                  <span className="font-semibold text-primary">{item.actor}</span>
                  {item.partnerName && (
                    <>
                      <span>•</span>
                      <span>{item.partnerName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
