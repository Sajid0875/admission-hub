"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  Phone,
  ExternalLink,
  Search,
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

  // Live agenda from GET /followups (not derived from lead.followUpDate)
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["followups", statusFilter],
    queryFn: () =>
      leadService.listFollowups({
        page: 1,
        limit: 50,
        status: statusFilter,
      }),
  });

  // Lead directory for student name / phone enrichment
  const { data: leadsPage } = useQuery({
    queryKey: ["leads", "followup-enrich", 1, 100],
    queryFn: () => leadService.getLeads({ page: 1, limit: 100 }),
  });

  const leadById = useMemo(() => {
    const map = new Map<string, { studentName: string; phone: string; course?: string }>();
    for (const lead of leadsPage?.data || []) {
      map.set(lead.id, {
        studentName: lead.studentName,
        phone: lead.phone,
        course: lead.courseInterest,
      });
      if (lead._id) {
        map.set(lead._id, {
          studentName: lead.studentName,
          phone: lead.phone,
          course: lead.courseInterest,
        });
      }
    }
    return map;
  }, [leadsPage?.data]);

  const rows = (data?.data || []).map((task) => {
    const lead = leadById.get(task.leadId);
    return {
      id: task.id,
      leadId: task.leadId,
      studentName: lead?.studentName || `Lead ${task.leadId.slice(0, 8)}`,
      phone: lead?.phone || "—",
      course: lead?.course || "General Inquiry",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      notes: task.notes || "—",
    };
  });

  const filtered = rows.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.studentName.toLowerCase().includes(q) ||
      item.phone.includes(search) ||
      item.course.toLowerCase().includes(q) ||
      item.notes.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
