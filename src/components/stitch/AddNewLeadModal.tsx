"use client";

import React, { useState } from "react";
import { X, AlertTriangle, User, BarChart2, MapPin, ArrowRight, Check } from "lucide-react";
import { useUIStore } from "@/stores/useUIStore";

interface AddNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated?: (lead: any) => void;
}

export function AddNewLeadModal({ isOpen, onClose, onLeadCreated }: AddNewLeadModalProps) {
  const [fullName, setFullName] = useState("Jane Doe");
  const [phone, setPhone] = useState("+1 555-0199");
  const [whatsapp, setWhatsapp] = useState("+1 555-0199");
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState("jane@example.com");
  const [city, setCity] = useState("New York, NY");
  const [course, setCourse] = useState("bsc_cs");
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(true);

  const addToast = useUIStore((state) => state.addToast);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: "success",
      title: "Lead Created",
      message: `${fullName} has been added to the lead pipeline.`,
    });
    if (onLeadCreated) {
      onLeadCreated({
        name: fullName,
        phone,
        email,
        city,
        course,
      });
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Body */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-outline-variant z-10 overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-on-surface">Add New Lead</h2>
          <div className="w-5" /> {/* Balance header spacing */}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Possible Duplicate Lead Banner */}
          {showDuplicateWarning && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-900">
                <h4 className="font-bold text-sm text-rose-950">Possible Duplicate Lead</h4>
                <p className="mt-0.5 text-rose-800">
                  A lead with the phone number <strong>+1 555-0199</strong> already exists in the system.{" "}
                  <button
                    type="button"
                    onClick={() => setShowDuplicateWarning(false)}
                    className="underline font-semibold text-rose-950 hover:text-rose-700"
                  >
                    Dismiss alert.
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Student Info Section */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1.5 border-b border-outline-variant">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-on-surface">Student Info</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Student full name"
                className="w-full h-11 px-3.5 bg-white border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (sameAsPhone) setWhatsapp(e.target.value);
                  }}
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-sm text-on-surface focus:outline-none transition-all ${
                    showDuplicateWarning
                      ? "border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20"
                      : "border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    WhatsApp
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSameAsPhone(!sameAsPhone);
                      if (!sameAsPhone) setWhatsapp(phone);
                    }}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                      sameAsPhone ? "bg-primary-fixed text-primary" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sameAsPhone ? "✓ Same as phone" : "Different"}
                  </button>
                </div>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={sameAsPhone}
                  className="w-full h-11 px-3.5 bg-white disabled:bg-slate-50 border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full h-11 px-3.5 bg-white border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                City / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City, State"
                  className="w-full h-11 pl-10 pr-3.5 bg-white border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Lead Info Section */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-outline-variant">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-on-surface">Lead Info</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Interested Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                <option value="bsc_cs">B.Sc Computer Science</option>
                <option value="mba_fin">MBA - Finance & Marketing</option>
                <option value="ds_ai">Data Science & AI Immersive</option>
                <option value="ma_des">M.A. Product & UI/UX Design</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all shadow-sm flex items-center gap-2"
            >
              <span>Create Lead</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
