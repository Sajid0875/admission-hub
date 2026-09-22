"use client";

import React from "react";
import { ModulePlaceholder } from "@/components/shell/ModulePlaceholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Platform Settings & Configurations"
      phaseScheduled="Phase 8"
      description="Global multi-tenant preferences, course catalogs, lead duplicate rules, and webhook integrations."
      supportedRoles={["super_admin"]}
      requiredPermission="settings:manage"
    />
  );
}
