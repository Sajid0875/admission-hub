/**
 * DTO mappers between backend (Prisma enums / Safe* shapes) and frontend UI types.
 * Prefer mapping at the service boundary so UI components keep stable contracts.
 */

import type { AuthUser, Permission, UserRole } from "@/types/auth";
import type { Lead, LeadActivity, LeadPriority, LeadStatus, FollowupTask } from "@/types/lead";
import type { PaginatedMeta, PaginatedResponse } from "@/types/api";
import type { Partner, PartnerStatus } from "@/types/partner";
import type { CommissionRecord, CommissionSummary, PayoutStatus } from "@/types/commission";

// --- Auth / roles -----------------------------------------------------------

const ROLE_FROM_BACKEND: Record<string, UserRole> = {
  SUPER_ADMIN: "super_admin",
  PARTNER_ADMIN: "partner_admin",
  COUNSELOR: "counselor",
  SUPPORT: "support",
};

const ROLE_TO_BACKEND: Record<UserRole, string> = {
  super_admin: "SUPER_ADMIN",
  partner_admin: "PARTNER_ADMIN",
  counselor: "COUNSELOR",
  team_member: "COUNSELOR", // backend has no team_member; map to counselor
  support: "SUPPORT",
};

/** Permission sets used until /me returns server permissions. */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Backend POST /leads authorizes PARTNER_ADMIN + COUNSELOR only — no lead:create for SA.
  super_admin: [
    "partner:create",
    "partner:approve",
    "partner:manage",
    "lead:read",
    "lead:update",
    "lead:delete",
    "lead:assign",
    "lead:transfer",
    "lead:import",
    "lead:export",
    "admission:create",
    "admission:read",
    "admission:update",
    "commission:view",
    "commission:request_payout",
    "commission:approve_payout",
    "report:view",
    "report:view_all",
    "audit:view",
    "team:manage",
    "settings:manage",
  ],
  partner_admin: [
    "lead:create",
    "lead:read",
    "lead:update",
    "lead:assign",
    "lead:import",
    "lead:export",
    "admission:create",
    "admission:read",
    "admission:update",
    "commission:view",
    "commission:request_payout",
    "report:view",
    "team:manage",
  ],
  counselor: ["lead:create", "lead:read", "lead:update", "admission:read"],
  team_member: ["lead:create", "lead:read", "lead:update", "admission:read"],
  support: ["lead:read", "lead:update", "admission:read", "audit:view"],
};

export function mapBackendRole(role: string): UserRole {
  return ROLE_FROM_BACKEND[role] ?? (role.toLowerCase() as UserRole);
}

export function mapFrontendRoleToBackend(role: UserRole): string {
  return ROLE_TO_BACKEND[role] ?? role.toUpperCase();
}

export interface BackendSafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  partnerId?: string | null;
  status: string;
  lastLoginAt?: string | Date | null;
  createdAt?: string | Date;
}

export function mapBackendUserToAuthUser(user: BackendSafeUser): AuthUser {
  const role = mapBackendRole(user.role);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role,
    partnerId: user.partnerId ?? null,
    status: (user.status?.toLowerCase() as AuthUser["status"]) || "active",
    permissions: ROLE_PERMISSIONS[role] ?? [],
    lastLogin: user.lastLoginAt
      ? new Date(user.lastLoginAt).toISOString()
      : undefined,
  };
}

// --- Enums ------------------------------------------------------------------

const LEAD_STATUS_FROM_BE: Record<string, LeadStatus> = {
  NEW: "new",
  CONTACTED: "contacted",
  FOLLOW_UP: "follow_up",
  DEMO_BOOKED: "demo",
  DEMO_COMPLETED: "demo",
  FEE_DISCUSSION: "follow_up",
  ADMISSION_PENDING: "follow_up",
  ADMITTED: "admitted",
  LOST: "lost",
};

const LEAD_STATUS_TO_BE: Partial<Record<LeadStatus, string>> = {
  new: "NEW",
  contacted: "CONTACTED",
  follow_up: "FOLLOW_UP",
  demo: "DEMO_BOOKED",
  admitted: "ADMITTED",
  lost: "LOST",
};

const PRIORITY_FROM_BE: Record<string, LeadPriority> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

const PRIORITY_TO_BE: Record<LeadPriority, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  urgent: "URGENT",
};

export function mapLeadStatusFromBackend(status: string): LeadStatus {
  return LEAD_STATUS_FROM_BE[status] ?? (status.toLowerCase() as LeadStatus);
}

export function mapLeadStatusToBackend(status: LeadStatus): string {
  return LEAD_STATUS_TO_BE[status] ?? status.toUpperCase();
}

