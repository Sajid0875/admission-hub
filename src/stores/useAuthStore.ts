import { create } from "zustand";
import type { AuthUser, Permission, UserRole } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
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
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initAuthFromStorage: () => {
    if (typeof window === "undefined") return;

    try {
      const storedToken = localStorage.getItem("auth_token");
      const storedUserJson = localStorage.getItem("auth_user");

      if (storedToken && storedUserJson) {
        const parsedUser = JSON.parse(storedUserJson) as AuthUser;
        set({
          user: parsedUser,
          token: storedToken,
          isAuthenticated: true,
          isInitialized: true,
        });
        return;
      }
    } catch {
      // Invalid JSON or corrupted storage
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  setAuth: (user: AuthUser, token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    });
  },

  setUser: (user: AuthUser | null) => {
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("auth_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("auth_user");
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
      localStorage.removeItem("auth_user");
    }
    set({
      user: null,
      token: null,
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
