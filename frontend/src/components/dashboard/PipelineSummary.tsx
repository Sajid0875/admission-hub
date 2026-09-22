"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight, UserCheck, Flame } from "lucide-react";
import type { PipelineStageSummary, PipelineLeadPreview } from "@/services/api/dashboardService";

interface PipelineSummaryProps {
  stages: PipelineStageSummary[];
  onSelectLead?: (leadId: string) => void;
  title?: string;
  viewAllHref?: string;
}

export function PipelineSummary({
  stages,
  onSelectLead,
  title = "Pipeline Overview",
  viewAllHref = "/leads",
}: PipelineSummaryProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-outline-variant text-center space-y-2">
        <p className="text-sm font-semibold text-on-surface">No active pipeline stages</p>
        <p className="text-xs text-on-surface-variant">Leads will populate here as inquiries are received.</p>
      </div>
    );
  }

  const getPriorityBadge = (priority?: PipelineLeadPreview["priority"]) => {
    switch (priority) {
      case "urgent":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Urgent</span>;
      case "high":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Hot</span>;
      case "medium":
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-outline-variant shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-on-surface tracking-tight">{title}</h3>
          <p className="text-xs text-on-surface-variant">
            Documented conversion flow: New ➔ Contacted ➔ Follow Up ➔ Demo ➔ Admitted
          </p>
        </div>

        <Link
          href={viewAllHref}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>View All Leads</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Horizontal Pipeline Stages */}
      <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
        {stages.map((stage) => {
          return (
            <div
              key={stage.stage}
              className="flex-shrink-0 w-60 sm:w-64 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant flex flex-col justify-between"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.colorClass}`} />
                  <span className="text-xs font-bold text-on-surface">{stage.label}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white border border-outline-variant/60 text-slate-700">
                  {stage.count}
                </span>
              </div>

              {/* Stage Lead Cards */}
              <div className="space-y-2 flex-1">
                {stage.leads.length > 0 ? (
                  stage.leads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead?.(lead.id)}
                      className="bg-white p-3 rounded-xl border border-outline-variant/80 hover:border-primary/50 transition-all cursor-pointer shadow-xs hover:shadow-soft space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-on-surface truncate">{lead.name}</span>
                        {getPriorityBadge(lead.priority)}
                      </div>

                      {lead.course && (
                        <p className="text-[11px] text-on-surface-variant truncate font-medium">
                          {lead.course}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span>{lead.timeAgo}</span>
                        <span className="font-mono text-[9px]">ID: {lead.id}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center border border-dashed border-outline-variant/70 rounded-xl">
                    <span className="text-[11px] text-slate-400 font-medium">No leads currently in this stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
