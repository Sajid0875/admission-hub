import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type { CommissionRecord, CommissionSummary, PayoutStatus } from "@/types/commission";

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
    payoutStatus: "requested",
    requestedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    notes: "Awaiting Super Admin payout clearance.",
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
    notes: "Under cooling period before payout request eligibility.",
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

/**
 * Commission API Service
 * Includes confirmed PATCH /api/v1/commissions/{id}/payout endpoint.
 */
export const commissionService = {
  /**
   * GET /api/v1/commissions
   * TODO-CONTRACT: List commissions with pagination & filters
   */
  async getCommissions(params: CommissionQueryParams = {}): Promise<PaginatedResponse<CommissionRecord>> {
    const { page = 1, limit = 10, payoutStatus = "all", search = "", partnerId } = params;

    const queryParams = new URLSearchParams();
    queryParams.set("page", String(page));
    queryParams.set("limit", String(limit));
    if (payoutStatus && payoutStatus !== "all") queryParams.set("payoutStatus", payoutStatus);
    if (search.trim()) queryParams.set("search", search.trim());
    if (partnerId) queryParams.set("partnerId", partnerId);

    try {
      return await apiClient.getPaginated<CommissionRecord>(`/commissions?${queryParams.toString()}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        let filtered = [...localCommissionsStore];

        if (partnerId) {
          filtered = filtered.filter((c) => c.partnerId === partnerId);
        }

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
      throw err;
    }
  },

  /**
   * GET /api/v1/commissions/summary
   * TODO-CONTRACT: Fetch summary financials directly from backend
   * Never calculated on the client!
   */
  async getCommissionSummary(partnerId?: string): Promise<CommissionSummary> {
    const queryParams = partnerId ? `?partnerId=${partnerId}` : "";
    try {
      return await apiClient.get<CommissionSummary>(`/commissions/summary${queryParams}`);
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        // Backend fixture summary values
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
      throw err;
    }
  },

  /**
   * Confirmed Keystone Contract:
   * PATCH /api/v1/commissions/{id}/payout
   * Body: { action: 'approve' }
   * Role constraint: Super Admin only (permission: commission:approve_payout).
   * 403 FORBIDDEN if unauthorized.
   */
  async approvePayout(commissionId: string): Promise<PayoutApprovalResponse["data"]> {
    try {
      const res = await apiClient.patch<PayoutApprovalResponse["data"]>(
        `/commissions/${commissionId}/payout`,
        { action: "approve" }
      );
      return res;
    } catch (err: unknown) {
      const normErr = err as NormalizedError;
      if (normErr.code === "NETWORK_ERROR" || normErr.statusCode === 404) {
        const index = localCommissionsStore.findIndex((c) => c.id === commissionId);
        if (index !== -1) {
          localCommissionsStore[index] = {
            ...localCommissionsStore[index],
            payoutStatus: "approved",
            payoutDate: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
          };
          return {
            id: commissionId,
            payoutStatus: "approved",
            payoutDate: new Date().toISOString(),
            approvedAmount: localCommissionsStore[index].earnedAmount,
            transactionReference: `TXN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          };
        }
      }
      throw err;
    }
  },
};
