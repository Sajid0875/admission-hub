"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
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
import { AccessDenied } from "@/components/auth/AccessDenied";
import { auditService, type AuditLogEntry } from "@/services/api/adminService";
import { useAuthStore } from "@/stores/useAuthStore";

export default function AuditPage() {
  const currentUser = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const isSupport = currentUser?.role === "support";
  const canViewAudit = hasPermission("audit:view") || isSuperAdmin || isSupport;

  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => auditService.getAuditLogs(),
    enabled: canViewAudit,
  });

  if (!canViewAudit) {
    return (
      <AccessDenied
        title="Audit Logs Restricted"
        message="System audit logs are immutable and accessible exclusively to Super Admin and Support compliance roles."
      />
    );
  }

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase().trim();
    return (
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: AuditLogEntry["status"]) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Success
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Warning
          </span>
        );
      case "failure":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Audit Logs</h1>
            <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-500" />
              Read-Only Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable trace of system-wide administrative, payout, and intake events.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search actor, action event, entity, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Audit Log Table (Strictly Read-Only, No Edit/Delete) */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action Event</TableHead>
            <TableHead>Target Entity</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Event Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={7} />
          ) : filtered.length === 0 ? (
            <TableEmptyState
              colSpan={7}
              title="No audit events found"
              description="No logs matching your search parameters."
            />
          ) : (
            filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-semibold text-slate-900">{log.actor}</span>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800">{log.entity}</span>
                    <span className="text-slate-400 font-mono text-[10px] block">{log.entityId}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-mono text-slate-500">{log.ipAddress}</span>
                </TableCell>

                <TableCell>{getStatusBadge(log.status)}</TableCell>

                <TableCell>
                  <p className="text-xs text-slate-600 max-w-sm truncate" title={log.details}>
                    {log.details}
                  </p>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
