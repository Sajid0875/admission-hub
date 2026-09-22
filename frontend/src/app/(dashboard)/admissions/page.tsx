"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Search,
  RefreshCw,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Receipt,
  User,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
import { admissionService } from "@/services/api/admissionService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { Admission, PaymentStatus } from "@/types/admission";

export default function AdmissionsPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);
  const canVerify =
    currentUser?.role === "super_admin" || currentUser?.role === "partner_admin";

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "all">("all");
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admissions", page, limit, search, paymentStatus],
    queryFn: () =>
      admissionService.getAdmissions({
        page,
        limit,
        search,
        paymentStatus,
      }),
  });

  const admissions = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0 };
  const totalPages = meta.totalPages || Math.ceil(meta.total / meta.limit) || 1;

  const verifyMutation = useMutation({
    mutationFn: (admissionId: string) =>
      admissionService.verifyAdmission(admissionId, "VERIFIED"),
    onSuccess: (adm) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission-summary"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      addToast({
        type: "success",
        title: "Admission Verified",
        message: `${adm.studentName} verified — commission record generated if a rule exists.`,
      });
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Verification Failed",
        message: (err as { message?: string })?.message || "Could not verify admission.",
      });
    },
  });

  const gatewayPayMutation = useMutation({
    mutationFn: (admissionId: string) =>
      admissionService.collectViaGateway(admissionId),
    onSuccess: ({ admission }) => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      setSelectedAdmission(admission);
      addToast({
        type: "success",
        title: "Gateway payment recorded",
        message: `${admission.studentName}: ₹${admission.amountPaid.toLocaleString()} paid of ₹${admission.fee.toLocaleString()}.`,
      });
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Gateway payment failed",
        message: (err as { message?: string })?.message || "Could not collect payment.",
      });
    },
  });

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "full":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Full Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Partial ({status})
          </span>
        );
      case "refunded":
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Admissions & Enrollments
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              {meta.total} Students
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tracking converted applicant enrollments, fee installments, and course registrations.
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

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student name, student ID, or course..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value as PaymentStatus | "all");
            setPage(1);
          }}
          className="h-10 px-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 cursor-pointer"
        >
          <option value="all">All Payment Statuses</option>
          <option value="full">Full Paid</option>
          <option value="partial">Partial Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Enrolled Program</TableHead>
              <TableHead>Total Fee</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingState colSpan={7} />
            ) : admissions.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                title="No admissions found"
                description="When leads convert to admitted status, verified enrollment records appear here."
              />
            ) : (
              admissions.map((adm) => (
                <TableRow key={adm.id} className="group">
                  <TableCell>
                    <div>
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {adm.studentName}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {adm.studentId || adm.id}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800">
                      {adm.courseName || "General Course"}
                    </div>
                    {adm.leadId && (
                      <Link
                        href={`/leads/${adm.leadId}`}
                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>View Origin Lead</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold text-xs text-slate-900">
                      ₹{adm.fee.toLocaleString()}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs">
                      <span className="font-bold text-emerald-700">
                        ₹{adm.amountPaid.toLocaleString()}
                      </span>
                      <span className="text-slate-400 capitalize block text-[10px]">
                        via {adm.paymentMode.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>{getStatusBadge(adm.paymentStatus)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{adm.joiningDate}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      {canVerify && adm.verificationStatus === "pending" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => verifyMutation.mutate(adm.id)}
                          isLoading={verifyMutation.isPending}
                          leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAdmission(adm)}
                      >
                        Receipt & Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading admissions...</div>
        ) : admissions.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No admissions found</p>
            <p className="text-xs text-slate-500 mt-1">
              Admissions populate automatically when leads convert.
            </p>
          </div>
        ) : (
          admissions.map((adm) => (
            <div
              key={adm.id}
              onClick={() => setSelectedAdmission(adm)}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 cursor-pointer hover:border-blue-400 transition-colors shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{adm.studentName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{adm.courseName}</p>
                </div>
                {getStatusBadge(adm.paymentStatus)}
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500">Paid: <strong className="text-emerald-700 font-bold">₹{adm.amountPaid.toLocaleString()}</strong> of ₹{adm.fee.toLocaleString()}</span>
                <span className="text-blue-600 font-semibold">View</span>
              </div>
            </div>
          ))
        )}
      </div>

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

      {/* Admission Details Drawer / Modal */}
      {selectedAdmission && (
        <Modal
          isOpen={!!selectedAdmission}
          onClose={() => setSelectedAdmission(null)}
          title="Enrollment & Fee Breakdown"
          description={`Admission Record: ${selectedAdmission.studentId || selectedAdmission.id}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              {selectedAdmission.leadId ? (
                <Link href={`/leads/${selectedAdmission.leadId}`}>
                  <Button variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Open Origin Lead
                  </Button>
                </Link>
              ) : <div />}
              <div className="flex items-center gap-2">
                {canVerify && selectedAdmission.amountPaid < selectedAdmission.fee && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                    disabled={gatewayPayMutation.isPending}
                    onClick={() => gatewayPayMutation.mutate(selectedAdmission.id)}
                  >
                    {gatewayPayMutation.isPending ? "Collecting…" : "Pay remaining (gateway)"}
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={() => setSelectedAdmission(null)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedAdmission.studentName}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedAdmission.courseName}</p>
                </div>
                {getStatusBadge(selectedAdmission.paymentStatus)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Total Course Tuition</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    ₹{selectedAdmission.fee.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Verified Amount Paid</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">
                    ₹{selectedAdmission.amountPaid.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Settlement Mode</span>
                  <span className="capitalize font-semibold text-slate-800 mt-0.5 block">
                    {selectedAdmission.paymentMode.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Classes Start</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {selectedAdmission.joiningDate}
                  </span>
                </div>
              </div>
            </div>

            {selectedAdmission.remarks && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Enrollment Remarks
                </span>
                <p className="text-slate-700">{selectedAdmission.remarks}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
