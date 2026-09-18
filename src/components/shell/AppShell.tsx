"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNavigation } from "./MobileNavigation";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Protected Route Check
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  // Loading state while checking auth
  if (!isInitialized || (!isAuthenticated && isInitialized)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-base shadow-soft animate-pulse">
            WD
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Verifying session security...</span>
          </div>
        </div>
      </div>
    );
  }

  // Derive human-readable page title from pathname
  const segments = pathname.split("/").filter(Boolean);
  const pageTitle = segments.length > 0 ? segments[segments.length - 1].replace(/-/g, " ") : "Dashboard";

  return (
    <div className="min-h-screen bg-background text-on-background flex antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
          pageTitle={pageTitle}
        />

        {/* Mobile Navigation Drawer & Bottom Bar */}
        <MobileNavigation
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
