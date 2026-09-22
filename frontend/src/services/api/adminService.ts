import { apiClient } from "./client";
import type { NormalizedError } from "@/types/api";
import type { Partner, PartnerStatus } from "@/types/partner";
import type { UserRole } from "@/types/auth";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import {
  mapBackendPartner,
  mapBackendRole,
  mapFrontendRoleToBackend,
  normalizePaginatedResponse,
  ROLE_PERMISSIONS,
} from "@/lib/mappers";

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  return isMockableOfflineError(err as NormalizedError);
}

// --- Partners Domain ---
const SEED_PARTNERS: Partner[] = [
  {
    id: "partner_001",
    academyName: "Apex Academy",
    ownerName: "David White",
    email: "admin@apexacademy.edu",
    phone: "+92 300 1234567",
    status: "active",
    commissionType: "percentage",
    commissionRate: 10,
    contact: { city: "Lahore", state: "Punjab" },
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "partner_002",
    academyName: "Horizon EdTech Institute",
    ownerName: "Sarah Connor",
    email: "sarah@horizoned.io",
    phone: "+91 98765 43210",
    status: "pending",
    commissionType: "percentage",
    commissionRate: 12,
    contact: { city: "Bangalore", state: "Karnataka" },
    createdAt: "2026-08-25T14:30:00Z",
  },
];

let localPartnersStore: Partner[] = [...SEED_PARTNERS];

export const partnerService = {
  async getPartners(): Promise<Partner[]> {
    try {
      const raw = await apiClient.getRawInstance().get("/partners");
      return normalizePaginatedResponse(raw.data, mapBackendPartner).data;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return [...localPartnersStore];
    }
  },

  /** Approve via PATCH /partners/:id/status { status: "ACTIVE" }. */
  async approvePartner(partnerId: string): Promise<Partner> {
    try {
      const res = await apiClient
        .getRawInstance()
        .patch<{ partner: unknown }>(`/partners/${partnerId}/status`, {
          status: "ACTIVE",
        });
      return mapBackendPartner(res.data.partner ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const idx = localPartnersStore.findIndex((p) => p.id === partnerId);
      if (idx !== -1) {
        localPartnersStore[idx] = { ...localPartnersStore[idx], status: "active" };
        return localPartnersStore[idx];
      }
      throw err;
    }
  },

  async updatePartnerStatus(partnerId: string, status: PartnerStatus): Promise<Partner> {
    const statusMap: Record<PartnerStatus, string> = {
      pending: "PENDING",
      active: "ACTIVE",
      suspended: "SUSPENDED",
      rejected: "REJECTED",
    };
    try {
      const res = await apiClient
        .getRawInstance()
        .patch<{ partner: unknown }>(`/partners/${partnerId}/status`, {
          status: statusMap[status],
        });
      return mapBackendPartner(res.data.partner ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const idx = localPartnersStore.findIndex((p) => p.id === partnerId);
      if (idx !== -1) {
        localPartnersStore[idx] = { ...localPartnersStore[idx], status };
        return localPartnersStore[idx];
      }
      throw err;
    }
  },
};

// --- Team Domain (maps to /users) ---
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  partnerId: string;
  status: "active" | "inactive";
  assignedLeadsCount?: number;
  lastActive?: string;
  createdAt: string;
  /** Returned once from POST /users invite — never persisted client-side. */
  temporaryPassword?: string;
}

const SEED_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "user_sarah",
    name: "Sarah Connor",
    email: "sarah.connor@apexacademy.edu",
    phone: "+92 300 9876543",
    role: "counselor",
    partnerId: "partner_001",
    status: "active",
    assignedLeadsCount: 18,
    lastActive: "10 mins ago",
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "user_elena",
    name: "Elena Ramos",
    email: "elena.ramos@apexacademy.edu",
    phone: "+92 321 4567890",
    role: "team_member",
    partnerId: "partner_001",
    status: "active",
    assignedLeadsCount: 12,
    lastActive: "1 hour ago",
    createdAt: "2026-03-15T11:00:00Z",
  },
];

let localTeamStore: TeamMember[] = [...SEED_TEAM_MEMBERS];

