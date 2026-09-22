import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type { CommissionRecord, CommissionSummary, PayoutStatus } from "@/types/commission";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import {
  mapBackendCommission,
  normalizePaginatedResponse,
  summarizeCommissions,
} from "@/lib/mappers";

const SEED_COMMISSIONS: CommissionRecord[] = [
  {
    id: "comm_001",
    partnerId: "partner_001",
    admissionId: "adm_001",
    studentName: "Hassan Tahir",
    courseName: "Full Stack Software Engineering",
    admissionFee: 55000,
    commissionRate: 10,
    earnedAmount: 5500,
    pendingAmount: 0,
    paidAmount: 5500,
    payoutStatus: "paid",
    payoutDate: "2026-08-30T10:00:00Z",
    notes: "Direct bank settlement batch #SET-882",
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
  },
  {
    id: "comm_002",
    partnerId: "partner_001",
    admissionId: "adm_002",
    studentName: "Maryam Jamil",
    courseName: "Data Science & AI Immersive",
    admissionFee: 65000,
    commissionRate: 10,
    earnedAmount: 3500,
    pendingAmount: 3500,
    paidAmount: 0,
    payoutStatus: "requested",
    requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    notes: "Partner requested payout for verified first installment.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: "comm_003",
    partnerId: "partner_001",
    admissionId: "adm_003",
    studentName: "Danish Irfan",
    courseName: "Cloud Architecture & DevOps",
    admissionFee: 45000,
    commissionRate: 10,
    earnedAmount: 4500,
    pendingAmount: 4500,
    paidAmount: 0,
    payoutStatus: "pending",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "comm_004",
    partnerId: "partner_001",
    admissionId: "adm_004",
    studentName: "Areeba Noor",
    courseName: "UI/UX & Product Design",
    admissionFee: 40000,
    commissionRate: 10,
    earnedAmount: 1500,
    pendingAmount: 1500,
    paidAmount: 0,
    payoutStatus: "pending",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

let localCommissionsStore: CommissionRecord[] = [...SEED_COMMISSIONS];

export interface CommissionQueryParams {
  page?: number;
  limit?: number;
  payoutStatus?: PayoutStatus | "all";
  partnerId?: string;
  search?: string;
}

export interface PayoutApprovalResponse {
  success: boolean;
  data: {
    id: string;
    payoutStatus: "approved";
    payoutDate: string;
    approvedAmount: number;
    transactionReference?: string;
  };
}

const STATUS_TO_BE: Record<string, string> = {
  pending: "PENDING",
  requested: "PENDING",
  approved: "APPROVED",
  paid: "PAID",
  rejected: "CANCELLED",
};

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  return isMockableOfflineError(err as NormalizedError);
}

export const commissionService = {
  async getCommissions(
    params: CommissionQueryParams = {}
  ): Promise<PaginatedResponse<CommissionRecord>> {
    const { page = 1, limit = 10, payoutStatus = "all", search = "", partnerId } = params;

    if (areMocksEnabled()) {
      let filtered = [...localCommissionsStore];
      if (partnerId) filtered = filtered.filter((c) => c.partnerId === partnerId);
      if (payoutStatus && payoutStatus !== "all") {
        filtered = filtered.filter((c) => c.payoutStatus === payoutStatus);
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(
          (c) =>
            (c.studentName && c.studentName.toLowerCase().includes(q)) ||
            (c.courseName && c.courseName.toLowerCase().includes(q)) ||
            c.id.toLowerCase().includes(q)
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

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", String(limit));
    if (payoutStatus && payoutStatus !== "all") {
      queryParams.set("status", STATUS_TO_BE[payoutStatus] ?? payoutStatus.toUpperCase());
    }
    if (partnerId) queryParams.set("partnerId", partnerId);

    try {
      const raw = await apiClient.getRawInstance().get(`/commissions?${queryParams.toString()}`);
      let pageResult = normalizePaginatedResponse(raw.data, mapBackendCommission);
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const filtered = pageResult.data.filter(
          (c) =>
            (c.studentName && c.studentName.toLowerCase().includes(q)) ||
            (c.courseName && c.courseName.toLowerCase().includes(q)) ||
            c.id.toLowerCase().includes(q)
        );
        pageResult = {
          ...pageResult,
          data: filtered,
          meta: { ...pageResult.meta, total: filtered.length },
        };
      }
      return pageResult;
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      throw err;
    }
  },

  /**
   * Summary: backend has no /commissions/summary — derive from list.
   */
  async getCommissionSummary(partnerId?: string): Promise<CommissionSummary> {
    try {
      const list = await this.getCommissions({ page: 1, limit: 100, partnerId });
      return summarizeCommissions(list.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      if (partnerId) {
        return {
          totalEarned: 15000,
          pendingPayout: 9500,
          totalPaid: 5500,
          lastPayoutDate: "2026-08-30T10:00:00Z",
        };
      }
      return {
        totalEarned: 114500,
        pendingPayout: 18600,
        totalPaid: 95900,
        lastPayoutDate: "2026-08-30T10:00:00Z",
      };
    }
  },

  /**
   * Approve payout via PATCH /commissions/:id/status { status: "APPROVED" }.
   */
  async approvePayout(commissionId: string): Promise<PayoutApprovalResponse["data"]> {
    if (areMocksEnabled()) {
      const index = localCommissionsStore.findIndex((c) => c.id === commissionId);
      if (index !== -1) {
        const now = new Date().toISOString();
        localCommissionsStore[index] = {
          ...localCommissionsStore[index],
          payoutStatus: "approved",
          approvedAt: now,
          payoutDate: now,
          pendingAmount: localCommissionsStore[index].earnedAmount,
        };
        return {
          id: commissionId,
          payoutStatus: "approved",
          payoutDate: now,
          approvedAmount: localCommissionsStore[index].earnedAmount,
          transactionReference: `TXN-MOCK-${Date.now()}`,
        };
      }
      const error: NormalizedError = {
        isNormalized: true,
        code: "NOT_FOUND",
        message: "Commission record not found",
        statusCode: 404,
      };
      throw error;
    }

    try {
      const res = await apiClient.getRawInstance().patch<{ commission: {
        id: string;
        commissionAmount: number;
        status: string;
        paidAt?: string | null;
      } }>(`/commissions/${commissionId}/status`, { status: "APPROVED" });

      const c = res.data.commission;
      return {
        id: c.id,
        payoutStatus: "approved",
        payoutDate: new Date().toISOString(),
        approvedAmount: Number(c.commissionAmount),
        transactionReference: `TXN-${c.id.slice(0, 8).toUpperCase()}`,
      };
    } catch (err: unknown) {
      throw err;
    }
  },
};
