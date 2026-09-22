import { create } from "zustand";
import type { AuthUser, Permission, UserRole } from "@/types/auth";

const ACCESS_KEY = "auth_token";
const REFRESH_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (user: AuthUser, token: string, refreshToken?: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  initAuthFromStorage: () => void;
  logout: () => void;

  // RBAC & Role Helpers
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  isSuperAdmin: () => boolean;
  isPartnerAdmin: () => boolean;
  isTeamMember: () => boolean;
  isSupport: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initAuthFromStorage: () => {
    if (typeof window === "undefined") return;

    try {
      const storedToken = localStorage.getItem(ACCESS_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_KEY);
      const storedUserJson = localStorage.getItem(USER_KEY);

      if (storedToken && storedUserJson) {
        const parsedUser = JSON.parse(storedUserJson) as AuthUser;
        set({
          user: parsedUser,
          token: storedToken,
          refreshToken: storedRefresh,
          isAuthenticated: true,
          isInitialized: true,
        });
        return;
      }
    } catch {
      // Invalid JSON or corrupted storage
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  setAuth: (user: AuthUser, token: string, refreshToken?: string | null) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ACCESS_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem(REFRESH_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_KEY);
      }
    }
    set({
      user,
      token,
      refreshToken: refreshToken ?? null,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });
  },

  setUser: (user: AuthUser | null) => {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }
    set({
      user,
      isAuthenticated: !!user && !!get().token,
    });
  },

  setToken: (token: string | null) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem(ACCESS_KEY, token);
      } else {
        localStorage.removeItem(ACCESS_KEY);
      }
    }
    set({
      token,
      isAuthenticated: !!token && !!get().user,
    });
  },

  setTokens: (token: string, refreshToken: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ACCESS_KEY, token);
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
    set({
      token,
      refreshToken,
      isAuthenticated: !!token && !!get().user,
    });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    });
  },

  hasRole: (roles: UserRole | UserRole[]) => {
    const currentUser = get().user;
    if (!currentUser) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(currentUser.role);
  },

  hasPermission: (permissions: Permission | Permission[]) => {
    const currentUser = get().user;
    if (!currentUser) return false;
    // Super admin possesses full access to all system modules
    if (currentUser.role === "super_admin") return true;

    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    const userPermissions = currentUser.permissions || [];
    return requiredPermissions.some((p) => userPermissions.includes(p));
  },

  isSuperAdmin: () => {
    return get().user?.role === "super_admin";
  },

  isPartnerAdmin: () => {
    return get().user?.role === "partner_admin";
  },

  isTeamMember: () => {
    return get().user?.role === "team_member" || get().user?.role === "counselor";
  },

  isSupport: () => {
    return get().user?.role === "support";
  },
}));
