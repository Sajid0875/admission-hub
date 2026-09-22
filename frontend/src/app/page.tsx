"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isInitialized, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-base shadow-soft animate-pulse">
          WD
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Routing to WhiteDavid23 Partner Portal...</span>
        </div>
      </div>
    </div>
  );
}
