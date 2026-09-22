/**
 * Shared Auth, Role & Permission Domain Types
 */

export type UserRole = "super_admin" | "partner_admin" | "counselor" | "team_member" | "support";

export type Permission =
  | "lead:create"
  | "lead:read"
  | "lead:update"
  | "lead:delete"
  | "lead:assign"
  | "lead:transfer"
  | "lead:import"
  | "lead:export"
  | "admission:create"
  | "admission:read"
  | "admission:update"
  | "commission:view"
  | "commission:request_payout"
  | "commission:approve_payout"
  | "partner:create"
  | "partner:approve"
  | "partner:manage"
  | "report:view"
  | "report:view_all"
  | "audit:view"
  | "team:manage"
  | "settings:manage";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  partnerId?: string | null;
  permissions: Permission[];
  avatarUrl?: string;
  status?: "active" | "inactive" | "suspended";
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponseData {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface SessionState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
