import type { NormalizedError, PaginatedResponse } from "@/types/api";
import type { Lead } from "@/types/lead";

/**
 * Service interfaces and verification mocks.
 * Unimplemented or pending backend contracts are explicitly flagged with TODO-CONTRACT.
 */

export interface SystemStatusData {
  status: "online" | "degraded" | "maintenance";
  version: string;
  timestamp: string;
  tenantMode: "multi-tenant";
  activeProviders: string[];
}

export const mockFoundationService = {
  /**
   * Fetch system health status for foundation verification
   * TODO-CONTRACT: Connect to GET /api/v1/health when backend is provisioned
   */
  async getSystemStatus(shouldFail: boolean = false, simulateEmpty: boolean = false): Promise<SystemStatusData | null> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (shouldFail) {
      const error: NormalizedError = {
        isNormalized: true,
        code: "MOCK_SERVICE_UNAVAILABLE",
        message: "Simulated backend error: Connection could not be established to service gateway.",
        statusCode: 503,
      };
      throw error;
    }

    if (simulateEmpty) {
      return null;
    }

    return {
      status: "online",
      version: "1.0.0-foundation",
      timestamp: new Date().toISOString(),
      tenantMode: "multi-tenant",
      activeProviders: ["React Query v5", "Zustand v5", "Tailwind CSS v3", "Axios"],
    };
  },

  /**
   * Mock contract placeholder for leads listing
   * TODO-CONTRACT: Defined per Keystone HLD contract GET /api/v1/leads
   */
  async getLeadsContractPlaceholder(): Promise<PaginatedResponse<Lead>> {
    // Contract stub - not implementing business feature in Phase 1
    return {
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  },
};
