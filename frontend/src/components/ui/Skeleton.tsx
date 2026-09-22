import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "rounded";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200/80",
        variant === "circular" && "rounded-full",
        variant === "rounded" && "rounded-xl",
        variant === "default" && "rounded-lg",
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3">
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-4 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Table Rows Skeleton */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} className="flex items-center gap-4 py-3.5 px-4 bg-white rounded-xl border border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`tc-${r}-${c}`} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
