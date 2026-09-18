"use client";

import React from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Permission } from "@/types/auth";

export interface PermissionGateProps {
  permission: Permission | Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate: Conditionally renders children if the authenticated user has
 * at least one of the specified permissions. Super admin automatically bypasses.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
