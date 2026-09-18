import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type { Partner, PartnerStatus } from "@/types/partner";
import type { AuthUser, UserRole } from "@/types/auth";

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
  {
    id: "partner_003",
    academyName: "Beacon Learning Hub",
    ownerName: "Marcus Vance",
    email: "director@beaconhub.org",
    phone: "+1 415 555 0192",
    status: "pending",
    commissionType: "percentage",
    commissionRate: 15,
    contact: { city: "San Francisco", state: "CA" },
    createdAt: "2026-09-02T11:20:00Z",
  },
  {
    id: "partner_004",
    academyName: "Nexus Digital Academy",
    ownerName: "Kavita Rao",
    email: "admin@nexusacademy.in",
    phone: "+91 99000 11223",
    status: "active",
    commissionType: "percentage",
    commissionRate: 10,
    contact: { city: "Hyderabad", state: "Telangana" },
    createdAt: "2026-03-10T08:15:00Z",
  },
];

let localPartnersStore: Partner[] = [...SEED_PARTNERS];

export const partnerService = {
  async getPartners(): Promise<Partner[]> {
    try {
      return await apiClient.get<Partner[]>("/partners");
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        return [...localPartnersStore];
      }
      throw err;
    }
  },

  async approvePartner(partnerId: string): Promise<Partner> {
    try {
      return await apiClient.patch<Partner>(`/partners/${partnerId}/approve`, { status: "active" });
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const idx = localPartnersStore.findIndex((p) => p.id === partnerId);
        if (idx !== -1) {
          localPartnersStore[idx] = { ...localPartnersStore[idx], status: "active" };
          return localPartnersStore[idx];
        }
      }
      throw err;
    }
  },

  async updatePartnerStatus(partnerId: string, status: PartnerStatus): Promise<Partner> {
    try {
      return await apiClient.patch<Partner>(`/partners/${partnerId}/status`, { status });
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const idx = localPartnersStore.findIndex((p) => p.id === partnerId);
        if (idx !== -1) {
          localPartnersStore[idx] = { ...localPartnersStore[idx], status };
          return localPartnersStore[idx];
        }
      }
      throw err;
    }
  },
};

// --- Team Domain ---
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
  {
    id: "user_marcus",
    name: "Marcus Brody",
    email: "marcus.b@whitedavid23.com",
    role: "support",
    partnerId: "partner_001",
    status: "active",
    assignedLeadsCount: 0,
    lastActive: "Yesterday",
    createdAt: "2026-04-10T14:00:00Z",
  },
];

let localTeamStore: TeamMember[] = [...SEED_TEAM_MEMBERS];

export const teamService = {
  async getTeamMembers(partnerId?: string): Promise<TeamMember[]> {
    try {
      const q = partnerId ? `?partnerId=${partnerId}` : "";
      return await apiClient.get<TeamMember[]>(`/team${q}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        if (partnerId) {
          return localTeamStore.filter((m) => m.partnerId === partnerId);
        }
        return [...localTeamStore];
      }
      throw err;
    }
  },

  async inviteTeamMember(payload: Omit<TeamMember, "id" | "assignedLeadsCount" | "lastActive" | "createdAt">): Promise<TeamMember> {
    try {
      return await apiClient.post<TeamMember>("/team/invite", payload);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const newMember: TeamMember = {
          id: `user_${Date.now()}`,
          ...payload,
          assignedLeadsCount: 0,
          lastActive: "Just invited",
          createdAt: new Date().toISOString(),
        };
        localTeamStore = [newMember, ...localTeamStore];
        return newMember;
      }
      throw err;
    }
  },

  async toggleUserStatus(userId: string): Promise<TeamMember> {
    try {
      return await apiClient.patch<TeamMember>(`/team/${userId}/toggle-status`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const idx = localTeamStore.findIndex((u) => u.id === userId);
        if (idx !== -1) {
          localTeamStore[idx] = {
            ...localTeamStore[idx],
            status: localTeamStore[idx].status === "active" ? "inactive" : "active",
          };
          return localTeamStore[idx];
        }
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
  timestamp: string;
  linkHref?: string;
}

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_1",
    type: "payout_update",
    title: "Payout Approved",
    message: "Super Admin approved your payout request for $2,500. Batch #SET-882.",
    read: false,
    timestamp: "25 minutes ago",
    linkHref: "/commissions",
  },
  {
    id: "notif_2",
    type: "lead_alert",
    title: "High-Priority Follow-up Due",
    message: "Zainab Rashid follow-up call is scheduled for today 2:00 PM.",
    read: false,
    timestamp: "1 hour ago",
    linkHref: "/leads/lead_003",
  },
  {
    id: "notif_3",
    type: "admission_confirmed",
    title: "Admission Enrollment Confirmed",
    message: "Hassan Tahir completed enrollment fee in Full Stack Engineering.",
    read: true,
    timestamp: "Yesterday",
    linkHref: "/admissions",
  },
];

let localNotificationsStore: NotificationItem[] = [...SEED_NOTIFICATIONS];

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      return await apiClient.get<NotificationItem[]>("/notifications");
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        return [...localNotificationsStore];
      }
      throw err;
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const idx = localNotificationsStore.findIndex((n) => n.id === id);
        if (idx !== -1) {
          localNotificationsStore[idx].read = true;
        }
        return;
      }
      throw err;
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch("/notifications/read-all");
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        localNotificationsStore = localNotificationsStore.map((n) => ({ ...n, read: true }));
        return;
      }
      throw err;
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
      const q = partnerId ? `?partnerId=${partnerId}` : "";
      return await apiClient.get<ReportData>(`/reports${q}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
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
            { month: "Aug", leads: 290, admissions: 26 },
            { month: "Sep", leads: 228, admissions: 30 },
          ],
          sourceBreakdown: [
            { source: "Website Ingestion", percentage: 42 },
            { source: "Student Referral", percentage: 28 },
            { source: "Campus Walk-in", percentage: 18 },
            { source: "Social Ads", percentage: 12 },
          ],
        };
      }
      throw err;
    }
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
    details: "Approved payout of $5,500 to Apex Academy (partner_001).",
  },
  {
    id: "audit_2",
    actor: "Sarah Connor (Counselor)",
    action: "lead:create",
    entity: "Lead",
    entityId: "lead_001",
    ipAddress: "192.168.2.115",
    status: "success",
    timestamp: "2026-09-15T12:05:32Z",
    details: "Ingested new lead Aarav Sharma with priority 'high'.",
  },
  {
    id: "audit_3",
    actor: "System Webhook",
    action: "lead:duplicate_check",
    entity: "Lead",
    entityId: "lead_dup_temp",
    ipAddress: "10.0.4.12",
    status: "warning",
    timestamp: "2026-09-14T18:40:02Z",
    details: "Rejected duplicate phone submission (+91 98765 43210) for tenant partner_001.",
  },
  {
    id: "audit_4",
    actor: "Alex Vance (Super Admin)",
    action: "partner:approve",
    entity: "Partner",
    entityId: "partner_001",
    ipAddress: "192.168.1.42",
    status: "success",
    timestamp: "2026-09-10T09:15:00Z",
    details: "Activated partner tenant Apex Academy.",
  },
];

export const auditService = {
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    try {
      return await apiClient.get<AuditLogEntry[]>("/audit");
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        return [...SEED_AUDIT_LOGS];
      }
      throw err;
    }
  },
};
