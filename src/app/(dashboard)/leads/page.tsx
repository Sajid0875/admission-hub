"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Phone,
  Mail,
  Flame,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
import { LeadStatusBadge, LeadPriorityBadge, LeadScorePill } from "@/components/leads/LeadStatusBadge";
import { LeadCard } from "@/components/leads/LeadCard";
import { CreateLeadModal } from "@/components/leads/CreateLeadModal";
import { leadService } from "@/services/api/leadService";
import { useAuthStore } from "@/stores/useAuthStore";
import type { LeadStatus, LeadPriority } from "@/types/lead";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New Intake" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "demo", label: "Demo Booked" },
  { value: "admitted", label: "Admitted" },
  { value: "lost", label: "Lost" },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function LeadsPage() {
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [priority, setPriority] = useState<LeadPriority | "all">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreateLead = hasPermission("lead:create");

  // React Query fetching data strictly with server meta
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["leads", page, limit, search, status, priority],
    queryFn: async () => {
      return await leadService.getLeads({
        page,
        limit,
        search,
        status,
        priority,
      });
    },
  });

  const leads = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0 };
  const totalPages = meta.totalPages || Math.ceil(meta.total / meta.limit) || 1;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1); // Reset to page 1 on filter
  };

  const handleStatusChange = (val: string) => {
    setStatus(val as LeadStatus | "all");
    setPage(1);
  };

  const handlePriorityChange = (val: string) => {
    setPriority(val as LeadPriority | "all");
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setPriority("all");
    setPage(1);
  };

  const hasActiveFilters = search.trim() !== "" || status !== "all" || priority !== "all";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads Inbox</h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {meta.total} Records
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tenant-scoped lead pipeline with duplicate phone protection and server-managed scoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>

          {canCreateLead && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, phone, or email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="sm:col-span-3">
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
            >
              {PRIORITY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter status summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Showing filtered results for:{" "}
              {search && <strong className="text-slate-700 mr-2">&quot;{search}&quot;</strong>}
              {status !== "all" && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold mr-2">
                  Status: {status}
                </span>
              )}
              {priority !== "all" && (
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">
                  Priority: {priority}
                </span>
              )}
            </span>
            <button
              onClick={handleClearFilters}
              className="text-blue-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-950">Failed to load leads</h3>
          <p className="text-xs text-rose-800 max-w-md mx-auto">
            {(error as Error)?.message || "Could not retrieve leads from backend service."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry Query
          </Button>
        </div>
      )}

      {/* Mobile Card Layout (Visible on Small Screens) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No leads found</p>
            <p className="text-xs text-slate-500 mt-1">
              {hasActiveFilters
                ? "Try adjusting your search criteria."
                : "Create your first lead to begin tracking student intake."}
            </p>
            {canCreateLead && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Lead
              </Button>
            )}
          </div>
        ) : (
          leads.map((lead) => <LeadCard key={lead._id || lead.id} lead={lead} />)
        )}
      </div>

      {/* Desktop Table Layout (Visible on md and above) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Student / Contact</TableHead>
              <TableHead>Academic Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Lead Score</TableHead>
              <TableHead>Counselor</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingState colSpan={7} />
            ) : leads.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                title="No leads found"
                description={
                  hasActiveFilters
                    ? "Try adjusting your search terms or active filters."
                    : "No intake leads have been registered yet for this partner workspace."
                }
                action={
                  canCreateLead ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsCreateModalOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create First Lead
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              leads.map((lead) => {
                const leadId = lead._id || lead.id;
                return (
                  <TableRow key={leadId} className="group">
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/leads/${leadId}`}
                            className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors hover:underline"
                          >
                            {lead.studentName}
                          </Link>
                          {lead.isDuplicate && (
                            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                              Duplicate
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{lead.phone}</span>
                          {lead.city && <span className="text-slate-400 font-sans">• {lead.city}</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-medium text-slate-800">
                        {lead.courseInterest || "General Inquiry"}
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                        Source: {lead.source || "Direct"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>

                    <TableCell>
                      <LeadPriorityBadge priority={lead.priority} />
                    </TableCell>

                    <TableCell>
                      <LeadScorePill score={lead.leadScore} />
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.assignedUserName || lead.assignedTo || "Unassigned"}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Link
                        href={`/leads/${leadId}`}
                        className="inline-flex items-center justify-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View & Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server Pagination Bar (strictly powered by meta.page, meta.limit, meta.total) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{leads.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0}</span> to{" "}
          <span className="font-semibold text-slate-800">
            {Math.min(meta.page * meta.limit, meta.total)}
          </span>{" "}
          of <span className="font-semibold text-slate-800">{meta.total}</span> leads
        </div>

        <div className="flex items-center gap-2 self-center sm:self-auto">
          {/* Limit selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Prev
          </Button>

          <span className="text-xs font-semibold text-slate-700 px-2">
            Page {meta.page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
