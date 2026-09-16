/**
 * seed.ts - Database seed script.
 *
 * Idempotent. Safe to run multiple times.
 *
 * Seeds:
 *   - All Permission records (per code)
 *   - All Role records (per RoleName enum)
 *   - RolePermission mappings
 *   - One Super Admin user
 *
 * Run: npm run prisma:seed
 */

import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --------------------------------------------------
// Permissions catalog
// --------------------------------------------------

const PERMISSIONS: Array<{ code: string; description: string }> = [
    // Leads
    { code: 'LEAD_VIEW', description: 'View leads' },
    { code: 'LEAD_CREATE', description: 'Create leads' },
    { code: 'LEAD_UPDATE', description: 'Update leads' },
    { code: 'LEAD_DELETE', description: 'Delete leads' },
    { code: 'LEAD_ASSIGN', description: 'Assign leads to users' },
    // Follow-ups
    { code: 'FOLLOWUP_VIEW', description: 'View follow-ups' },
    { code: 'FOLLOWUP_MANAGE', description: 'Manage follow-ups' },
    // Admissions
    { code: 'ADMISSION_VIEW', description: 'View admissions' },
    { code: 'ADMISSION_CREATE', description: 'Create admissions' },
    { code: 'ADMISSION_UPDATE', description: 'Update admissions' },
    { code: 'ADMISSION_VERIFY', description: 'Verify admissions' },
    // Partners
    { code: 'PARTNER_VIEW', description: 'View partners' },
    { code: 'PARTNER_APPROVE', description: 'Approve or reject partners' },
    { code: 'PARTNER_SUSPEND', description: 'Suspend partners' },
    // Users
    { code: 'USER_VIEW', description: 'View users' },
    { code: 'USER_MANAGE', description: 'Manage users' },
    // Courses
    { code: 'COURSE_VIEW', description: 'View courses' },
    { code: 'COURSE_MANAGE', description: 'Manage courses' },
    // Marketing
    { code: 'MARKETING_VIEW', description: 'View marketing assets' },
    { code: 'MARKETING_MANAGE', description: 'Manage marketing assets' },
    // Commissions
    { code: 'COMMISSION_VIEW', description: 'View commissions' },
    { code: 'COMMISSION_MANAGE', description: 'Manage commissions and payouts' },
    // Reports
    { code: 'REPORT_VIEW', description: 'View reports' },
    { code: 'REPORT_EXPORT', description: 'Export reports' },
    // Audit
    { code: 'AUDIT_VIEW', description: 'View audit logs' },
    // Notifications
    { code: 'NOTIFICATION_VIEW', description: 'View notifications' },
];

// --------------------------------------------------
// Roles catalog
// --------------------------------------------------

const ROLES: Array<{ name: RoleName; description: string }> = [
    { name: RoleName.SUPER_ADMIN, description: 'Full system access' },
    { name: RoleName.PARTNER_ADMIN, description: 'Partner workspace management' },
    { name: RoleName.COUNSELOR, description: 'Lead and follow-up operations' },
    { name: RoleName.SUPPORT, description: 'Limited support and verification actions' },
];

// --------------------------------------------------
// Role → Permission mapping
// --------------------------------------------------

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const EXCLUDED_FROM_PARTNER_ADMIN = new Set<string>([
    'PARTNER_VIEW',
    'PARTNER_APPROVE',
    'PARTNER_SUSPEND',
    'USER_MANAGE',
    'AUDIT_VIEW',
]);

const COUNSELOR_CODES = new Set<string>([
    'LEAD_VIEW',
    'LEAD_CREATE',
    'LEAD_UPDATE',
    'FOLLOWUP_VIEW',
    'FOLLOWUP_MANAGE',
    'ADMISSION_VIEW',
    'ADMISSION_CREATE',
    'COURSE_VIEW',
    'MARKETING_VIEW',
    'NOTIFICATION_VIEW',
]);

