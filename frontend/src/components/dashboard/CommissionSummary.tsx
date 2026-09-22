"use client";

import React from "react";
import Link from "next/link";
import { DollarSign, ArrowUpRight, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";
import type { CommissionMetricSummary } from "@/services/api/dashboardService";

interface CommissionSummaryProps {
  commission?: CommissionMetricSummary;
  viewDetailsHref?: string;
  isSuperAdminView?: boolean;
}

export function CommissionSummary({
  commission,
  viewDetailsHref = "/commissions",
  isSuperAdminView = false,
}: CommissionSummaryProps) {
  const addToast = useUIStore((state) => state.addToast);

  if (!commission) return null;

  const handleRequestPayout = () => {
    addToast({
      type: "info",
      title: "Payout Request Initiated",
      message: "Payout request for eligible balance submitted. Awaiting Super Admin authorization.",
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-outline-variant shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface tracking-tight">
              {isSuperAdminView ? "Platform Payout Ledger" : "Commission Ledger"}
            </h3>
            <p className="text-xs text-on-surface-variant">
              {isSuperAdminView
                ? "Global settlement status across all partner academies"
                : "Earned admissions, pending approval & settled payouts"}
            </p>
          </div>
        </div>

        <Link
          href={viewDetailsHref}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>Ledger Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Earned */}
        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
            Total Earned
          </span>
          <div className="text-xl font-extrabold text-on-surface">
            ${commission.totalEarned.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified admissions</span>
          </span>
        </div>

        {/* Pending Payout */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
            {isSuperAdminView ? "Pending Super Admin Approval" : "Pending Payout"}
          </span>
          <div className="text-xl font-extrabold text-amber-900">
            ${commission.pendingPayout.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Ready for settlement</span>
          </span>
        </div>

        {/* Paid Out */}
        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
            Already Settled
          </span>
          <div className="text-xl font-extrabold text-on-surface">
            ${commission.paidOut.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Transferred to bank</span>
        </div>
      </div>

      {/* Action footer */}
      {!isSuperAdminView && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-outline-variant/60">
          <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Next scheduled cycle:</span>
            <span className="font-bold text-primary">{commission.nextPayoutDate || "2026-09-15"}</span>
          </div>

          <button
            type="button"
            disabled={!commission.eligibleForPayout || commission.pendingPayout <= 0}
            onClick={handleRequestPayout}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>Request Payout (${commission.pendingPayout.toLocaleString()})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
