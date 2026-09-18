"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Plus,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Percent,
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
import { AccessDenied } from "@/components/auth/AccessDenied";
import { partnerService } from "@/services/api/adminService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { Partner, PartnerStatus } from "@/types/partner";

export default function PartnersPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [search, setSearch] = useState("");
  const [partnerToApprove, setPartnerToApprove] = useState<Partner | null>(null);

  const { data: partners = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["partners"],
    queryFn: () => partnerService.getPartners(),
    enabled: isSuperAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => partnerService.approvePartner(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      addToast({
        type: "success",
        title: "Partner Approved",
        message: `${updated.academyName} is now active and provisioned with tenant access.`,
      });
      setPartnerToApprove(null);
    },
  });

  // Guard: Global partner management is strictly Super Admin
  if (!isSuperAdmin) {
    return (
      <AccessDenied
        title="Global Partner Management Restricted"
        message="Only Super Admin accounts possess global authority over partner tenant onboarding and agreements."
      />
    );
  }

  const filtered = partners.filter((p) => {
    const q = search.toLowerCase().trim();
    return (
      p.academyName.toLowerCase().includes(q) ||
      (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: PartnerStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Active Tenant
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Partner Directory & Tenancy
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Super Admin View
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage multi-tenant partner institutions, commission agreements, and onboarding approvals.
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

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search academy name, director, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Partners Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Academy Name / ID</TableHead>
            <TableHead>Primary Contact</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Commission Rate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={6} />
          ) : filtered.length === 0 ? (
            <TableEmptyState
              colSpan={6}
              title="No partners found"
              description="No partner tenant matches your search query."
            />
          ) : (
            filtered.map((partner) => (
              <TableRow key={partner.id} className="group">
                <TableCell>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {partner.academyName}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Tenant ID: {partner.id}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 block">
                      {partner.ownerName || "Academy Admin"}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px] block">
                      {partner.email}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {partner.contact?.city
                        ? `${partner.contact.city}, ${partner.contact.state || ""}`
                        : "Global / Online"}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                    <Percent className="w-3 h-3 text-blue-600" />
                    <span>{partner.commissionRate || 10}%</span>
                  </div>
                </TableCell>

                <TableCell>{getStatusBadge(partner.status)}</TableCell>

                <TableCell className="text-right">
                  {partner.status === "pending" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setPartnerToApprove(partner)}
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      Approve Partner
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Active</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Approve Partner Confirmation Modal */}
      {partnerToApprove && (
        <Modal
          isOpen={!!partnerToApprove}
          onClose={() => setPartnerToApprove(null)}
          title="Approve Partner Onboarding"
          description={`Activate tenant workspace for ${partnerToApprove.academyName}`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPartnerToApprove(null)}
                disabled={approveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => approveMutation.mutate(partnerToApprove.id)}
                isLoading={approveMutation.isPending}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Approve & Activate
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Approving <strong>{partnerToApprove.academyName}</strong> will immediately enable portal login, lead assignment, and commission payout tracking for their counselors.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div><strong>Owner:</strong> {partnerToApprove.ownerName} ({partnerToApprove.email})</div>
              <div><strong>Commission Rate:</strong> {partnerToApprove.commissionRate}%</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
