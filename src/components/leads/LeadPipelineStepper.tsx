"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/lead";
import { Check, Sparkles, PhoneCall, Clock, Presentation, CheckCircle2, XCircle } from "lucide-react";

interface StepConfig {
  status: LeadStatus;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PIPELINE_STEPS: StepConfig[] = [
  {
    status: "new",
    label: "1. New",
    description: "Intake registered",
    icon: Sparkles,
  },
  {
    status: "contacted",
    label: "2. Contacted",
    description: "Outreach initiated",
    icon: PhoneCall,
  },
  {
    status: "follow_up",
    label: "3. Follow Up",
    description: "Counseling in progress",
    icon: Clock,
  },
  {
    status: "demo",
    label: "4. Demo",
    description: "Trial or demo session",
    icon: Presentation,
  },
];

interface LeadPipelineStepperProps {
  currentStatus: LeadStatus;
  onStatusSelect?: (status: LeadStatus) => void;
  canEdit?: boolean;
  isUpdating?: boolean;
}

export function LeadPipelineStepper({
  currentStatus,
  onStatusSelect,
  canEdit = false,
  isUpdating = false,
}: LeadPipelineStepperProps) {
  const isTerminalAdmitted = currentStatus === "admitted";
  const isTerminalLost = currentStatus === "lost";

  // Calculate active step index (0-3 for pipeline stages, or full if admitted)
  const stepIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);
  const activeIndex = isTerminalAdmitted ? 4 : isTerminalLost ? -1 : stepIndex !== -1 ? stepIndex : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Lead Pipeline Progression</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Documented lifecycle from intake ingestion to terminal enrollment or lost outcome.
          </p>
        </div>

        {/* Terminal Outcome Badges */}
        <div className="flex items-center gap-2">
          {canEdit && !isTerminalAdmitted && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusSelect?.("lost")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                isTerminalLost
                  ? "bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-500/20"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Mark Lost</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusSelect?.("admitted")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs",
                isTerminalAdmitted
                  ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/30"
                  : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isTerminalAdmitted ? "Admitted Confirmed" : "Mark Admitted"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Pipeline Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 relative">
        {PIPELINE_STEPS.map((step, idx) => {
          const isCurrent = currentStatus === step.status;
          const isPassed = activeIndex > idx || isTerminalAdmitted;
          const StepIcon = step.icon;

          return (
            <div
              key={step.status}
              onClick={() => {
                if (canEdit && !isUpdating && currentStatus !== step.status) {
                  onStatusSelect?.(step.status);
                }
              }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all relative overflow-hidden",
                canEdit && "cursor-pointer",
                isCurrent &&
                  "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs",
                !isCurrent && isPassed &&
                  "bg-emerald-50/50 border-emerald-200 text-emerald-950",
                !isCurrent && !isPassed &&
                  "bg-slate-50/60 border-slate-200/80 opacity-70",
                canEdit && !isCurrent && "hover:border-blue-300 hover:opacity-100"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all",
                  isCurrent && "bg-blue-600 text-white shadow-xs",
                  !isCurrent && isPassed && "bg-emerald-600 text-white",
                  !isCurrent && !isPassed && "bg-slate-200 text-slate-600"
                )}
              >
                {isPassed && !isCurrent ? <Check className="w-4 h-4 stroke-[3]" /> : <StepIcon className="w-4 h-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "text-xs font-bold truncate",
                      isCurrent && "text-blue-950",
                      !isCurrent && isPassed && "text-emerald-900",
                      !isCurrent && !isPassed && "text-slate-700"
                    )}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal banner display */}
      {(isTerminalAdmitted || isTerminalLost) && (
        <div
          className={cn(
            "mt-4 p-3.5 rounded-xl border flex items-center gap-3 text-xs",
            isTerminalAdmitted
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          )}
        >
          {isTerminalAdmitted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="flex-1">
            <span className="font-bold">
              {isTerminalAdmitted ? "Enrollment Completed" : "Lead Closed (Lost)"}
            </span>
            <p className="mt-0.5 opacity-90">
              {isTerminalAdmitted
                ? "This lead has converted to an active admission record. Commission calculation eligibility is unlocked."
                : "This lead has been marked as lost. You can reactivate by clicking any pipeline stage above if contact resumes."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
