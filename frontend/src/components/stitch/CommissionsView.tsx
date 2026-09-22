"use client";

import React, { useState } from "react";
import { DollarSign, FileText, CheckCircle2, Clock, Landmark, Filter, Check } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

export function CommissionsView() {
  const [payoutApproved, setPayoutApproved] = useState(false);
  const addToast = useUIStore((state) => state.addToast);

  const handleApprove = () => {
    setPayoutApproved(true);
    addToast({
      type: "success",
      title: "Payout Approved",
      message: "Payout of $1,500.00 for Elite Admissions Co. approved successfully.",
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Overview Metric Cards */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-on-surface">Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Total Earned Big Card */}
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-soft flex flex-col justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <DollarSign className="w-4 h-4 bg-primary-fixed rounded p-0.5" />
              <span>Total Earned</span>
            </div>
            <div className="my-3">
              <div className="text-4xl font-black text-on-surface tracking-tight">$24,500</div>
              <span className="text-xs font-semibold text-primary mt-1 inline-block">+12% this month</span>
            </div>
          </div>

          {/* Pending & Paid Out Mini Stack */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft flex flex-col justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pending</span>
              <div className="text-2xl font-bold text-on-surface mt-2">$3,200</div>
            </div>
            <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft flex flex-col justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Paid Out</span>
              <div className="text-2xl font-bold text-on-surface mt-2">$21,300</div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgent Pending Payout Request Card */}
      <section className="bg-primary-fixed/40 border border-primary/20 rounded-2xl p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-on-surface font-semibold text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span>Pending Payout Request</span>
          </div>
          <span className="bg-primary text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full tracking-wider">
            URGENT
          </span>
        </div>

        <div>
          <div className="text-xs text-on-surface-variant font-medium">Partner: Elite Admissions Co.</div>
          <div className="text-3xl font-black text-on-surface mt-1">$1,500.00</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleApprove}
            disabled={payoutApproved}
            className={`py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
              payoutApproved
                ? "bg-emerald-600 text-white cursor-default"
                : "bg-primary text-white hover:bg-primary-hover active:scale-95"
            }`}
          >
            {payoutApproved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Approved</span>
              </>
            ) : (
              "Approve"
            )}
          </button>
          <button className="py-3 px-4 rounded-xl font-semibold text-sm bg-white border border-outline-variant text-on-surface hover:bg-slate-50 transition-colors shadow-sm">
            Review Details
          </button>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="space-y-3.5">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-on-surface">Recent Transactions</h2>
          <button className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* Tx 1 */}
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-on-surface">Sarah Jenkins</h3>
                <p className="text-xs text-on-surface-variant">UX/UI Design Bootcamp</p>
              </div>
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Pending
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-on-surface-variant">Oct 24, 2026</span>
              <span className="text-lg font-bold text-on-surface">$500.00</span>
            </div>
          </div>

          {/* Tx 2 */}
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-on-surface">Michael Chang</h3>
                <p className="text-xs text-on-surface-variant">Full Stack Engineering</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Approved
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-on-surface-variant">Oct 22, 2026</span>
              <span className="text-lg font-bold text-on-surface">$750.00</span>
            </div>
          </div>

          {/* Tx 3 */}
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-on-surface">Elena Rodriguez</h3>
                <p className="text-xs text-on-surface-variant">Data Science Immersive</p>
              </div>
              <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                <Landmark className="w-3 h-3 text-blue-600" />
                Paid
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-on-surface-variant">Oct 15, 2026</span>
              <span className="text-lg font-bold text-on-surface">$1,200.00</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
