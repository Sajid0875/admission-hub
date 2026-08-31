import { create } from "zustand";
import type { AuthUser, Permission, UserRole } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // RBAC Helpers
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: Permission | Permission[]) => boolean;
  isSuperAdmin: () => boolean;
  isPartnerAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  setAuth: (user: AuthUser, token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setUser: (user: AuthUser | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setToken: (token: string | null) => {
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
    set({
      token,
      isAuthenticated: !!token && !!get().user,
    });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
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
    if (currentUser.role === "super_admin") return true; // Super admin possesses full access
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
}));