export function mapPriorityFromBackend(priority: string): LeadPriority {
  return PRIORITY_FROM_BE[priority] ?? (priority.toLowerCase() as LeadPriority);
}

export function mapPriorityToBackend(priority: LeadPriority): string {
  return PRIORITY_TO_BE[priority] ?? priority.toUpperCase();
}

// --- Pagination -------------------------------------------------------------

export function normalizePaginatedResponse<T>(
  raw: unknown,
  mapItem: (item: unknown) => T
): PaginatedResponse<T> {
  const obj = (raw ?? {}) as {
    success?: boolean;
    data?: unknown[];
    meta?: PaginatedMeta;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
    };
  };

  const rows = Array.isArray(obj.data) ? obj.data : [];
  const page = obj.meta?.page ?? obj.pagination?.page ?? 1;
  const limit = obj.meta?.limit ?? obj.pagination?.limit ?? (rows.length || 20);
  const total = obj.meta?.total ?? obj.pagination?.total ?? rows.length;
  const totalPages =
    obj.meta?.totalPages ??
    obj.pagination?.totalPages ??
    (Math.ceil(total / (limit || 1)) || 1);

  return {
    success: true,
    data: rows.map(mapItem),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

// --- Leads ------------------------------------------------------------------

export interface BackendSafeLead {
  id: string;
  partnerId: string;
  assignedTo?: string | null;
  courseId?: string | null;
  name: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  source?: string | null;
  budget?: number | null;
  priority: string;
  status: string;
  score: number;
  followUpDate?: string | Date | null;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  duplicateFlag?: boolean;
}

export function mapBackendLead(raw: unknown): Lead {
  const lead = raw as BackendSafeLead;
  return {
    id: lead.id,
    _id: lead.id,
    studentName: lead.name,
    phone: lead.phone,
    whatsapp: lead.whatsapp ?? undefined,
    email: lead.email ?? undefined,
    city: lead.city ?? undefined,
    courseId: lead.courseId ?? undefined,
    source: lead.source ?? undefined,
    budget: lead.budget ?? undefined,
    priority: mapPriorityFromBackend(lead.priority),
    status: mapLeadStatusFromBackend(lead.status),
    leadScore: lead.score,
    partnerId: lead.partnerId,
    assignedTo: lead.assignedTo ?? undefined,
    isDuplicate: Boolean(lead.duplicateFlag),
    followUpDate: lead.followUpDate
      ? new Date(lead.followUpDate).toISOString()
      : undefined,
    notes: lead.notes ?? undefined,
    createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : undefined,
    updatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : undefined,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Backend courseId is a Course UUID; FE catalog uses labels like course_ds until courses are live. */
export function mapCreateLeadPayload(payload: {
  studentName: string;
  phone: string;
  email?: string;
  courseId?: string;
  courseInterest?: string;
  source?: string;
  priority: LeadPriority;
  budget?: number;
  whatsapp?: string;
  city?: string;
  notes?: string;
}) {
  const courseId =
    payload.courseId && UUID_RE.test(payload.courseId) ? payload.courseId : null;
  // Prefer explicit notes; otherwise keep catalog course label as notes for ops.
  const notes =
    payload.notes?.trim() ||
    (courseId ? null : payload.courseInterest?.trim() || null);

  return {
    name: payload.studentName,
    phone: payload.phone,
    email: payload.email ?? null,
    courseId,
    source: payload.source ?? null,
    priority: mapPriorityToBackend(payload.priority),
    budget: payload.budget ?? null,
    whatsapp: payload.whatsapp ?? null,
    city: payload.city ?? null,
    notes,
  };
}

export function mapUpdateLeadPayload(payload: {
  status?: LeadStatus;
  priority?: LeadPriority;
  studentName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  budget?: number;
  notes?: string;
  assignedTo?: string;
  followUpDate?: string;
}) {
  const body: Record<string, unknown> = {};
  if (payload.studentName !== undefined) body.name = payload.studentName;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.whatsapp !== undefined) body.whatsapp = payload.whatsapp;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.city !== undefined) body.city = payload.city;
  if (payload.budget !== undefined) body.budget = payload.budget;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.followUpDate !== undefined) body.followUpDate = payload.followUpDate;
  if (payload.priority !== undefined) body.priority = mapPriorityToBackend(payload.priority);
  // Status changes use dedicated PATCH /leads/:id/status on backend
  return body;
}

