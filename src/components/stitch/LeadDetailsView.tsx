"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  MoreVertical,
  CheckCircle2,
  Flame,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  DollarSign,
  User,
  GraduationCap,
  Clock,
} from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

interface LeadDetailsViewProps {
  leadId: string;
  onBack: () => void;
  onMarkAdmitted?: (leadId: string) => void;
}

export function LeadDetailsView({ leadId, onBack, onMarkAdmitted }: LeadDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "followups">("overview");
  const [isAdmitted, setIsAdmitted] = useState(false);
  const addToast = useUIStore((state) => state.addToast);

  const handleMarkAdmitted = () => {
    setIsAdmitted(true);
    if (onMarkAdmitted) {
      onMarkAdmitted(leadId);
    }
    addToast({
      type: "success",
      title: "Lead Converted",
      message: "Alex Mercer has been marked as Admitted. Admission record created.",
    });
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-on-surface">Lead Details</h1>
        <button
          className="p-2 -mr-2 rounded-xl text-on-surface hover:bg-surface-container-high transition-colors"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Lead Title & Status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Alex Mercer</h2>
          <p className="text-sm text-on-surface-variant font-medium mt-0.5">B.Sc Computer Science</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            isAdmitted
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isAdmitted ? "bg-emerald-500" : "bg-amber-500"}`} />
          {isAdmitted ? "Admitted" : "Follow Up"}
        </span>
      </div>

      {/* Metric Boxes (Priority & Score) */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white border border-outline-variant rounded-2xl p-4 flex flex-col gap-1 shadow-soft">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Priority</span>
          <div className="flex items-center gap-1.5 text-error font-bold text-xl">
            <Flame className="w-5 h-5 fill-error" />
            <span>High</span>
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-4 flex flex-col gap-1 shadow-soft">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Lead Score</span>
          <span className="text-primary font-bold text-xl">85/100</span>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        disabled={isAdmitted}
        onClick={handleMarkAdmitted}
        className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
          isAdmitted
            ? "bg-emerald-600 text-white cursor-default"
            : "bg-primary text-white hover:bg-primary-hover active:scale-[0.99]"
        }`}
      >
        <CheckCircle2 className="w-5 h-5" />
        {isAdmitted ? "Admission Confirmed" : "Mark as Admitted"}
      </button>

      {/* Tabs Navigation */}
      <div className="flex border-b border-outline-variant text-sm font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === "timeline"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab("followups")}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === "followups"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Follow-ups
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Contact Info Card */}
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-4">
            <h3 className="font-bold text-base text-on-surface">Contact Info</h3>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">Email</div>
                  <a href="mailto:alex.m@example.com" className="text-sm font-medium text-primary hover:underline">
                    alex.m@example.com
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant">Phone</div>
                  <div className="text-sm font-medium text-on-surface">+1 (555) 123-4567</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="tel:+15551234567"
                  className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-white transition-colors"
                  title="Call"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href="https://wa.me/15551234567"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Application Details Card */}
          <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-4">
            <h3 className="font-bold text-base text-on-surface">Application Details</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Program</span>
                <span className="font-medium text-on-surface mt-0.5 block">B.Sc Computer Science</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Intake</span>
                <span className="font-medium text-on-surface mt-0.5 block">Fall 2026</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Source</span>
                <span className="font-medium text-on-surface mt-0.5 block">Website Inquiry</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Assigned To</span>
                <span className="font-medium text-on-surface mt-0.5 block">Sarah Jenkins (Counselor)</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">City</span>
                <span className="font-medium text-on-surface mt-0.5 block">New York, NY</span>
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">Budget</span>
                <span className="font-medium text-on-surface mt-0.5 block">₹45,000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Timeline */}
      {activeTab === "timeline" && (
        <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-4 animate-in fade-in duration-150">
          <h3 className="font-bold text-base text-on-surface">Activity Timeline</h3>
          <div className="space-y-3 relative pl-4 border-l-2 border-slate-100">
            <div className="relative">
              <span className="w-2.5 h-2.5 rounded-full bg-primary absolute -left-[21px] top-1.5 ring-4 ring-white" />
              <div className="text-xs text-on-surface-variant">Today 10:15 AM</div>
              <div className="text-sm font-semibold text-on-surface">Consultation Call Completed</div>
              <p className="text-xs text-slate-600 mt-0.5">Discussed syllabus and scholarship availability.</p>
            </div>
            <div className="relative pt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 absolute -left-[21px] top-3.5 ring-4 ring-white" />
              <div className="text-xs text-on-surface-variant">Aug 29, 2026</div>
              <div className="text-sm font-semibold text-on-surface">Lead Created via Website Form</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Follow-ups */}
      {activeTab === "followups" && (
        <div className="bg-white border border-outline-variant rounded-2xl p-5 shadow-soft space-y-4 animate-in fade-in duration-150">
          <h3 className="font-bold text-base text-on-surface">Follow-up Tasks</h3>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-on-surface">Document Verification Call</div>
              <div className="text-xs text-error font-medium">Due Today · 2:00 PM</div>
            </div>
            <span className="bg-amber-50 text-amber-700 font-semibold text-xs px-2.5 py-1 rounded-full border border-amber-200">
              Pending
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
