"use client";

import React from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { UserRole } from "@/types/auth";

export interface RoleGateProps {
  allowedRoles: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGate: Conditionally renders children if the authenticated user possesses
 * one of the specified roles.
 */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const hasRole = useAuthStore((state) => state.hasRole);

  if (!hasRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
