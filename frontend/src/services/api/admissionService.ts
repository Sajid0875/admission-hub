import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type { Admission, PaymentStatus, PaymentMode, VerificationStatus } from "@/types/admission";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import { normalizePaginatedResponse } from "@/lib/mappers";
import { courseService } from "./courseService";

export interface CourseOption {
  id: string;
  title: string;
  fee: number;
}

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
    verificationStatus: "verified",
    joiningDate: "2026-09-01",
    partnerId: "partner_001",
    commissionAmount: 5500,
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
    verificationStatus: "pending",
    joiningDate: "2026-09-15",
    partnerId: "partner_001",
    commissionAmount: 3500,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
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

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  return isMockableOfflineError(err as NormalizedError);
}

function mapBackendAdmission(raw: unknown): Admission {
  const a = raw as {
    id: string;
    leadId?: string | null;
    studentName?: string;
    name?: string;
    courseId?: string | null;
    totalFee?: number;
    fee?: number;
    amountPaid?: number;
    paymentStatus?: string;
    paymentMode?: string;
    verificationStatus?: string;
    joiningDate?: string | Date | null;
    partnerId?: string;
    createdAt?: string | Date;
  };
  const payMap: Record<string, PaymentStatus> = {
    UNPAID: "pending",
    PARTIAL: "partial",
    FULL: "full",
    PAID: "full",
    PENDING: "pending",
    REFUNDED: "refunded",
    CANCELLED: "cancelled",
  };
  const verifyMap: Record<string, VerificationStatus> = {
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected",
  };
  return {
    id: a.id,
    leadId: a.leadId ?? undefined,
    studentName: a.studentName ?? a.name ?? "Student",
    courseId: a.courseId ?? "",
    fee: Number(a.totalFee ?? a.fee ?? 0),
    amountPaid: Number(a.amountPaid ?? 0),
    paymentMode: (a.paymentMode?.toLowerCase() as PaymentMode) || "online",
    paymentStatus: payMap[a.paymentStatus ?? ""] ?? "pending",
    verificationStatus: verifyMap[a.verificationStatus ?? ""] ?? "pending",
    joiningDate: a.joiningDate
      ? new Date(a.joiningDate).toISOString()
      : new Date().toISOString(),
    partnerId: a.partnerId,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined,
  };
}

