"use client";

import React, { useState } from "react";
import { GraduationCap, TrendingUp, Search, SlidersHorizontal, ArrowUpRight } from "lucide-react";

interface AdmissionItem {
  id: string;
  name: string;
  course: string;
  partner: string;
  date: string;
  status: "pending" | "approved" | "admitted";
  stripeColor: string;
}

const mockAdmissions: AdmissionItem[] = [
  {
    id: "adm_1",
    name: "Alex Mercer",
    course: "B.Sc. Computer Science",
    partner: "EduGlobal Partners",
    date: "Oct 24, 2026",
    status: "pending",
    stripeColor: "bg-tertiary",
  },
  {
    id: "adm_2",
    name: "Sarah Jenkins",
    course: "MBA International Business",
    partner: "Direct",
    date: "Oct 22, 2026",
    status: "approved",
    stripeColor: "bg-primary",
  },
  {
    id: "adm_3",
    name: "David Chen",
    course: "M.Sc. Data Analytics",
    partner: "Global Reach",
    date: "Oct 20, 2026",
    status: "approved",
    stripeColor: "bg-primary",
  },
  {
    id: "adm_4",
    name: "Ananya Verma",
    course: "Full Stack Development",
    partner: "Apex Academy",
    date: "Oct 18, 2026",
    status: "admitted",
    stripeColor: "bg-emerald-600",
  },
];

export function AdmissionsView() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = mockAdmissions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.partner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Metric Summary Card */}
      <section className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 shadow-soft">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Total Admissions
            </h2>
            <p className="text-3xl font-bold text-on-surface mt-1">142</p>
            <p className="text-xs font-semibold text-primary flex items-center gap-1 mt-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>+12% this month</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search admissions..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/70"
          />
        </div>
        <button
          className="p-2.5 border border-outline-variant bg-white rounded-xl text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center"
          title="Filter admissions"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Admissions Cards List */}
      <div className="space-y-3">
        {filtered.map((adm) => (
          <article
            key={adm.id}
            className="bg-white border border-outline-variant rounded-xl p-5 hover:bg-slate-50/70 transition-all cursor-pointer relative overflow-hidden shadow-soft"
          >
            {/* Left Accent Stripe */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${adm.stripeColor}`} />

            <div className="flex justify-between items-start mb-2 pl-1">
              <div>
                <h3 className="text-base font-bold text-on-surface">{adm.name}</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{adm.course}</p>
              </div>
              <span
                className={`font-semibold text-xs px-2.5 py-1 rounded-full border ${
                  adm.status === "approved" || adm.status === "admitted"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-tertiary/10 text-tertiary border-tertiary/20"
                }`}
              >
                {adm.status.charAt(0).toUpperCase() + adm.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-on-surface-variant mt-3.5 pt-3 border-t border-slate-100 pl-1">
              <div>
                <span className="block font-semibold text-on-surface text-xs">Partner</span>
                <span className="mt-0.5 block">{adm.partner}</span>
              </div>
              <div>
                <span className="block font-semibold text-on-surface text-xs">Date</span>
                <span className="mt-0.5 block">{adm.date}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