function mapBackendUserToTeamMember(raw: unknown): TeamMember {
  const u = raw as {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    partnerId?: string | null;
    status: string;
    lastLoginAt?: string | Date | null;
    createdAt?: string | Date;
  };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    role: mapBackendRole(u.role),
    partnerId: u.partnerId ?? "",
    status: u.status === "ACTIVE" ? "active" : "inactive",
    lastActive: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const teamService = {
  async getTeamMembers(partnerId?: string): Promise<TeamMember[]> {
    try {
      const q = new URLSearchParams();
      if (partnerId) q.set("partnerId", partnerId);
      const qs = q.toString() ? `?${q.toString()}` : "";
      const raw = await apiClient.getRawInstance().get(`/users${qs}`);
      return normalizePaginatedResponse(raw.data, mapBackendUserToTeamMember).data;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      if (partnerId) return localTeamStore.filter((m) => m.partnerId === partnerId);
      return [...localTeamStore];
    }
  },

  /** Invite via POST /users (returns temporaryPassword once). */
  async inviteTeamMember(
    payload: Omit<TeamMember, "id" | "assignedLeadsCount" | "lastActive" | "createdAt" | "temporaryPassword">
  ): Promise<TeamMember> {
    try {
      const res = await apiClient.getRawInstance().post<{
        user: unknown;
        temporaryPassword?: string;
      }>("/users", {
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        role: mapFrontendRoleToBackend(payload.role),
        partnerId: payload.partnerId || null,
      });
      const member = mapBackendUserToTeamMember(res.data.user ?? res.data);
      return {
        ...member,
        temporaryPassword: res.data.temporaryPassword,
      };
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const newMember: TeamMember = {
        id: `user_${Date.now()}`,
        ...payload,
        assignedLeadsCount: 0,
        lastActive: "Just invited",
        createdAt: new Date().toISOString(),
        temporaryPassword: "MockTemp!Pass1",
      };
      localTeamStore = [newMember, ...localTeamStore];
      return newMember;
    }
  },

  /** Toggle via PATCH /users/:id/status { status: ACTIVE|SUSPENDED }. */
  async toggleUserStatus(userId: string): Promise<TeamMember> {
    try {
      // Need current status — fetch then flip
      const members = await this.getTeamMembers();
      const current = members.find((m) => m.id === userId);
      const nextStatus = current?.status === "active" ? "SUSPENDED" : "ACTIVE";
      const res = await apiClient
        .getRawInstance()
        .patch<{ user: unknown }>(`/users/${userId}/status`, { status: nextStatus });
      return mapBackendUserToTeamMember(res.data.user ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const idx = localTeamStore.findIndex((u) => u.id === userId);
      if (idx !== -1) {
        localTeamStore[idx] = {
          ...localTeamStore[idx],
          status: localTeamStore[idx].status === "active" ? "inactive" : "active",
        };
        return localTeamStore[idx];
      }
      throw err;
    }
  },
};

// --- Notifications Domain ---
export interface NotificationItem {
  id: string;
  type: "lead_alert" | "payout_update" | "admission_confirmed" | "system_alert";
  title: string;
  message: string;
  read: boolean;
  /** ISO timestamp from API; UI formats for display. */
  timestamp: string;
  linkHref?: string;
}

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_1",
    type: "payout_update",
    title: "Payout Approved",
    message: "Super Admin approved your payout request for $2,500.",
    read: false,
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    linkHref: "/commissions",
  },
];

let localNotificationsStore: NotificationItem[] = [...SEED_NOTIFICATIONS];

/** Backend stores lowercase snake_case types via notify(); map to FE UI buckets. */
function mapNotificationUiType(rawType?: string): NotificationItem["type"] {
  const key = (rawType ?? "").toLowerCase();
  switch (key) {
    case "lead_assigned":
    case "lead_status_changed":
    case "followup_due":
    case "followup_overdue":
      return "lead_alert";
    case "commission_approved":
    case "commission_paid":
    case "payment_received":
      return "payout_update";
    case "admission_created":
    case "admission_verified":
      return "admission_confirmed";
    default:
      return "system_alert";
  }
}

function mapNotificationLink(
  referenceType?: string | null,
  referenceId?: string | null
): string | undefined {
  if (!referenceType || !referenceId) {
    // List pages when we only know the entity family
    if (referenceType === "commission") return "/commissions";
    if (referenceType === "admission") return "/admissions";
    if (referenceType === "partner") return "/partners";
    return undefined;
  }
  switch (referenceType) {
    case "lead":
      return `/leads/${referenceId}`;
    case "admission":
      return "/admissions";
    case "commission":
      return "/commissions";
    case "partner":
      return "/partners";
    default:
      return undefined;
  }
}

export function mapBackendNotification(raw: unknown): NotificationItem {
  const n = raw as {
    id: string;
    type?: string;
    title?: string;
    body?: string;
    message?: string;
    isRead?: boolean;
    readAt?: string | Date | null;
    createdAt?: string | Date;
    referenceType?: string | null;
    referenceId?: string | null;
  };
  const createdAt = n.createdAt ? new Date(n.createdAt).toISOString() : "";
  return {
    id: n.id,
    type: mapNotificationUiType(n.type),
    title: n.title ?? "Notification",
    message: n.message ?? n.body ?? "",
    read: n.isRead === true || Boolean(n.readAt),
    timestamp: createdAt,
    linkHref: mapNotificationLink(n.referenceType, n.referenceId),
  };
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const raw = await apiClient.getRawInstance().get("/notifications?page=1&limit=50");
      return normalizePaginatedResponse(raw.data, mapBackendNotification).data;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return [...localNotificationsStore];
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient
        .getRawInstance()
        .get<{ unreadCount?: number }>("/notifications/unread-count");
      return Number(res.data?.unreadCount ?? 0);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return localNotificationsStore.filter((n) => !n.read).length;
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const idx = localNotificationsStore.findIndex((n) => n.id === id);
      if (idx !== -1) localNotificationsStore[idx].read = true;
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch("/notifications/read-all");
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      localNotificationsStore = localNotificationsStore.map((n) => ({ ...n, read: true }));
    }
  },
};

