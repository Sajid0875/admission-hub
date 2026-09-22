# Graph Report - .  (2026-09-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 349 nodes · 618 edges · 15 communities (9 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 663 input · 150 output

## Graph Freshness
- Built from commit: `09386ee4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Authentication and Access Control
- Base UI Components
- Dashboard and Analytics
- Layout and Global State
- Status Badges and Models
- Core Project Dependencies
- TypeScript Configuration
- Application Page Routes
- Development Dependencies
- API Client and Services
- ESLint Configuration
- Next.js Configuration
- Next.js Environment Types
- PostCSS Configuration
- Tailwind CSS Configuration

## God Nodes (most connected - your core abstractions)
1. `useAuthStore` - 29 edges
2. `useUIStore` - 24 edges
3. `UserRole` - 17 edges
4. `cn()` - 16 edges
5. `compilerOptions` - 15 edges
6. `ModulePlaceholder()` - 12 edges
7. `DashboardSummaryData` - 10 edges
8. `Permission` - 10 edges
9. `UpcomingFollowUps()` - 6 edges
10. `NormalizedError` - 6 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/(dashboard)/dashboard/page.tsx → src/stores/useAuthStore.ts
- `Badge()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/Badge.tsx → src/lib/utils.ts
- `LoginForm()` --calls--> `useUIStore`  [EXTRACTED]
  src/app/login/page.tsx → src/stores/useUIStore.ts
- `RootPage()` --calls--> `useAuthStore`  [EXTRACTED]
  src/app/page.tsx → src/stores/useAuthStore.ts
- `PermissionGateProps` --references--> `Permission`  [EXTRACTED]
  src/components/auth/PermissionGate.tsx → src/types/auth.ts

## Import Cycles
- None detected.

## Communities (15 total, 6 thin omitted)

### Community 0 - "Authentication and Access Control"
Cohesion: 0.10
Nodes (33): LoginForm(), PRESET_ACCOUNTS, RootPage(), AccessDenied(), AccessDeniedProps, PermissionGate(), PermissionGateProps, RoleGate() (+25 more)

### Community 1 - "Base UI Components"
Cohesion: 0.06
Nodes (34): Alert(), AlertProps, variantStyles, Button, ButtonProps, sizeStyles, variantStyles, Card (+26 more)

### Community 2 - "Dashboard and Analytics"
Cohesion: 0.10
Nodes (35): DashboardPage(), CommissionSummary(), CommissionSummaryProps, DashboardSkeleton(), ICON_MAP, KpiCard(), KpiCardProps, PipelineSummary() (+27 more)

### Community 3 - "Layout and Global State"
Cohesion: 0.08
Nodes (30): metadata, AddNewLeadModal(), AddNewLeadModalProps, AdmissionItem, AdmissionsView(), mockAdmissions, CommissionsView(), FollowUpItem (+22 more)

### Community 4 - "Status Badges and Models"
Cohesion: 0.08
Nodes (22): Badge(), BadgeProps, DomainStatus, StatusBadgeProps, variantStyles, Admission, AdmissionDocument, PaymentMode (+14 more)

### Community 5 - "Core Project Dependencies"
Cohesion: 0.07
Nodes (27): axios, clsx, lucide-react, next, dependencies, axios, clsx, lucide-react (+19 more)

### Community 6 - "TypeScript Configuration"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 8 - "Development Dependencies"
Cohesion: 0.11
Nodes (19): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+11 more)

### Community 9 - "API Client and Services"
Cohesion: 0.15
Nodes (15): apiClient, axiosInstance, isNormalizedError(), normalizeApiError(), mockFoundationService, SystemStatusData, ApiErrorDetail, ApiErrorPayload (+7 more)

## Knowledge Gaps
- **137 isolated node(s):** `extends`, `next/core-web-vitals`, `nextConfig`, `name`, `version` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Authentication and Access Control` to `Dashboard and Analytics`, `Layout and Global State`, `Application Page Routes`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `cn()` connect `Base UI Components` to `Dashboard and Analytics`, `Status Badges and Models`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `UserRole` connect `Authentication and Access Control` to `Dashboard and Analytics`, `Layout and Global State`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `nextConfig` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication and Access Control` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._
- **Should `Base UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05803921568627451 - nodes in this community are weakly interconnected._
- **Should `Dashboard and Analytics` be split into smaller, more focused modules?**
  _Cohesion score 0.10195035460992907 - nodes in this community are weakly interconnected._