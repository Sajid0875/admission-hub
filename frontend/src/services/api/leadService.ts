import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type {
  Lead,
  LeadQueryParams,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadActivity,
  FollowupTask,
} from "@/types/lead";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import {
  mapBackendLead,
  mapCreateLeadPayload,
  mapUpdateLeadPayload,
  mapBackendActivity,
  mapBackendFollowUp,
  mapLeadStatusToBackend,
  mapPriorityToBackend,
  normalizePaginatedResponse,
} from "@/lib/mappers";

/**
 * Initial seed leads for mock mode only
 */
const SEED_LEADS: Lead[] = [
  {
    id: "lead_001",
    _id: "lead_001",
    studentName: "Aarav Sharma",
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "aarav.sharma@example.com",
    city: "Mumbai",
    courseId: "course_ds",
    courseInterest: "Data Science & AI",
    source: "website",
    budget: 45000,
    priority: "high",
    status: "new",
    leadScore: 88,
    partnerId: "partner_001",
    assignedTo: "user_sarah",
    assignedUserName: "Sarah Connor",
    isDuplicate: false,
    followUpDate: new Date(Date.now() + 86400000).toISOString(),
    notes: "Attended webinar, requested scholarship details and fee schedule.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "lead_002",
    _id: "lead_002",
    studentName: "Meera Patel",
    phone: "+91 98111 22233",
    whatsapp: "+91 98111 22233",
    email: "meera.patel@example.com",
    city: "Delhi",
    courseId: "course_fs",
    courseInterest: "Full Stack Development",
    source: "walk-in",
    budget: 60000,
    priority: "medium",
    status: "contacted",
    leadScore: 72,
    partnerId: "partner_001",
    assignedTo: "user_sarah",
    assignedUserName: "Sarah Connor",
    isDuplicate: false,
    followUpDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    notes: "Looking for weekend batch timings.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "lead_003",
    _id: "lead_003",
    studentName: "Zainab Rashid",
    phone: "+92 300 1234567",
    whatsapp: "+92 300 1234567",
    email: "zainab.r@example.com",
    city: "Lahore",
    courseId: "course_ds",
    courseInterest: "Data Science & AI",
    source: "referral",
    budget: 50000,
    priority: "urgent",
    status: "follow_up",
    leadScore: 94,
    partnerId: "partner_001",
    assignedTo: "user_sarah",
    assignedUserName: "Sarah Connor",
    isDuplicate: false,
    followUpDate: new Date().toISOString(),
    notes: "High conversion probability. Needs discount confirmation before enrolling.",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "lead_004",
    _id: "lead_004",
    studentName: "Omar Farooq",
    phone: "+92 321 7654321",
    whatsapp: "+92 321 7654321",
    email: "omar.farooq@example.com",
    city: "Karachi",
    courseId: "course_cloud",
    courseInterest: "Cloud Architecture",
    source: "social_media",
    budget: 35000,
    priority: "medium",
    status: "demo",
    leadScore: 65,
    partnerId: "partner_001",
    assignedTo: "user_elena",
    isDuplicate: false,
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
  },
  {
    id: "lead_005",
    _id: "lead_005",
    studentName: "Priya Nair",
    phone: "+91 99887 76655",
    email: "priya.nair@example.com",
    city: "Bangalore",
    courseInterest: "UI/UX Design",
    source: "website",
    budget: 40000,
    priority: "low",
    status: "new",
    leadScore: 55,
    partnerId: "partner_001",
    isDuplicate: false,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

let localLeadsStore: Lead[] = [...SEED_LEADS];

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  const normErr = err as NormalizedError;
  return isMockableOfflineError(normErr);
}

function preferMocks(): boolean {
  return areMocksEnabled();
}

export const leadService = {
  async getLeads(params: LeadQueryParams = {}): Promise<PaginatedResponse<Lead>> {
    const { page = 1, limit = 10, search = "", status = "all", priority = "all" } = params;

    const runMock = (): PaginatedResponse<Lead> => {
      let filtered = [...localLeadsStore];
      if (status && status !== "all") filtered = filtered.filter((l) => l.status === status);
      if (priority && priority !== "all") filtered = filtered.filter((l) => l.priority === priority);
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (l) =>
            l.studentName.toLowerCase().includes(q) ||
            l.phone.toLowerCase().includes(q) ||
            (l.email && l.email.toLowerCase().includes(q)) ||
            (l.courseInterest && l.courseInterest.toLowerCase().includes(q)) ||
            (l.city && l.city.toLowerCase().includes(q))
        );
      }
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const offset = (page - 1) * limit;
      return {
        success: true,
        data: filtered.slice(offset, offset + limit),
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    };

    if (preferMocks()) return runMock();

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", String(limit));
    if (search.trim()) queryParams.set("search", search.trim());
    if (status && status !== "all") queryParams.set("status", mapLeadStatusToBackend(status));
    if (priority && priority !== "all") queryParams.set("priority", mapPriorityToBackend(priority));

    try {
      const raw = await apiClient.getRawInstance().get(`/leads?${queryParams.toString()}`);
      return normalizePaginatedResponse(raw.data, mapBackendLead);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return runMock();
    }
  },

  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    if (preferMocks()) {
      const exists = localLeadsStore.some(
        (l) => l.phone.replace(/\D/g, "") === payload.phone.replace(/\D/g, "")
      );
      if (exists) {
        const duplicateError: NormalizedError = {
          isNormalized: true,
          code: "DUPLICATE_LEAD",
          statusCode: 409,
          message: "This phone number already exists as a lead for this partner",
        };
        throw duplicateError;
      }
      const newLead: Lead = {
        id: `lead_${Date.now()}`,
        _id: `lead_${Date.now()}`,
        studentName: payload.studentName,
        phone: payload.phone,
        whatsapp: payload.whatsapp || payload.phone,
        email: payload.email,
        city: payload.city,
        courseId: payload.courseId,
        courseInterest: payload.courseInterest || "General Course Inquiry",
        source: payload.source || "manual",
        budget: payload.budget,
        priority: payload.priority || "medium",
        status: "new",
        leadScore: Math.floor(Math.random() * 30) + 60,
        partnerId: "partner_001",
        isDuplicate: false,
        createdAt: new Date().toISOString(),
      };
      localLeadsStore = [newLead, ...localLeadsStore];
      return newLead;
    }

    try {
      const res = await apiClient.getRawInstance().post<{ lead: unknown }>("/leads", mapCreateLeadPayload(payload));
      const leadPayload = (res.data as { lead?: unknown }).lead ?? res.data;
      return mapBackendLead(leadPayload);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      throw err;
    }
  },

  async getLeadById(id: string): Promise<Lead> {
    try {
      const res = await apiClient.getRawInstance().get<{ lead: unknown }>(`/leads/${id}`);
      return mapBackendLead(res.data.lead ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const found = localLeadsStore.find((l) => l.id === id || l._id === id);
      if (found) return found;
      throw err;
    }
  },

  async updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
    try {
      // Status changes use dedicated backend route
      if (payload.status) {
        await apiClient.getRawInstance().patch(`/leads/${id}/status`, {
          status: mapLeadStatusToBackend(payload.status),
        });
      }
      if (payload.assignedTo) {
        await apiClient.getRawInstance().patch(`/leads/${id}/assign`, {
          assignedTo: payload.assignedTo,
        });
      }

      const body = mapUpdateLeadPayload(payload);
      if (Object.keys(body).length > 0) {
        const res = await apiClient.getRawInstance().patch<{ lead: unknown }>(`/leads/${id}`, body);
        return mapBackendLead(res.data.lead ?? res.data);
      }

      return await this.getLeadById(id);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const index = localLeadsStore.findIndex((l) => l.id === id || l._id === id);
      if (index !== -1) {
        localLeadsStore[index] = {
          ...localLeadsStore[index],
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        return localLeadsStore[index];
      }
      throw err;
    }
  },

  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    try {
      const res = await apiClient.getRawInstance().get(`/leads/${leadId}/activities`);
      const page = normalizePaginatedResponse(res.data, mapBackendActivity);
      return page.data;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return [
        {
          id: `act_${leadId}_1`,
          leadId,
          type: "status_change",
          description: "Lead entered intake pipeline with status 'new'",
          performedBy: "System Ingestion",
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ];
    }
  },

  async getLeadFollowups(leadId: string): Promise<FollowupTask[]> {
    try {
      const res = await apiClient.getRawInstance().get(`/leads/${leadId}/followups`);
      const page = normalizePaginatedResponse(res.data, mapBackendFollowUp);
      return page.data;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return [
        {
          id: `task_${leadId}_1`,
          leadId,
          dueDate: new Date(Date.now() + 3600000 * 4).toISOString(),
          priority: "urgent",
          status: "pending",
          notes: "Call student to confirm enrollment decision.",
          scheduledAt: new Date(Date.now() + 3600000 * 4).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  /** Global follow-up agenda via GET /api/v1/followups */
  async listFollowups(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<FollowupTask>> {
    try {
      const query: Record<string, string | number> = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
      };
      if (params?.status && params.status !== "all") {
        query.status =
          params.status === "pending"
            ? "PENDING"
            : params.status === "completed"
              ? "COMPLETED"
              : params.status.toUpperCase();
      }
      const res = await apiClient.getRawInstance().get("/followups", { params: query });
      return normalizePaginatedResponse(res.data, mapBackendFollowUp);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return { success: true, data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } };
    }
  },

  /**
   * Create follow-up via POST /api/v1/followups (not nested under leads).
   */
  async createFollowup(
    leadId: string,
    task: Omit<FollowupTask, "id" | "leadId">
  ): Promise<FollowupTask> {
    try {
      // datetime-local values lack seconds/offset; backend Zod requires ISO-8601.
      const dueRaw = task.dueDate || new Date(Date.now() + 86400000).toISOString();
      const dueAt = new Date(dueRaw.length === 16 ? `${dueRaw}:00` : dueRaw).toISOString();

      const res = await apiClient.getRawInstance().post<{ followUp: unknown }>("/followups", {
        leadId,
        dueAt,
        priority: mapPriorityToBackend(task.priority),
        notes: task.notes ?? null,
      });
      return mapBackendFollowUp((res.data as { followUp?: unknown }).followUp ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        id: `task_${Date.now()}`,
        leadId,
        ...task,
        createdAt: new Date().toISOString(),
      };
    }
  },
};
