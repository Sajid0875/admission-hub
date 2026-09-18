import { apiClient } from "./client";
import type { PaginatedResponse, PaginatedMeta, NormalizedError } from "@/types/api";
import type {
  Lead,
  LeadQueryParams,
  CreateLeadPayload,
  UpdateLeadPayload,
  LeadActivity,
  FollowupTask,
} from "@/types/lead";

/**
 * Initial seed leads for development mode and fallback when backend gateway is offline
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
    assignedUserName: "Elena Ramos",
    isDuplicate: false,
    followUpDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    notes: "Demo scheduled for tomorrow 3:00 PM.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "lead_005",
    _id: "lead_005",
    studentName: "Hassan Tahir",
    phone: "+92 333 9988776",
    whatsapp: "+92 333 9988776",
    email: "hassan.t@example.com",
    city: "Islamabad",
    courseId: "course_fs",
    courseInterest: "Full Stack Development",
    source: "website",
    budget: 55000,
    priority: "high",
    status: "admitted",
    leadScore: 98,
    partnerId: "partner_001",
    assignedTo: "user_sarah",
    assignedUserName: "Sarah Connor",
    isDuplicate: false,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: "lead_006",
    _id: "lead_006",
    studentName: "Kavita Rao",
    phone: "+91 99000 11223",
    whatsapp: "+91 99000 11223",
    email: "kavita.rao@example.com",
    city: "Bangalore",
    courseId: "course_ui",
    courseInterest: "UI/UX Design Bootcamp",
    source: "google_ads",
    budget: 40000,
    priority: "low",
    status: "lost",
    leadScore: 32,
    partnerId: "partner_001",
    assignedTo: "user_elena",
    assignedUserName: "Elena Ramos",
    isDuplicate: false,
    notes: "Decided to pursue postgraduate degree instead.",
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
  },
];

// In-memory store for fallback operations
let localLeadsStore: Lead[] = [...SEED_LEADS];

/**
 * Lead API Service
 * Follows Keystone HLD/LLD contracts explicitly.
 * Missing/unspecified contracts are clearly marked with TODO-CONTRACT.
 */
export const leadService = {
  /**
   * GET /api/v1/leads
   * Confirmed backend contract:
   * Returns { success: true, data: Lead[], meta: { page, limit, total } }
   * Scoped by tenantScope.middleware.js on backend.
   */
  async getLeads(params: LeadQueryParams = {}): Promise<PaginatedResponse<Lead>> {
    const { page = 1, limit = 10, search = "", status = "all", priority = "all" } = params;

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", String(limit));
    if (search.trim()) queryParams.set("search", search.trim());
    if (status && status !== "all") queryParams.set("status", status);
    if (priority && priority !== "all") queryParams.set("priority", priority);

    try {
      const response = await apiClient.getPaginated<Lead>(`/leads?${queryParams.toString()}`);
      return response;
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      // If network error / 404 (e.g. backend server not currently running on localhost:5000), fallback to memory store
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        let filtered = [...localLeadsStore];

        if (status && status !== "all") {
          filtered = filtered.filter((l) => l.status === status);
        }

        if (priority && priority !== "all") {
          filtered = filtered.filter((l) => l.priority === priority);
        }

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
        const paginatedData = filtered.slice(offset, offset + limit);

        return {
          success: true,
          data: paginatedData,
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
      throw err;
    }
  },

  /**
   * POST /api/v1/leads
   * Confirmed backend contract:
   * Accepts: studentName, phone, email, courseId, source, priority, budget
   * Returns: { success: true, data: { _id, partnerId, status, leadScore, isDuplicate, createdAt, ... } }
   * 409 Duplicate: { error: { code: 'DUPLICATE_LEAD', message: '...' } }
   */
  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    try {
      const result = await apiClient.post<Lead>("/leads", payload);
      return result;
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      // If network error in local development, emulate creation in fallback store
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        // Emulate duplicate check if phone already exists
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
          leadScore: Math.floor(Math.random() * 30) + 60, // Server-generated
          partnerId: "partner_001",
          isDuplicate: false,
          createdAt: new Date().toISOString(),
        };

        localLeadsStore = [newLead, ...localLeadsStore];
        return newLead;
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/leads/:id
   * TODO-CONTRACT: Single lead retrieval endpoint
   */
  async getLeadById(id: string): Promise<Lead> {
    try {
      return await apiClient.get<Lead>(`/leads/${id}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const found = localLeadsStore.find((l) => l.id === id || l._id === id);
        if (found) return found;
        // Fallback default fixture if id is new
        return {
          id,
          _id: id,
          studentName: "Lead " + id,
          phone: "+91 98765 00000",
          whatsapp: "+91 98765 00000",
          email: "student@example.com",
          courseInterest: "Computer Science & Engineering",
          priority: "high",
          status: "new",
          leadScore: 75,
          partnerId: "partner_001",
          createdAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * PATCH /api/v1/leads/:id
   * TODO-CONTRACT: Lead update endpoint
   */
  async updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
    try {
      return await apiClient.patch<Lead>(`/leads/${id}`, payload);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const index = localLeadsStore.findIndex((l) => l.id === id || l._id === id);
        if (index !== -1) {
          localLeadsStore[index] = {
            ...localLeadsStore[index],
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          return localLeadsStore[index];
        }
        return {
          id,
          _id: id,
          studentName: payload.studentName || "Updated Lead",
          phone: payload.phone || "+91 00000 00000",
          priority: payload.priority || "medium",
          status: payload.status || "contacted",
          ...payload,
          updatedAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/leads/:id/activities
   * TODO-CONTRACT: Timeline activities for lead workspace
   */
  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    try {
      return await apiClient.get<LeadActivity[]>(`/leads/${leadId}/activities`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        return [
          {
            id: `act_${leadId}_1`,
            leadId,
            type: "status_change",
            description: "Lead entered intake pipeline with status 'new'",
            performedBy: "System Ingestion",
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
          {
            id: `act_${leadId}_2`,
            leadId,
            type: "call",
            description: "Initial introductory call completed. Student requested fee structure.",
            performedBy: "Sarah Connor (Counselor)",
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            id: `act_${leadId}_3`,
            leadId,
            type: "whatsapp",
            description: "Sent official prospectus and syllabus breakdown via WhatsApp.",
            performedBy: "Sarah Connor (Counselor)",
            createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
          },
        ];
      }
      throw err;
    }
  },

  /**
   * GET /api/v1/leads/:id/followups
   * TODO-CONTRACT: Follow-up tasks for lead
   */
  async getLeadFollowups(leadId: string): Promise<FollowupTask[]> {
    try {
      return await apiClient.get<FollowupTask[]>(`/leads/${leadId}/followups`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        return [
          {
            id: `task_${leadId}_1`,
            leadId,
            dueDate: new Date(Date.now() + 3600000 * 4).toISOString(),
            priority: "urgent",
            status: "pending",
            notes: "Call student to confirm enrollment decision and discuss payment plan.",
            scheduledAt: new Date(Date.now() + 3600000 * 4).toISOString(),
            createdAt: new Date().toISOString(),
          },
        ];
      }
      throw err;
    }
  },

  /**
   * POST /api/v1/leads/:id/followups
   * TODO-CONTRACT: Add follow-up task
   */
  async createFollowup(leadId: string, task: Omit<FollowupTask, "id" | "leadId">): Promise<FollowupTask> {
    try {
      return await apiClient.post<FollowupTask>(`/leads/${leadId}/followups`, task);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        return {
          id: `task_${Date.now()}`,
          leadId,
          ...task,
          createdAt: new Date().toISOString(),
        };
      }
      throw err;
    }
  },
};