// --- Reports Domain ---
export interface ReportData {
  conversionRate: string;
  totalInquiries: number;
  totalAdmissions: number;
  grossTuitionVolume: number;
  averageDealCycleDays: number;
  intakeTrend: { month: string; leads: number; admissions: number }[];
  sourceBreakdown: { source: string; percentage: number }[];
}

export const reportService = {
  async getReportsData(partnerId?: string): Promise<ReportData> {
    try {
      // Use conversion + dashboard aggregates from backend reports module
      const q = partnerId ? `?partnerId=${partnerId}` : "";
      const [conversion, dashboard] = await Promise.all([
        apiClient.getRawInstance().get(`/reports/conversion${q}`),
        apiClient.getRawInstance().get(`/reports/dashboard${q}`),
      ]);

      const conv = conversion.data as {
        totalLeads?: number;
        totalAdmissions?: number;
        conversionRate?: number;
      };
      const dash = dashboard.data as {
        totalLeads?: number;
        totalAdmissions?: number;
        revenue?: number;
      };

      const totalInquiries = conv.totalLeads ?? dash.totalLeads ?? 0;
      const totalAdmissions = conv.totalAdmissions ?? dash.totalAdmissions ?? 0;
      const rate =
        conv.conversionRate != null
          ? `${(conv.conversionRate * (conv.conversionRate <= 1 ? 100 : 1)).toFixed(1)}%`
          : totalInquiries
            ? `${((totalAdmissions / totalInquiries) * 100).toFixed(1)}%`
            : "0%";

      return {
        conversionRate: rate,
        totalInquiries,
        totalAdmissions,
        grossTuitionVolume: Number(dash.revenue ?? 0),
        averageDealCycleDays: 0,
        intakeTrend: [],
        sourceBreakdown: [],
      };
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        conversionRate: "24.6%",
        totalInquiries: 1248,
        totalAdmissions: 120,
        grossTuitionVolume: 5400000,
        averageDealCycleDays: 8.4,
        intakeTrend: [
          { month: "May", leads: 180, admissions: 14 },
          { month: "Jun", leads: 240, admissions: 22 },
          { month: "Jul", leads: 310, admissions: 28 },
        ],
        sourceBreakdown: [
          { source: "Website Ingestion", percentage: 42 },
          { source: "Student Referral", percentage: 28 },
        ],
      };
    }
  },

  /**
   * Download CSV via GET /reports/export?report=leads|admissions
   * Scope is enforced server-side (SA = all, PA = own partner).
   */
  async exportCsv(
    report: "leads" | "admissions",
    opts: { from?: string; to?: string } = {}
  ): Promise<{ filename: string }> {
    const q = new URLSearchParams();
    q.set("report", report);
    if (opts.from) q.set("from", opts.from);
    if (opts.to) q.set("to", opts.to);

    const res = await apiClient.getRawInstance().get(`/reports/export?${q.toString()}`, {
      responseType: "blob",
    });

    const disposition = String(res.headers?.["content-disposition"] ?? "");
    const match = /filename="?([^"]+)"?/i.exec(disposition);
    const filename = match?.[1] ?? `${report}-export.csv`;

    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    return { filename };
  },
};

// --- Audit Domain ---
export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  status: "success" | "warning" | "failure";
  timestamp: string;
  details: string;
}

const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "audit_1",
    actor: "Alex Vance (Super Admin)",
    action: "payout:approve",
    entity: "Commission",
    entityId: "comm_001",
    ipAddress: "192.168.1.42",
    status: "success",
    timestamp: "2026-09-15T14:22:10Z",
    details: "Approved payout of $5,500 to Apex Academy.",
  },
];

function mapBackendAuditLog(raw: unknown): AuditLogEntry {
  const a = raw as {
    id: string;
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string | null;
    ipAddress?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    metadata?: unknown;
    createdAt?: string | Date;
  };
  const detailsPayload = a.newValue ?? a.oldValue ?? a.metadata ?? {};
  return {
    id: a.id,
    actor: a.userId ?? "system",
    action: a.action,
    entity: a.entityType ?? "Unknown",
    entityId: a.entityId ?? "",
    ipAddress: a.ipAddress ?? "",
    status: "success",
    timestamp: a.createdAt ? new Date(a.createdAt).toISOString() : "",
    details:
      typeof detailsPayload === "string"
        ? detailsPayload
        : JSON.stringify(detailsPayload),
  };
}

export const auditService = {
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      const raw = await apiClient.getRawInstance().get("/audit-logs");
      return normalizePaginatedResponse(raw.data, mapBackendAuditLog).data;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return [...SEED_AUDIT_LOGS];
    }
  },
};

// Re-export permissions helper for callers that previously imported from auth mocks
export { ROLE_PERMISSIONS };
