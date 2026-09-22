import { apiClient, normalizeApiError } from "./client";
import type { AuthUser, UserRole, Permission } from "@/types/auth";
import type { NormalizedError } from "@/types/api";
import {
  mapBackendUserToAuthUser,
  ROLE_PERMISSIONS,
  type BackendSafeUser,
} from "@/lib/mappers";
import { areMocksEnabled } from "@/lib/mocks";

/**
 * Authentication Service — wired to POST /auth/login and GET /auth/me.
 * Role → permission mapping is applied client-side until /me returns permissions.
 */

export interface LoginCredentials {
  email: string;
  password: string;
  requestedRole?: UserRole;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
  expiresIn?: number;
}

/** Dev-only role profiles for mock mode presets / smoke tests. */
export const MOCK_ROLE_PROFILES: Record<UserRole, Omit<AuthUser, "email">> = {
  super_admin: {
    id: "usr_super_001",
    name: "Alex Vance (Super Admin)",
    role: "super_admin",
    partnerId: null,
    status: "active",
    permissions: ROLE_PERMISSIONS.super_admin,
  },
  partner_admin: {
    id: "usr_partner_002",
    name: "David White (Partner Admin)",
    role: "partner_admin",
    partnerId: "partner_001",
    status: "active",
    permissions: ROLE_PERMISSIONS.partner_admin,
  },
  team_member: {
    id: "usr_team_003",
    name: "Sarah Connor (Team Member)",
    role: "team_member",
    partnerId: "partner_001",
    status: "active",
    permissions: ROLE_PERMISSIONS.team_member,
  },
  support: {
    id: "usr_support_004",
    name: "Marcus Brody (Support)",
    role: "support",
    partnerId: null,
    status: "active",
    permissions: ROLE_PERMISSIONS.support,
  },
  counselor: {
    id: "usr_counselor_005",
    name: "Elena Ramos (Counselor)",
    role: "counselor",
    partnerId: "partner_001",
    status: "active",
    permissions: ROLE_PERMISSIONS.counselor,
  },
};

function mockLogin(credentials: LoginCredentials): AuthResponse {
  if (!credentials.email || !credentials.password) {
    const error: NormalizedError = {
      isNormalized: true,
      code: "VALIDATION_ERROR",
      message: "Email and password are required.",
      statusCode: 422,
    };
    throw error;
  }

  if (credentials.password === "error" || credentials.password === "invalid") {
    const error: NormalizedError = {
      isNormalized: true,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Please verify your credentials.",
      statusCode: 401,
    };
    throw error;
  }

  let assignedRole: UserRole = credentials.requestedRole || "partner_admin";
  const emailLower = credentials.email.toLowerCase();
  if (emailLower.includes("super") || emailLower.includes("admin@whitedavid23")) {
    assignedRole = "super_admin";
  } else if (emailLower.includes("team") || emailLower.includes("counselor")) {
    assignedRole = emailLower.includes("counselor") ? "counselor" : "team_member";
  } else if (emailLower.includes("support")) {
    assignedRole = "support";
  }

  const profile = MOCK_ROLE_PROFILES[assignedRole];
  return {
    user: {
      ...profile,
      email: credentials.email,
      lastLogin: new Date().toISOString(),
    },
    token: `jwt_mock_${assignedRole}_${Date.now()}`,
    expiresIn: 3600 * 24,
  };
}

export const authService = {
  /**
   * Authenticate against POST /api/v1/auth/login.
   * Backend returns { token, user } (no success wrapper).
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (areMocksEnabled()) {
      await new Promise((r) => setTimeout(r, 200));
      return mockLogin(credentials);
    }

    if (!credentials.email || !credentials.password) {
      const error: NormalizedError = {
        isNormalized: true,
        code: "VALIDATION_ERROR",
        message: "Email and password are required.",
        statusCode: 422,
      };
      throw error;
    }

    try {
      const res = await apiClient.getRawInstance().post<{
        token: string;
        refreshToken?: string;
        user: BackendSafeUser;
      }>("/auth/login", {
        email: credentials.email.trim(),
        password: credentials.password,
      });

      return {
        token: res.data.token,
        refreshToken: res.data.refreshToken,
        user: mapBackendUserToAuthUser(res.data.user),
        expiresIn: 60 * 15,
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Exchange refresh token for a new access + refresh pair.
   * Used by the axios interceptor on 401 before forcing re-login.
   */
  async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    if (areMocksEnabled()) {
      return {
        token: `jwt_mock_refreshed_${Date.now()}`,
        refreshToken: `refresh_mock_${Date.now()}`,
      };
    }

    try {
      const res = await apiClient.getRawInstance().post<{
        token: string;
        refreshToken: string;
      }>("/auth/refresh", { refreshToken });
      return {
        token: res.data.token,
        refreshToken: res.data.refreshToken,
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /** Revoke refresh token server-side, then clear local session. */
  async logout(refreshToken?: string | null): Promise<void> {
    if (areMocksEnabled()) {
      return;
    }

    const token =
      refreshToken ??
      (typeof window !== "undefined"
        ? localStorage.getItem("auth_refresh_token")
        : null);

    if (!token) return;

    try {
      await apiClient.getRawInstance().post("/auth/logout", { refreshToken: token });
    } catch {
      // Best-effort revoke — local clear still happens in the store
    }
  },

  /**
   * Validate session via GET /api/v1/auth/me.
   * Backend returns { user }.
   */
  async validateSession(token: string): Promise<AuthUser | null> {
    if (!token) return null;

    if (areMocksEnabled()) {
      if (token.startsWith("jwt_mock_")) return null;
      return null;
    }

    try {
      const res = await apiClient.getRawInstance().get<{ user: BackendSafeUser }>(
        "/auth/me",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return mapBackendUserToAuthUser(res.data.user);
    } catch {
      return null;
    }
  },
};

export type { Permission };
