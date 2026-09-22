"use client";

import React, { useState } from "react";
import { Search, Filter, Plus, Flame, Phone, Mail, User } from "lucide-react";

interface LeadItem {
  id: string;
  name: string;
  contact: string;
  contactType: "phone" | "email";
  status: "new" | "contacted" | "follow_up" | "admitted" | "lost";
  course: string;
  score: number;
  priority: "high" | "med" | "low";
  avatarInitials: string;
  avatarBg: string;
}

const mockLeads: LeadItem[] = [
  {
    id: "lead_1",
    name: "Sarah Jenkins",
    contact: "+1 (555) 019-2834",
    contactType: "phone",
    status: "new",
    course: "B.Sc Computer Science",
    score: 85,
    priority: "high",
    avatarInitials: "SJ",
    avatarBg: "bg-primary-fixed text-primary",
  },
  {
    id: "lead_2",
    name: "Marcus Rodriguez",
    contact: "marcus.r@email.com",
    contactType: "email",
    status: "contacted",
    course: "MBA - Finance",
    score: 62,
    priority: "med",
    avatarInitials: "MR",
    avatarBg: "bg-secondary-container text-on-secondary-container",
  },
  {
    id: "lead_3",
    name: "David Chen",
    contact: "+1 (555) 890-1234",
    contactType: "phone",
    status: "follow_up",
    course: "M.A. Design",
    score: 45,
    priority: "low",
    avatarInitials: "DC",
    avatarBg: "bg-tertiary-container text-white",
  },
  {
    id: "lead_4",
    name: "Alex Mercer",
    contact: "+1 (555) 123-4567",
    contactType: "phone",
    status: "follow_up",
    course: "B.Sc Computer Science",
    score: 85,
    priority: "high",
    avatarInitials: "AM",
    avatarBg: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "lead_5",
    name: "Ananya Sharma",
    contact: "ananya.s@example.com",
    contactType: "email",
    status: "new",
    course: "Data Science & AI",
    score: 92,
    priority: "high",
    avatarInitials: "AS",
    avatarBg: "bg-emerald-100 text-emerald-800",
  },
];

interface LeadsListViewProps {
  onSelectLead: (leadId: string) => void;
  onOpenAddLead: () => void;
}

export function LeadsListView({ onSelectLead, onOpenAddLead }: LeadsListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredLeads = mockLeads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || l.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Leads List</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Manage and track student leads.</p>
        </div>
        <button
          onClick={onOpenAddLead}
          className="bg-primary text-white font-medium text-sm px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-hover active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/70"
          />
        </div>
        <button
          onClick={() => setActiveFilter(activeFilter === "all" ? "new" : activeFilter === "new" ? "follow_up" : "all")}
          className={`px-3.5 py-2.5 border border-outline-variant rounded-xl flex items-center justify-center transition-colors ${
            activeFilter !== "all" ? "bg-primary text-white border-primary" : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
          }`}
          title="Filter leads"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Sorting & Filter Meta */}
      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>
          Sorting: <strong className="text-on-surface">Newest first</strong>
          {activeFilter !== "all" && <span className="ml-2 font-semibold text-primary">({activeFilter})</span>}
        </span>
        {(searchTerm || activeFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setActiveFilter("all");
            }}
            className="text-primary font-semibold hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Lead Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead.id)}
            className="bg-white border border-outline-variant rounded-2xl p-4 flex flex-col gap-3.5 cursor-pointer hover:border-primary/40 hover:shadow-soft active:bg-surface-container-low transition-all"
          >
            {/* Header: Avatar, Name, Status Badge */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${lead.avatarBg}`}>
                  {lead.avatarInitials}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-on-surface">{lead.name}</h3>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                    {lead.contactType === "phone" ? (
                      <Phone className="w-3 h-3 text-slate-400" />
                    ) : (
                      <Mail className="w-3 h-3 text-slate-400" />
                    )}
                    {lead.contact}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border ${
                  lead.status === "new"
                    ? "bg-primary-fixed-dim/20 text-on-primary-fixed-variant border-primary-fixed-dim/30"
                    : lead.status === "contacted"
                    ? "bg-secondary/10 text-secondary border-secondary/20"
                    : lead.status === "follow_up"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {lead.status === "follow_up" ? "Follow-up" : lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </span>
            </div>

            {/* Details: Course, Score, Priority */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
              <div className="flex flex-col">
                <span className="text-on-surface-variant text-[11px]">Course</span>
                <span className="font-medium text-on-surface">{lead.course}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-on-surface-variant text-[11px]">Score</span>
                  <span className="font-bold text-on-surface">{lead.score}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-on-surface-variant text-[11px]">Priority</span>
                  <span
                    className={`font-semibold flex items-center gap-0.5 ${
                      lead.priority === "high" ? "text-error" : "text-slate-600"
                    }`}
                  >
                    {lead.priority === "high" && <Flame className="w-3.5 h-3.5 fill-error text-error" />}
                    {lead.priority === "high" ? "High" : lead.priority === "med" ? "Med" : "Low"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