export const admissionService = {
  async listCourses(): Promise<CourseOption[]> {
    const page = await courseService.getCourses({ page: 1, limit: 50 });
    return page.data.map((c) => ({
      id: c.id,
      title: c.title,
      fee: c.fee,
    }));
  },

  async getAdmissions(params: AdmissionQueryParams = {}): Promise<PaginatedResponse<Admission>> {
    const { page = 1, limit = 10, search = "", paymentStatus = "all" } = params;

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", String(limit));
    if (search.trim()) queryParams.set("search", search.trim());
    if (paymentStatus && paymentStatus !== "all") {
      queryParams.set("paymentStatus", paymentStatus.toUpperCase());
    }

    try {
      const raw = await apiClient.getRawInstance().get(`/admissions?${queryParams.toString()}`);
      return normalizePaginatedResponse(raw.data, mapBackendAdmission);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;

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
  },

  async getAdmissionById(id: string): Promise<Admission> {
    try {
      const res = await apiClient.getRawInstance().get<{ admission: unknown }>(`/admissions/${id}`);
      return mapBackendAdmission(res.data.admission ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const found = localAdmissionsStore.find((a) => a.id === id);
      if (found) return found;
      throw err;
    }
  },

  async createAdmission(payload: Partial<Admission>): Promise<Admission> {
    try {
      const paymentMode = payload.paymentMode
        ? payload.paymentMode.toUpperCase().replace("-", "_")
        : undefined;
      const res = await apiClient.getRawInstance().post<{ admission: unknown }>("/admissions", {
        leadId: payload.leadId,
        courseId: payload.courseId,
        // Backend CreateAdmissionSchema expects `fee` (not totalFee).
        fee: payload.fee,
        studentName: payload.studentName,
        paymentMode,
        joiningDate: payload.joiningDate
          ? new Date(payload.joiningDate).toISOString()
          : undefined,
        remarks: payload.remarks ?? null,
      });
      return mapBackendAdmission(res.data.admission ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const newAdmission: Admission = {
        id: `adm_${Date.now()}`,
        studentName: payload.studentName || "New Student",
        courseId: payload.courseId || "course_ds",
        courseName: payload.courseName || "Data Science",
        fee: payload.fee || 50000,
        amountPaid: payload.amountPaid || 0,
        paymentMode: payload.paymentMode || "online",
        paymentStatus: payload.paymentStatus || "pending",
        verificationStatus: "pending",
        joiningDate: payload.joiningDate || new Date().toISOString(),
        partnerId: "partner_001",
        ...payload,
        createdAt: new Date().toISOString(),
      };
      localAdmissionsStore = [newAdmission, ...localAdmissionsStore];
      return newAdmission;
    }
  },

  async verifyAdmission(
    admissionId: string,
    verificationStatus: "VERIFIED" | "REJECTED" = "VERIFIED",
    remarks?: string
  ): Promise<Admission> {
    try {
      const res = await apiClient.getRawInstance().post<{ admission: unknown }>(
        `/admissions/${admissionId}/verify`,
        { verificationStatus, remarks: remarks ?? null }
      );
      return mapBackendAdmission(res.data.admission ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const idx = localAdmissionsStore.findIndex((a) => a.id === admissionId);
      if (idx === -1) throw err;
      localAdmissionsStore[idx] = {
        ...localAdmissionsStore[idx],
        verificationStatus: verificationStatus === "VERIFIED" ? "verified" : "rejected",
      };
      return localAdmissionsStore[idx];
    }
  },

  /**
   * Gateway checkout: initiate order, then confirm.
   * Stub provider auto-confirms with a synthetic payment id.
   * Razorpay returns order details for client Checkout (signature required).
   */
  async collectViaGateway(
    admissionId: string,
    amount?: number
  ): Promise<{ admission: Admission; provider: string; orderId: string }> {
    try {
      const initRes = await apiClient.getRawInstance().post<{
        order: {
          provider: string;
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          intentToken: string;
        };
      }>(`/admissions/${admissionId}/payments/initiate`, amount != null ? { amount } : {});

      const order = initRes.data.order;

      if (order.provider === "razorpay") {
        // Live Razorpay Checkout is out of band — return order for host page.
        throw Object.assign(
          new Error(
            `Razorpay order ${order.orderId} created. Complete Checkout with key ${order.keyId}, then POST /payments/confirm with signature.`
          ),
          { code: "RAZORPAY_CHECKOUT_REQUIRED", order }
        );
      }

      // Stub: confirm immediately with a synthetic payment id
      const paymentId = `stub_pay_${Date.now().toString(36)}`;
      const confirmRes = await apiClient.getRawInstance().post<{
        admission: unknown;
      }>(`/admissions/${admissionId}/payments/confirm`, {
        orderId: order.orderId,
        paymentId,
        intentToken: order.intentToken,
      });

      return {
        admission: mapBackendAdmission(confirmRes.data.admission ?? confirmRes.data),
        provider: order.provider,
        orderId: order.orderId,
      };
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      const idx = localAdmissionsStore.findIndex((a) => a.id === admissionId);
      if (idx === -1) throw err;
      const remaining =
        localAdmissionsStore[idx].fee - localAdmissionsStore[idx].amountPaid;
      const pay = amount != null ? Math.min(amount, remaining) : remaining;
      localAdmissionsStore[idx] = {
        ...localAdmissionsStore[idx],
        amountPaid: localAdmissionsStore[idx].amountPaid + pay,
        paymentMode: "gateway",
        paymentStatus:
          localAdmissionsStore[idx].amountPaid + pay >= localAdmissionsStore[idx].fee
            ? "full"
            : "partial",
      };
      return {
        admission: localAdmissionsStore[idx],
        provider: "stub",
        orderId: `stub_order_mock_${Date.now()}`,
      };
    }
  },
};
