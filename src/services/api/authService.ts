import type { AuthUser, UserRole, Permission } from "@/types/auth";
import type { NormalizedError } from "@/types/api";

/**
 * Authentication Service & Contract Definitions
 * 
 * TODO-CONTRACT: The backend documentation (Keystone HLD/LLD) specifies JWT verification
 * in auth.middleware.js attaching req.user = { id, role, partnerId, permissions } and
 * returning 401 UNAUTHENTICATED on failure, but NO authentication endpoint contract
 * (such as POST /api/v1/auth/login or token refresh) is currently provided by the backend.
 * 
 * Production endpoint should be wired here once backend team finalizes the auth route.
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

// Predefined role profiles aligning with Keystone HLD/LLD & SRS specifications
export const MOCK_ROLE_PROFILES: Record<UserRole, Omit<AuthUser, "email">> = {
  super_admin: {
    id: "usr_super_001",
    name: "Alex Vance (Super Admin)",
    role: "super_admin",
    partnerId: null, // Super admin operates across all tenants globally
    status: "active",
    permissions: [
      "partner:create",
      "partner:approve",
      "partner:manage",
      "lead:create",
      "lead:read",
      "lead:update",
      "lead:delete",
      "lead:assign",
      "lead:transfer",
      "lead:import",
      "lead:export",
      "admission:create",
      "admission:read",
      "admission:update",
      "commission:view",
      "commission:request_payout",
      "commission:approve_payout",
      "report:view",
      "report:view_all",
      "audit:view",
      "team:manage",
      "settings:manage",
    ],
  },
  partner_admin: {
    id: "usr_partner_002",
    name: "David White (Partner Admin)",
    role: "partner_admin",
    partnerId: "partner_001", // Scoped strictly to Apex Academy
    status: "active",
    permissions: [
      "lead:create",
      "lead:read",
      "lead:update",
      "lead:assign",
      "lead:import",
      "lead:export",
      "admission:create",
      "admission:read",
      "admission:update",
      "commission:view",
      "commission:request_payout",
      "report:view",
      "team:manage",
    ],
  },
  team_member: {
    id: "usr_team_003",
    name: "Sarah Connor (Team Member)",
    role: "team_member",
    partnerId: "partner_001", // Scoped strictly to Apex Academy
    status: "active",
    permissions: [
      "lead:create",
      "lead:read",
      "lead:update",
      "admission:read",
    ],
  },
  support: {
    id: "usr_support_004",
    name: "Marcus Brody (Support)",
    role: "support",
    partnerId: null,
    status: "active",
    permissions: [
      "lead:read",
      "lead:update",
      "admission:read",
      "audit:view",
    ],
  },
  counselor: {
    id: "usr_counselor_005",
    name: "Elena Ramos (Counselor)",
    role: "counselor",
    partnerId: "partner_001",
    status: "active",
    permissions: [
      "lead:create",
      "lead:read",
      "lead:update",
      "admission:read",
    ],
  },
};

export const authService = {
  /**
   * Authenticate user with credentials
   * TODO-CONTRACT: Replace mock implementation with actual apiClient.post('/api/v1/auth/login', credentials)
   * once backend contract is provisioned.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Basic mock validation
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

    // Determine role from requestedRole or email heuristics
    let assignedRole: UserRole = credentials.requestedRole || "partner_admin";

    const emailLower = credentials.email.toLowerCase();
    if (emailLower.includes("super") || emailLower.includes("admin@whitedavid23")) {
      assignedRole = "super_admin";
    } else if (emailLower.includes("team") || emailLower.includes("counselor")) {
      assignedRole = "team_member";
    } else if (emailLower.includes("support")) {
      assignedRole = "support";
    }

    const profile = MOCK_ROLE_PROFILES[assignedRole];

    const user: AuthUser = {
      ...profile,
      email: credentials.email,
      lastLogin: new Date().toISOString(),
    };

    const token = `jwt_mock_${user.role}_${Date.now()}`;

    return {
      user,
      token,
      expiresIn: 3600 * 24,
    };
  },

  /**
   * Log out user
   * TODO-CONTRACT: Call POST /api/v1/auth/logout to invalidate refresh tokens in Redis
   */
  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
  },

  /**
   * Validate current session token
   * TODO-CONTRACT: Connect to GET /api/v1/auth/me once backend implements it
   */
  async validateSession(token: string): Promise<AuthUser | null> {
    if (!token) return null;
    return null;
  },
};
