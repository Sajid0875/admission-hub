"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading dashboard content">
      {/* Top Banner Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-outline-variant flex flex-col sm:flex-row justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Skeleton className="h-14 w-48 rounded-2xl" />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-outline-variant space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* Pipeline Summary Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-outline-variant space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-56 shrink-0 bg-surface-container-low p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-8 rounded-full" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      {/* Split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-outline-variant space-y-3">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <div className="bg-white rounded-3xl p-6 border border-outline-variant space-y-3">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
