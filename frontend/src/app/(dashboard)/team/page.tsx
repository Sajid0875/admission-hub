"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  Plus,
  RefreshCw,
  Search,
  Mail,
  Phone,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
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
import { Modal } from "@/components/ui/Modal";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { teamService, type TeamMember } from "@/services/api/adminService";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUIStore } from "@/stores/useUIStore";
import type { UserRole } from "@/types/auth";

export default function TeamPage() {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);
  const currentUser = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isSuperAdmin = currentUser?.role === "super_admin";
  const canManageTeam = hasPermission("team:manage") || isSuperAdmin;

  const [search, setSearch] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("counselor");

  const partnerId = isSuperAdmin ? currentUser?.partnerId || undefined : undefined;

  const { data: team = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["team", currentUser?.role, currentUser?.partnerId],
    // Non-SA must omit partnerId — backend scopes PA to their tenant and 403s partnerId filters.
    queryFn: () => teamService.getTeamMembers(isSuperAdmin ? partnerId : undefined),
    enabled: canManageTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { name: string; email: string; phone?: string; role: UserRole; partnerId: string; status: "active" }) =>
      teamService.inviteTeamMember(payload),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      const tempHint = newMember.temporaryPassword
        ? ` Temporary password (copy now): ${newMember.temporaryPassword}`
        : "";
      addToast({
        type: "success",
        title: "Invitation Sent",
        message: `${newMember.name} invited as ${newMember.role.replace("_", " ")}.${tempHint}`,
      });
      setIsInviteModalOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePhone("");
    },
    onError: (err: unknown) => {
      addToast({
        type: "error",
        title: "Invite Failed",
        message: (err as { message?: string })?.message || "Could not invite team member.",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => teamService.toggleUserStatus(userId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      addToast({
        type: "info",
        title: "User Status Updated",
        message: `${updated.name} is now ${updated.status}.`,
      });
    },
  });

  if (!canManageTeam) {
    return (
      <AccessDenied
        title="Team Administration Restricted"
        message="Only Partner Administrators and Super Admins can manage team members and staff assignments."
      />
    );
  }

  const filtered = team.filter((m) => {
    const q = search.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">SUPER ADMIN</span>;
      case "partner_admin":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">PARTNER ADMIN</span>;
      case "counselor":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">COUNSELOR</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 uppercase">{role.replace("_", " ")}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
              {team.length} Members
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage counseling staff, intake assignment limits, and role access privileges.
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

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Invite Member
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Team Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Active Leads</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableLoadingState colSpan={6} />
          ) : filtered.length === 0 ? (
            <TableEmptyState
              colSpan={6}
              title="No team members found"
              description="Invite staff counselors to distribute leads."
            />
          ) : (
            filtered.map((member) => (
              <TableRow key={member.id} className="group">
                <TableCell>
                  <div>
                    <div className="font-semibold text-slate-900">{member.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{member.email}</div>
                  </div>
                </TableCell>

                <TableCell>{getRoleBadge(member.role)}</TableCell>

                <TableCell>
                  <span className="text-xs font-bold text-slate-800">
                    {member.assignedLeadsCount || 0} leads
                  </span>
                </TableCell>

                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      member.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {member.status === "active" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-slate-400" />
                    )}
                    <span className="capitalize">{member.status}</span>
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-slate-500">{member.lastActive || "—"}</span>
                </TableCell>

                <TableCell className="text-right">
                  {isSuperAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate(member.id)}
                      disabled={toggleStatusMutation.isPending}
                    >
                      {member.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Team Member"
        description="Grant counselor or staff access to your partner workspace."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!inviteName.trim() || !inviteEmail.trim()) {
                  addToast({ type: "error", title: "Missing Fields", message: "Name and email are required." });
                  return;
                }
                inviteMutation.mutate({
                  name: inviteName.trim(),
                  email: inviteEmail.trim(),
                  phone: invitePhone.trim() || undefined,
                  role: inviteRole,
                  partnerId: currentUser?.partnerId || "partner_001",
                  status: "active",
                });
              }}
              isLoading={inviteMutation.isPending}
            >
              Send Invitation
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Full Name *"
            placeholder="e.g. John Doe"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Work Email *"
            type="email"
            placeholder="e.g. john.doe@apexacademy.edu"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />

          <Input
            label="Contact Phone"
            placeholder="e.g. +92 300 1234567"
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value)}
          />

          <Select
            label="Portal Role *"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            options={[
              { value: "counselor", label: "Student Counselor (Lead intake & follow-ups)" },
              { value: "team_member", label: "Team Member (Assigned leads only)" },
              { value: "partner_admin", label: "Partner Admin (Full academy workspace management)" },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
