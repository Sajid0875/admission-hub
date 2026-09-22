import { apiClient } from "./client";
import type { PaginatedResponse, NormalizedError } from "@/types/api";
import type {
  CreateMarketingAssetPayload,
  MarketingAsset,
  MarketingAssetStatus,
  MarketingAssetType,
} from "@/types/marketing";
import { areMocksEnabled, isMockableOfflineError } from "@/lib/mocks";
import { normalizePaginatedResponse } from "@/lib/mappers";

export interface MarketingAssetQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string | "all";
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED" | "all";
  courseId?: string;
}

function shouldUseMockFallback(err: unknown): boolean {
  if (!areMocksEnabled()) return false;
  return isMockableOfflineError(err as NormalizedError);
}

function mapType(raw?: string): MarketingAssetType {
  const key = (raw ?? "POSTER").toLowerCase() as MarketingAssetType;
  return key;
}

function mapStatus(raw?: string): MarketingAssetStatus {
  switch ((raw ?? "").toUpperCase()) {
    case "INACTIVE":
      return "inactive";
    case "ARCHIVED":
      return "archived";
    default:
      return "active";
  }
}

export function mapBackendMarketingAsset(raw: unknown): MarketingAsset {
  const a = raw as {
    id: string;
    title?: string;
    type?: string;
    fileUrl?: string;
    thumbnailUrl?: string | null;
    language?: string;
    courseId?: string | null;
    status?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
  return {
    id: a.id,
    title: a.title ?? "Untitled Asset",
    type: mapType(a.type),
    fileUrl: a.fileUrl ?? "",
    thumbnailUrl: a.thumbnailUrl ?? undefined,
    language: a.language ?? "en",
    courseId: a.courseId ?? undefined,
    status: mapStatus(a.status),
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined,
    updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : undefined,
  };
}

export const marketingService = {
  async getAssets(
    params: MarketingAssetQueryParams = {}
  ): Promise<PaginatedResponse<MarketingAsset>> {
    const { page = 1, limit = 25, search = "", type = "all", status = "all", courseId } = params;
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("limit", String(limit));
    if (search.trim()) q.set("search", search.trim());
    if (type !== "all") q.set("type", type);
    if (status !== "all") q.set("status", status);
    if (courseId) q.set("courseId", courseId);

    try {
      const raw = await apiClient.getRawInstance().get(`/marketing-assets?${q.toString()}`);
      return normalizePaginatedResponse(raw.data, mapBackendMarketingAsset);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        success: true,
        data: [],
        meta: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  },

  async createAsset(payload: CreateMarketingAssetPayload): Promise<MarketingAsset> {
    try {
      const res = await apiClient
        .getRawInstance()
        .post<{ asset: unknown }>("/marketing-assets", payload);
      return mapBackendMarketingAsset(res.data.asset ?? res.data);
    } catch (err: unknown) {
      if (!shouldUseMockFallback(err)) throw err;
      return {
        id: `asset_${Date.now()}`,
        title: payload.title,
        type: mapType(payload.type),
        fileUrl: payload.fileUrl,
        thumbnailUrl: payload.thumbnailUrl ?? undefined,
        language: payload.language ?? "en",
        courseId: payload.courseId ?? undefined,
        status: "active",
        createdAt: new Date().toISOString(),
      };
    }
  },

  async archiveAsset(assetId: string): Promise<MarketingAsset> {
    try {
      const res = await apiClient
        .getRawInstance()
        .delete<{ asset: unknown }>(`/marketing-assets/${assetId}`);
      return mapBackendMarketingAsset(res.data.asset ?? res.data);
    } catch (err: unknown) {
      throw err;
    }
  },
};
