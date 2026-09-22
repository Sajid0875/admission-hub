import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type {
  CommissionRule,
  CommissionRuleType,
  CreateCommissionRulePayload,
  UpdateCommissionRulePayload,
} from "@/types/commission";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import { normalizePaginatedResponse } from "@/lib/mappers";

export interface CommissionRuleQueryParams {
  page?: number;
  limit?: number;
  courseId?: string;
  partnerType?: string;
  commissionType?: CommissionRuleType;
}

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  return isMockableOfflineError(err as NormalizedError);
}

function mapCommissionType(raw?: string): CommissionRuleType {
  return (raw ?? "").toUpperCase() === "FLAT" ? "FLAT" : "PERCENTAGE";
}

export function mapBackendCommissionRule(raw: unknown): CommissionRule {
  const r = raw as {
    id: string;
    courseId?: string | null;
    partnerType?: string | null;
    commissionType?: string;
    rate?: number | string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  return {
    id: r.id,
    courseId: r.courseId ?? null,
    partnerType: r.partnerType ?? null,
    commissionType: mapCommissionType(r.commissionType),
    rate: Number(r.rate ?? 0),
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
  };
}

export const commissionRuleService = {
  async getRules(
    params: CommissionRuleQueryParams = {}
  ): Promise<PaginatedResponse<CommissionRule>> {
    const { page = 1, limit = 50, courseId, partnerType, commissionType } = params;
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", String(limit));
    if (courseId) q.set("courseId", courseId);
    if (partnerType?.trim()) q.set("partnerType", partnerType.trim());
    if (commissionType) q.set("commissionType", commissionType);

    try {
      const raw = await apiClient
        .getRawInstance()
        .get(`/commission-rules?${q.toString()}`);
      return normalizePaginatedResponse(raw.data, mapBackendCommissionRule);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        success: true,
        data: [],
        meta: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  },

  async createRule(payload: CreateCommissionRulePayload): Promise<CommissionRule> {
    const res = await apiClient
      .getRawInstance()
      .post<{ rule: unknown }>("/commission-rules", payload);
    return mapBackendCommissionRule(res.data.rule ?? res.data);
  },

  async updateRule(
    ruleId: string,
    payload: UpdateCommissionRulePayload
  ): Promise<CommissionRule> {
    const res = await apiClient
      .getRawInstance()
      .patch<{ rule: unknown }>(`/commission-rules/${ruleId}`, payload);
    return mapBackendCommissionRule(res.data.rule ?? res.data);
  },

  async deleteRule(ruleId: string): Promise<void> {
    await apiClient.getRawInstance().delete(`/commission-rules/${ruleId}`);
  },
};
