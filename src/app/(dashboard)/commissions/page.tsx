"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Filter,
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
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { commissionService } from "@/services/api/commissionService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import { isNormalizedError } from "@/services/api/client";
import type { CommissionRecord, PayoutStatus } from "@/types/commission";

export default function CommissionsPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canApprovePayout = hasPermission("commission:approve_payout") || isSuperAdmin;

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | "all">("all");

  // Approval confirmation modal state
  const [recordToApprove, setRecordToApprove] = useState<CommissionRecord | null>(null);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  // Partner filter: only SUPER_ADMIN may send partnerId; PA is tenant-scoped server-side.
  const partnerIdFilter = isSuperAdmin ? undefined : undefined;

  // Fetch summary directly from backend (never calculated client-side)
  const { data: summary } = useQuery({
    queryKey: ["commission-summary", currentUser?.role, currentUser?.partnerId],
    queryFn: () => commissionService.getCommissionSummary(partnerIdFilter),
  });

  // Fetch commission records
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["commissions", page, limit, payoutStatus, search, currentUser?.role],
    queryFn: () =>
      commissionService.getCommissions({
        page,
        limit,
        payoutStatus,
        search,
        partnerId: partnerIdFilter,
      }),
  });

  const commissions = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0 };
  const totalPages = meta.totalPages || Math.ceil(meta.total / meta.limit) || 1;

  // Payout Approval Mutation (Super Admin confirmed action)
  const approveMutation = useMutation({
    mutationFn: (commissionId: string) => commissionService.approvePayout(commissionId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-summary"] });
      addToast({
        type: "success",
        title: "Payout Approved Successfully",
        message: `Settlement ref #${res.transactionReference || "SETTLED"} for $${res.approvedAmount.toLocaleString()} has been queued for disbursement.`,
      });
      setRecordToApprove(null);
      setForbiddenError(null);
    },
    onError: (err: unknown) => {
      if (isNormalizedError(err)) {
        if (err.statusCode === 403) {
          setForbiddenError(
            err.message || "403 Forbidden: Your role lacks permission to approve payout distributions."
          );
          return;
        }
        setForbiddenError(err.message || "Failed to approve payout settlement.");
      } else {
        setForbiddenError("An unexpected error occurred during payout approval.");
      }
    },
  });

  const getPayoutBadge = (status: PayoutStatus) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Paid Out
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3 h-3" />
            Approved
          </span>
        );
      case "requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            Accruing
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Commissions & Payouts Ledger
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {isSuperAdmin ? "Global Tenant Scope" : "Partner Account"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tracking partner referral earnings, verified admission commission, and disbursement approval.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* 403 Forbidden Alert Banner */}
      {forbiddenError && (
        <Alert variant="error" title="Permission Denied (HTTP 403)">
          {forbiddenError}
        </Alert>
      )}

      {/* Summary KPI Cards (Strictly using backend provided data) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Earned
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              ${summary ? summary.totalEarned.toLocaleString() : "—"}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">From verified admissions</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs flex items-center justify-between bg-amber-50/20">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
              Pending Payout
            </span>
            <span className="text-2xl font-bold text-amber-900 mt-1 block">
              ${summary ? summary.pendingPayout.toLocaleString() : "—"}
            </span>
            <span className="text-[11px] text-amber-700 mt-0.5 block">
              {isSuperAdmin ? "Requires Super Admin clearance" : "Under review"}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Paid Out
            </span>
            <span className="text-2xl font-bold text-emerald-700 mt-1 block">
              ${summary ? summary.totalPaid.toLocaleString() : "—"}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Disbursed to bank account</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or course referral..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <select
          value={payoutStatus}
          onChange={(e) => {
            setPayoutStatus(e.target.value as PayoutStatus | "all");
            setPage(1);
          }}
          className="h-10 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
        >
          <option value="all">All Payout Statuses</option>
          <option value="requested">Pending Approval (Requested)</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid Out</option>
          <option value="pending">Accruing (Pending)</option>
        </select>
      </div>

      {/* Ledger Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference / Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Tuition Fee</TableHead>
            <TableHead>Earned Commission</TableHead>
            <TableHead>Payout Status</TableHead>
            <TableHead>Disbursement Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={7} />
          ) : commissions.length === 0 ? (
            <TableEmptyState
              colSpan={7}
              title="No commission records found"
              description="Commission records generate automatically upon verified student admission."
            />
          ) : (
            commissions.map((comm) => (
              <TableRow key={comm.id} className="group">
                <TableCell>
                  <div>
                    <div className="font-semibold text-slate-900">{comm.studentName || "Referral Student"}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{comm.id}</div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-xs text-slate-700 font-medium">{comm.courseName || "General Intake"}</div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-slate-600">
                    ${comm.admissionFee ? comm.admissionFee.toLocaleString() : "—"}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">${comm.earnedAmount.toLocaleString()}</span>
                    {comm.commissionRate && (
                      <span className="text-slate-400 block text-[10px]">Rate: {comm.commissionRate}%</span>
                    )}
                  </div>
                </TableCell>

                <TableCell>{getPayoutBadge(comm.payoutStatus)}</TableCell>

                <TableCell>
                  <span className="text-xs text-slate-500">
                    {comm.payoutDate ? new Date(comm.payoutDate).toLocaleDateString() : "—"}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  {/* Super Admin-Only Approve Payout Control */}
                  {canApprovePayout && (comm.payoutStatus === "requested" || comm.payoutStatus === "pending") ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setForbiddenError(null);
                        setRecordToApprove(comm);
                      }}
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      Approve Payout
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      {comm.payoutStatus === "paid"
                        ? "Settled"
                        : comm.payoutStatus === "approved"
                        ? "Queued"
                        : "View Only"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
        <span>
          Page {meta.page} of {totalPages} ({meta.total} records)
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Prev
          </Button>
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

      {/* Super Admin Approve Payout Confirmation Modal */}
      {recordToApprove && (
        <Modal
          isOpen={!!recordToApprove}
          onClose={() => setRecordToApprove(null)}
          title="Confirm Payout Authorization"
          description="Super Admin action executing PATCH /api/v1/commissions/{id}/payout"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordToApprove(null)}
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => approveMutation.mutate(recordToApprove.id)}
                isLoading={approveMutation.isPending}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Authorize & Disburse
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Commission Record:</span>
                <span className="font-mono font-bold text-slate-900">{recordToApprove.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Partner Tenant:</span>
                <span className="font-semibold text-slate-900">{recordToApprove.partnerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Converted:</span>
                <span className="font-semibold text-slate-900">{recordToApprove.studentName}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-bold">Approved Payout Amount:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  ${recordToApprove.earnedAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-slate-600">
              Authorizing this payout will transition the status to <strong>APPROVED</strong> and record a verified disbursement timestamp.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
