"use client";

import React from "react";
import Link from "next/link";
import { Clock, Phone, Mail, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import type { UpcomingFollowUpItem } from "@/services/api/dashboardService";

interface UpcomingFollowUpsProps {
  followUps: UpcomingFollowUpItem[];
  title?: string;
  viewAllHref?: string;
}

export function UpcomingFollowUps({
  followUps,
  title = "Today's Follow Ups",
  viewAllHref = "/follow-ups",
}: UpcomingFollowUpsProps) {
  const addToast = useUIStore((state) => state.addToast);

  const handleCall = (item: UpcomingFollowUpItem) => {
    addToast({
      type: "info",
      title: `Call Initiated: ${item.studentName}`,
      message: `Connecting to ${item.phone} via telephony integration.`,
    });
  };

  const handleEmail = (item: UpcomingFollowUpItem) => {
    addToast({
      type: "info",
      title: `Email Composer: ${item.studentName}`,
      message: `Drafting course details email to ${item.email}.`,
    });
  };

  if (!followUps || followUps.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-outline-variant shadow-card text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-on-surface">All Follow-ups Completed</h4>
          <p className="text-xs text-on-surface-variant">Great job! No pending reminders remain on your queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-outline-variant shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-on-surface tracking-tight">{title}</h3>
          <p className="text-xs text-on-surface-variant">
            {followUps.length} scheduled reminders requiring contact today
          </p>
        </div>

        <Link
          href={viewAllHref}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Follow-up Items List */}
      <div className="space-y-2.5">
        {followUps.map((item) => {
          const isUrgent = item.priority === "urgent";
          const isHigh = item.priority === "high";

          // Initials for avatar
          const initials = item.studentName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isUrgent
                  ? "bg-rose-50/40 border-rose-200"
                  : isHigh
                  ? "bg-amber-50/30 border-amber-200"
                  : "bg-surface-container-low border-outline-variant"
              }`}
            >
              {/* Student info */}
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isUrgent
                      ? "bg-rose-100 text-rose-800"
                      : isHigh
                      ? "bg-amber-100 text-amber-800"
                      : "bg-primary-fixed text-primary"
                  }`}
                >
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface truncate">
                      {item.studentName}
                    </span>
                    {isUrgent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 uppercase">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                    <span className="font-semibold text-primary flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.scheduledTime}
                    </span>
                    <span>•</span>
                    <span className="truncate">{item.courseInterest}</span>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-1">
                      &quot;{item.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Communication Actions */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleCall(item)}
                  title={`Call ${item.studentName} at ${item.phone}`}
                  aria-label={`Call ${item.studentName}`}
                  className="p-2 rounded-xl bg-white border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-xs"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleEmail(item)}
                  title={`Email ${item.studentName} at ${item.email}`}
                  aria-label={`Email ${item.studentName}`}
                  className="p-2 rounded-xl bg-white border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-xs"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