const SUPPORT_CODES = new Set<string>([
    'LEAD_VIEW',
    'ADMISSION_VIEW',
    'COURSE_VIEW',
    'NOTIFICATION_VIEW',
    'REPORT_VIEW',
]);

const ROLE_PERMISSION_MAP: Record<RoleName, string[]> = {
    [RoleName.SUPER_ADMIN]: ALL_PERMISSION_CODES,
    [RoleName.PARTNER_ADMIN]: ALL_PERMISSION_CODES.filter(
        (c) => !EXCLUDED_FROM_PARTNER_ADMIN.has(c),
    ),
    [RoleName.COUNSELOR]: ALL_PERMISSION_CODES.filter((c) => COUNSELOR_CODES.has(c)),
    [RoleName.SUPPORT]: ALL_PERMISSION_CODES.filter((c) => SUPPORT_CODES.has(c)),
};

// --------------------------------------------------
// Super Admin seed values
// --------------------------------------------------

const SUPER_ADMIN_EMAIL = 'admin@whitedavid23.local';
const SUPER_ADMIN_PASSWORD = 'ChangeMe!Adm1n2026';
const SUPER_ADMIN_NAME = 'Super Admin';

// --------------------------------------------------
// Seed
// --------------------------------------------------

async function seedPermissions(): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    for (const perm of PERMISSIONS) {
        const record = await prisma.permission.upsert({
            where: { code: perm.code },
            update: { description: perm.description },
            create: { code: perm.code, description: perm.description },
        });
        map.set(record.code, record.id);
    }

    return map;
}

async function seedRoles(): Promise<Map<RoleName, string>> {
    const map = new Map<RoleName, string>();

    for (const role of ROLES) {
        const record = await prisma.role.upsert({
            where: { name: role.name },
            update: { description: role.description },
            create: { name: role.name, description: role.description },
        });
        map.set(record.name, record.id);
    }

    return map;
}

async function seedRolePermissions(
    roleMap: Map<RoleName, string>,
    permissionMap: Map<string, string>,
): Promise<void> {
    for (const [roleName, codes] of Object.entries(ROLE_PERMISSION_MAP) as [
        RoleName,
        string[],
    ][]) {
        const roleId = roleMap.get(roleName);
        if (!roleId) continue;

        for (const code of codes) {
            const permissionId = permissionMap.get(code);
            if (!permissionId) continue;

            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId, permissionId } },
                update: {},
                create: { roleId, permissionId },
            });
        }
    }
}

async function seedSuperAdmin(roleMap: Map<RoleName, string>): Promise<void> {
    const superAdminRoleId = roleMap.get(RoleName.SUPER_ADMIN);
    if (!superAdminRoleId) {
        throw new Error('SUPER_ADMIN role not found — aborting seed');
    }

    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

    await prisma.user.upsert({
        where: { email: SUPER_ADMIN_EMAIL },
        update: {
            // Do NOT overwrite passwordHash on re-seed to preserve any manual change.
            name: SUPER_ADMIN_NAME,
            roleId: superAdminRoleId,
        },
        create: {
            email: SUPER_ADMIN_EMAIL,
            name: SUPER_ADMIN_NAME,
            passwordHash,
            roleId: superAdminRoleId,
            status: 'ACTIVE',
        },
    });
}

async function main(): Promise<void> {
    console.log('[seed] starting...');

    const permissionMap = await seedPermissions();
    console.log(`[seed] permissions: ${permissionMap.size}`);

    const roleMap = await seedRoles();
    console.log(`[seed] roles: ${roleMap.size}`);

    await seedRolePermissions(roleMap, permissionMap);
    console.log('[seed] role → permission mappings applied');

    await seedSuperAdmin(roleMap);
    console.log(`[seed] super admin: ${SUPER_ADMIN_EMAIL}`);

    console.log('[seed] done.');
}

main()
    .catch((err) => {
        console.error('[seed] failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });