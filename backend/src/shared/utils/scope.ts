/**
 * scope.ts - Tenant and role scoping helpers.
 *
 * Every list/find query that returns tenant-owned data MUST be built
 * with these helpers. Never trust the caller to filter data themselves.
 *
 * Rules:
 *   - super_admin   → sees everything (no scope)
 *   - partner_admin → scoped to their own partnerOrg
 *   - counselor     → scoped to their own partnerOrg AND assigned to them
 *   - support       → scoped to their own partnerOrg
 *
 * This module is intentionally small and dependency-free so it can be
 * imported from any service without circular-import risk.
 */

import { ForbiddenError } from '../errors/AppError.js';

// --------------------------------------------------
// Authenticated user shape (matches req.user)
// --------------------------------------------------

export interface ScopeUser {
    id: string;
    role: string;
    partnerId: string | null;
}

// --------------------------------------------------
// Guard: user must have a partner for tenant-scoped access
// --------------------------------------------------

const assertHasPartner = (user: ScopeUser): string => {
    if (!user.partnerId) {
        throw ForbiddenError('User is not associated with any partner');
    }
    return user.partnerId;
};

// --------------------------------------------------
// Scope filter for tenant-owned resources
// --------------------------------------------------

/**
 * Builds a Prisma-compatible `where` filter for tenant-owned resources.
 *
 * Usage in a service:
 *   const filter = buildTenantScope(req.user);
 *   const users = await prisma.user.findMany({ where: filter });
 *
 * For counselor-scoped resources (e.g. leads they must personally
 * own), use `buildAssignmentScope` instead.
 */
export const buildTenantScope = (user: ScopeUser): Record<string, unknown> => {
    // super_admin sees all — no scope
    if (user.role === 'SUPER_ADMIN') {
        return {};
    }

    // All other roles are bound to their partner
    return { partnerId: assertHasPartner(user) };
};

// --------------------------------------------------
// Scope filter for resources assigned to a specific user
// (e.g. leads for counselors)
// --------------------------------------------------

/**
 * Builds a Prisma-compatible `where` filter for resources that are
 * both tenant-owned AND assigned to the current user.
 *
 * - super_admin → sees all
 * - partner_admin → sees own partner's records
 * - counselor → sees own partner's records assigned to them
 * - support → sees own partner's records assigned to them
 *
 * `assigneeField` lets you specify the field name (default: 'assignedTo').
 */
export const buildAssignmentScope = (
    user: ScopeUser,
    assigneeField = 'assignedTo',
): Record<string, unknown> => {
    if (user.role === 'SUPER_ADMIN') {
        return {};
    }

    if (user.role === 'PARTNER_ADMIN') {
        return { partnerId: assertHasPartner(user) };
    }

    // counselor + support: tenant scoped AND assigned to them
    return {
        partnerId: assertHasPartner(user),
        [assigneeField]: user.id,
    };
};

// --------------------------------------------------
// Guard: user must be able to access a specific partner
// --------------------------------------------------

/**
 * Throws ForbiddenError if the given user is not allowed to access
 * the given partner. Used when a route accepts a partnerId param.
 */
export const assertCanAccessPartner = (
    user: ScopeUser,
    targetPartnerId: string,
): void => {
    if (user.role === 'SUPER_ADMIN') return;

    if (!user.partnerId || user.partnerId !== targetPartnerId) {
        throw ForbiddenError('Not allowed to access this partner');
    }
};