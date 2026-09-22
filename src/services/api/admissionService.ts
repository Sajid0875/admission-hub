import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type { Admission, PaymentStatus, PaymentMode } from "@/types/admission";

/**
 * Seed Admissions Data
 * Converted leads that generated admissions records.
 */
const SEED_ADMISSIONS: Admission[] = [
  {
    id: "adm_001",
    leadId: "lead_005",
    studentName: "Hassan Tahir",
    studentId: "STU-2026-081",
    courseId: "course_fs",
    courseName: "Full Stack Software Engineering",
    fee: 55000,
    amountPaid: 55000,
    paymentMode: "bank_transfer",
    paymentStatus: "full",
    joiningDate: "2026-09-01",
    partnerId: "partner_001",
    commissionAmount: 5500,
    remarks: "Full tuition paid via direct NEFT. Batch FSD-2026-Q3.",
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: "adm_002",
    leadId: "lead_008",
    studentName: "Maryam Jamil",
    studentId: "STU-2026-082",
    courseId: "course_ds",
    courseName: "Data Science & AI Immersive",
    fee: 65000,
    amountPaid: 35000,
    paymentMode: "upi",
    paymentStatus: "partial",
    joiningDate: "2026-09-15",
    partnerId: "partner_001",
    commissionAmount: 3500,
    remarks: "First installment received. Second installment scheduled for Oct 15.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "adm_003",
    leadId: "lead_012",
    studentName: "Danish Irfan",
    studentId: "STU-2026-083",
    courseId: "course_cloud",
    courseName: "Cloud Architecture & DevOps",
    fee: 45000,
    amountPaid: 45000,
    paymentMode: "card",
    paymentStatus: "full",
    joiningDate: "2026-09-10",
    partnerId: "partner_001",
    commissionAmount: 4500,
    remarks: "Early bird discount applied. Verified enrollment.",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "adm_004",
    leadId: "lead_015",
    studentName: "Areeba Noor",
    studentId: "STU-2026-084",
    courseId: "course_ui",
    courseName: "UI/UX & Product Design",
    fee: 40000,
    amountPaid: 15000,
    paymentMode: "online",
    paymentStatus: "partial",
    joiningDate: "2026-09-20",
    partnerId: "partner_001",
    commissionAmount: 1500,
    remarks: "Seat confirmation deposit cleared.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

let localAdmissionsStore: Admission[] = [...SEED_ADMISSIONS];

export interface AdmissionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  paymentStatus?: PaymentStatus | "all";
  courseId?: string;
}

/**
 * Admissions API Service
 * TODO-CONTRACT: Endpoints pending backend provisioning.
 */
export const admissionService = {
  async getAdmissions(params: AdmissionQueryParams = {}): Promise<PaginatedResponse<Admission>> {
    const { page = 1, limit = 10, search = "", paymentStatus = "all" } = params;

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", String(limit));
    if (search.trim()) queryParams.set("search", search.trim());
    if (paymentStatus && paymentStatus !== "all") queryParams.set("paymentStatus", paymentStatus);

    try {
      return await apiClient.getPaginated<Admission>(`/admissions?${queryParams.toString()}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        let filtered = [...localAdmissionsStore];

        if (paymentStatus && paymentStatus !== "all") {
          filtered = filtered.filter((a) => a.paymentStatus === paymentStatus);
        }

        if (search.trim()) {
          const q = search.toLowerCase().trim();
          filtered = filtered.filter(
            (a) =>
              a.studentName.toLowerCase().includes(q) ||
              (a.studentId && a.studentId.toLowerCase().includes(q)) ||
              (a.courseName && a.courseName.toLowerCase().includes(q))
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
      }
      throw err;
    }
  },

  async getAdmissionById(id: string): Promise<Admission> {
    try {
      return await apiClient.get<Admission>(`/admissions/${id}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const found = localAdmissionsStore.find((a) => a.id === id);
        if (found) return found;
      }
      throw err;
    }
  },

  async createAdmission(payload: Partial<Admission>): Promise<Admission> {
    try {
      return await apiClient.post<Admission>("/admissions", payload);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const newAdmission: Admission = {
          id: `adm_${Date.now()}`,
          studentName: payload.studentName || "New Student",
          courseId: payload.courseId || "course_ds",
          courseName: payload.courseName || "Data Science",
          fee: payload.fee || 50000,
          amountPaid: payload.amountPaid || 50000,
          paymentMode: payload.paymentMode || "online",
          paymentStatus: payload.paymentStatus || "full",
          joiningDate: payload.joiningDate || new Date().toISOString(),
          partnerId: "partner_001",
          ...payload,
          createdAt: new Date().toISOString(),
        };
        localAdmissionsStore = [newAdmission, ...localAdmissionsStore];
        return newAdmission;
      }
      throw err;
    }
  },
};