export function mapBackendActivity(raw: unknown): LeadActivity {
  const a = raw as {
    id: string;
    leadId: string;
    type: string;
    description: string;
    userId?: string | null;
    createdAt: string | Date;
  };
  const typeMap: Record<string, LeadActivity["type"]> = {
    CALL: "call",
    WHATSAPP: "whatsapp",
    EMAIL: "email",
    NOTE: "note",
    STATUS_CHANGED: "status_change",
    CREATED: "status_change",
    ASSIGNED: "task",
  };
  return {
    id: a.id,
    leadId: a.leadId,
    type: typeMap[a.type] ?? "note",
    description: a.description,
    performedBy: a.userId ?? undefined,
    createdAt: new Date(a.createdAt).toISOString(),
  };
}

export function mapBackendFollowUp(raw: unknown): FollowupTask {
  const f = raw as {
    id: string;
    leadId: string;
    dueAt: string | Date;
    priority: string;
    status: string;
    notes?: string | null;
    createdAt?: string | Date;
  };
  const statusMap: Record<string, FollowupTask["status"]> = {
    PENDING: "pending",
    COMPLETED: "completed",
    SNOOZED: "snoozed",
    CANCELLED: "cancelled",
    OVERDUE: "pending",
  };
  return {
    id: f.id,
    leadId: f.leadId,
    dueDate: new Date(f.dueAt).toISOString(),
    priority: mapPriorityFromBackend(f.priority),
    status: statusMap[f.status] ?? "pending",
    notes: f.notes ?? undefined,
    scheduledAt: new Date(f.dueAt).toISOString(),
    createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : undefined,
  };
}

// --- Partners ---------------------------------------------------------------

export function mapPartnerStatusFromBackend(status: string): PartnerStatus {
  const map: Record<string, PartnerStatus> = {
    PENDING: "pending",
    ACTIVE: "active",
    SUSPENDED: "suspended",
    REJECTED: "rejected",
  };
  return map[status] ?? (status.toLowerCase() as PartnerStatus);
}

export function mapBackendPartner(raw: unknown): Partner {
  const p = raw as {
    id: string;
    academyName: string;
    partnerName?: string;
    ownerName?: string;
    email: string;
    mobile?: string;
    address?: string | null;
    logoUrl?: string | null;
    status: string;
    commissionType?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  return {
    id: p.id,
    academyName: p.academyName,
    partnerName: p.partnerName,
    ownerName: p.ownerName,
    email: p.email,
    mobile: p.mobile,
    phone: p.mobile,
    logo: p.logoUrl ?? undefined,
    status: mapPartnerStatusFromBackend(p.status),
    commissionType:
      p.commissionType === "FLAT" || p.commissionType?.toLowerCase() === "flat"
        ? "flat"
        : "percentage",
    contact: { address: p.address ?? undefined, phone: p.mobile },
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
  };
}

// --- Commissions ------------------------------------------------------------

export function mapPayoutStatusFromBackend(status: string): PayoutStatus {
  const map: Record<string, PayoutStatus> = {
    PENDING: "pending",
    APPROVED: "approved",
    PAID: "paid",
    CANCELLED: "rejected",
  };
  return map[status] ?? (status.toLowerCase() as PayoutStatus);
}

export function mapBackendCommission(raw: unknown): CommissionRecord {
  const c = raw as {
    id: string;
    partnerId: string;
    admissionId: string;
    baseAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: string;
    paidAt?: string | Date | null;
    createdAt?: string | Date;
  };
  const amount = Number(c.commissionAmount);
  const payoutStatus = mapPayoutStatusFromBackend(c.status);
  return {
    id: c.id,
    partnerId: c.partnerId,
    admissionId: c.admissionId,
    admissionFee: Number(c.baseAmount),
    commissionRate: Number(c.commissionRate),
    earnedAmount: amount,
    pendingAmount:
      payoutStatus === "pending" || payoutStatus === "approved" ? amount : 0,
    paidAmount: payoutStatus === "paid" ? amount : 0,
    payoutStatus,
    payoutDate: c.paidAt ? new Date(c.paidAt).toISOString() : undefined,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
  };
}

/** Derive summary KPIs client-side when GET /commissions/summary is unavailable. */
export function summarizeCommissions(records: CommissionRecord[]): CommissionSummary {
  let totalEarned = 0;
  let pendingPayout = 0;
  let totalPaid = 0;
  let lastPayoutDate: string | undefined;

  for (const r of records) {
    totalEarned += r.earnedAmount ?? 0;
    pendingPayout += r.pendingAmount ?? 0;
    totalPaid += r.paidAmount ?? 0;
    if (r.payoutStatus === "paid" && r.payoutDate) {
      if (!lastPayoutDate || r.payoutDate > lastPayoutDate) {
        lastPayoutDate = r.payoutDate;
      }
    }
  }

  return { totalEarned, pendingPayout, totalPaid, lastPayoutDate };
}
