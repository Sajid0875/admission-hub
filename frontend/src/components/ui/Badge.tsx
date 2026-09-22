import React from "react";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/lead";
import type { PaymentStatus } from "@/types/admission";
import type { PartnerStatus } from "@/types/partner";
import type { PayoutStatus } from "@/types/commission";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "slate" | "blue" | "emerald" | "amber" | "rose" | "purple" | "indigo";
  size?: "sm" | "md";
  dot?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, { bg: string; text: string; dot: string; border: string }> = {
  slate: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-500",
    border: "border-slate-200/80",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
    border: "border-blue-200/80",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    border: "border-emerald-200/80",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    border: "border-amber-200/80",
  },
  rose: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
    border: "border-rose-200/80",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
    border: "border-purple-200/80",
  },
  indigo: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
    border: "border-indigo-200/80",
  },
};

export function Badge({
  className,
  variant = "slate",
  size = "sm",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border select-none transition-colors",
        size === "sm" ? "px-2.5 py-0.5 text-xs gap-1.5" : "px-3 py-1 text-sm gap-2",
        styles.bg,
        styles.text,
        styles.border,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)} />}
      {children}
    </span>
  );
}

export type DomainStatus = LeadStatus | PaymentStatus | PartnerStatus | PayoutStatus | string;

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: DomainStatus;
  type?: "lead" | "admission" | "partner" | "payout" | "generic";
}

export function StatusBadge({ status, type = "generic", className, ...props }: StatusBadgeProps) {
  let variant: BadgeProps["variant"] = "slate";
  let label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Lead status mapping
  if (status === "new") {
    variant = "blue";
  } else if (status === "contacted") {
    variant = "purple";
  } else if (status === "follow_up") {
    variant = "amber";
    label = "Follow-up";
  } else if (status === "demo") {
    variant = "indigo";
    label = "Demo Booked";
  } else if (status === "admitted") {
    variant = "emerald";
    label = "Admitted";
  } else if (status === "lost") {
    variant = "rose";
  }
  // Admission / Payment status mapping
  else if (status === "full" || status === "active" || status === "paid" || status === "approved") {
    variant = "emerald";
  } else if (status === "partial" || status === "requested") {
    variant = "blue";
  } else if (status === "pending") {
    variant = "amber";
  } else if (status === "rejected" || status === "cancelled" || status === "suspended") {
    variant = "rose";
  } else if (status === "refunded") {
    variant = "purple";
  }

  return (
    <Badge variant={variant} dot {...props} className={className}>
      {label}
    </Badge>
  );
}
