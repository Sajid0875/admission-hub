"use client";

import React from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, Calendar, ArrowRight } from "lucide-react";
import type { Lead } from "@/types/lead";
import { LeadStatusBadge, LeadPriorityBadge, LeadScorePill } from "./LeadStatusBadge";

export function LeadCard({ lead }: { lead: Lead }) {
  const leadId = lead._id || lead.id;

  return (
    <Link
      href={`/leads/${leadId}`}
      className="block bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-blue-400/60 hover:shadow-md transition-all active:scale-[0.99] group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {lead.studentName}
            </h3>
            {lead.isDuplicate && (
              <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                Dup
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">
            {lead.courseInterest || "General Inquiry"}
          </p>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <div className="space-y-1.5 text-xs text-slate-600 mb-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-mono">{lead.phone}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.city && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{lead.city}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Priority</span>
            <LeadPriorityBadge priority={lead.priority} className="mt-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Score</span>
            <LeadScorePill score={lead.leadScore} className="mt-0.5" />
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:translate-x-0.5 transition-transform">
          <span>Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
