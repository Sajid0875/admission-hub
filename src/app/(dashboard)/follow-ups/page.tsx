"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableLoadingState,
  TableEmptyState,
} from "@/components/ui/Table";
import { LeadPriorityBadge } from "@/components/leads/LeadStatusBadge";
import { leadService } from "@/services/api/leadService";

export default function FollowUpsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  // Fetch leads to assemble the cross-lead follow-up schedule
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["leads", 1, 50],
    queryFn: () => leadService.getLeads({ page: 1, limit: 50 }),
  });

  const leads = data?.data || [];

  // Filter leads with followUpDate or active follow-up notes
  const followUpQueue = leads
    .filter((l) => l.followUpDate || l.status === "follow_up")
    .map((l) => ({
      id: `fu_${l.id}`,
      leadId: l._id || l.id,
      studentName: l.studentName,
      phone: l.phone,
      course: l.courseInterest || "General Inquiry",
      priority: l.priority,
      status: l.status === "admitted" ? "completed" : "pending",
      dueDate: l.followUpDate || new Date().toISOString(),
      notes: l.notes || "Follow up on scholarship pricing inquiry and enrollment.",
    }));

  const filtered = followUpQueue.filter((item) => {
    const matchesSearch =
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      item.phone.includes(search) ||
      item.course.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && item.status === "pending") ||
      (statusFilter === "completed" && item.status === "completed");
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Follow-Up Agenda & Schedules
            </h1>
            <span className="bg-amber-50 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">
              {filtered.length} Scheduled
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Prioritized reminder agenda for counseling outreach and scheduled demo calls.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
        >
          Refresh Agenda
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, phone, or program..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
        >
          <option value="pending">Pending Follow-ups</option>
          <option value="completed">Completed Follow-ups</option>
          <option value="all">All Reminders</option>
        </select>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Schedule</TableHead>
            <TableHead>Task Notes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={7} />
          ) : filtered.length === 0 ? (
            <TableEmptyState
              colSpan={7}
              title="No follow-up tasks due"
              description="Scheduled follow-up dates and counselor reminders will populate here."
            />
          ) : (
            filtered.map((item) => (
              <TableRow key={item.id} className="group">
                <TableCell>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.studentName}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{item.phone}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-slate-700">{item.course}</span>
                </TableCell>

                <TableCell>
                  <LeadPriorityBadge priority={item.priority} />
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{new Date(item.dueDate).toLocaleString()}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <p className="text-xs text-slate-600 max-w-xs truncate" title={item.notes}>
                    {item.notes}
                  </p>
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      item.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {item.status === "completed" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-600" />
                    )}
                    <span className="capitalize">{item.status}</span>
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <Link
                    href={`/leads/${item.leadId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span>Open Lead</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
