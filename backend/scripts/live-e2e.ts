/**
 * live-e2e.ts - Full-stack API workflow against a running backend (:4000).
 *
 * Covers the representative chain from docs/myLogs.md:
 *   login (all roles) → lead → follow-up → admission → verify → commission
 *   → approve → invite user → audit → courses/marketing/notifications/rules/CSV/summary
 *
 * Usage (from backend/):
 *   npx tsx scripts/live-e2e.ts
 */

const BASE = process.env.API_BASE ?? 'http://localhost:4000/api/v1';

const ACCOUNTS = {
    sa: { email: 'admin@whitedavid23.local', password: 'ChangeMe!Adm1n2026' },
    pa: { email: 'partner@whitedavid23.com', password: 'ChangeMe!Partner2026' },
    co: { email: 'counselor@whitedavid23.com', password: 'ChangeMe!Counselor2026' },
    su: { email: 'support@whitedavid23.com', password: 'ChangeMe!Support2026' },
} as const;

type Json = Record<string, unknown>;

let passed = 0;
let failed = 0;

const assert = (ok: boolean, name: string, detail?: string): void => {
    if (ok) {
        console.log(`  ✔ PASS: ${name}`);
        passed += 1;
    } else {
        console.error(`  ✖ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
        failed += 1;
    }
};

const api = async (
    method: string,
    path: string,
    token?: string,
    body?: unknown,
): Promise<{ status: number; json: Json; text: string; headers: Headers }> => {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: Json = {};
    try {
        json = text ? (JSON.parse(text) as Json) : {};
    } catch {
        json = { raw: text };
    }
    return { status: res.status, json, text, headers: res.headers };
};

const login = async (email: string, password: string): Promise<string> => {
    const { status, json } = await api('POST', '/auth/login', undefined, { email, password });
    if (status !== 200 || typeof json.token !== 'string') {
        throw new Error(`login failed for ${email}: ${status} ${JSON.stringify(json)}`);
    }
    return json.token;
};

const uniquePhone = (): string =>
    `+9198${String(Date.now()).slice(-8)}`;

async function main(): Promise<void> {
    console.log('\n=======================================================');
    console.log('  Admission Hub — Live API E2E');
    console.log(`  Base: ${BASE}`);
    console.log('=======================================================\n');

    // Health
    const health = await fetch('http://localhost:4000/health');
    assert(health.status === 200, 'GET /health → 200');

    // --- Auth: all roles ---
    console.log('\n[1] Auth — all role logins');
    const sa = await login(ACCOUNTS.sa.email, ACCOUNTS.sa.password);
    const pa = await login(ACCOUNTS.pa.email, ACCOUNTS.pa.password);
    const co = await login(ACCOUNTS.co.email, ACCOUNTS.co.password);
    const su = await login(ACCOUNTS.su.email, ACCOUNTS.su.password);
    assert(!!sa && !!pa && !!co && !!su, 'SA / PA / Counselor / Support login');

    const saMe = await api('GET', '/auth/me', sa);
    const paMe = await api('GET', '/auth/me', pa);
    assert(
        (saMe.json.user as Json)?.role === 'SUPER_ADMIN',
        'SA /me role SUPER_ADMIN',
    );
    assert(
        (paMe.json.user as Json)?.role === 'PARTNER_ADMIN',
        'PA /me role PARTNER_ADMIN',
    );

    // --- Partners ---
    console.log('\n[2] Partners');
    const partners = await api('GET', '/partners?page=1&limit=20', sa);
    assert(partners.status === 200, 'SA list partners');
    const partnerForbidden = await api('GET', '/partners?page=1&limit=5', co);
    assert(partnerForbidden.status === 403, 'Counselor partners → 403');

    // --- Courses (needed for admission) ---
    console.log('\n[3] Courses');
    const courses = await api('GET', '/courses?page=1&limit=20', sa);
    assert(courses.status === 200, 'List courses');
    const courseList = (courses.json.data as Json[]) ?? [];
    let courseId = courseList[0]?.id as string | undefined;
    if (!courseId) {
        const created = await api('POST', '/courses', sa, {
            title: `E2E Course ${Date.now()}`,
            duration: '3 months',
            fee: 55000,
            description: 'live e2e',
        });
        assert(created.status === 201 || created.status === 200, 'Create course if missing');
        courseId = (created.json.course as Json)?.id as string;
    }
    assert(!!courseId, 'Have a course UUID for admission');

    // --- Lead create (PA) + SA blocked ---
    console.log('\n[4] Leads');
    const phone = uniquePhone();
    const saLead = await api('POST', '/leads', sa, {
        name: 'E2E SA Should Fail',
        phone: uniquePhone(),
        email: `sa.fail.${Date.now()}@example.com`,
        source: 'website',
        priority: 'MEDIUM',
    });
    assert(saLead.status === 403, 'SA create lead → 403');

    const leadRes = await api('POST', '/leads', pa, {
        name: 'E2E Live Student',
        phone,
        email: `e2e.live.${Date.now()}@example.com`,
        city: 'Pune',
        source: 'website',
        priority: 'HIGH',
        notes: 'live e2e chain',
    });
    assert(leadRes.status === 201 || leadRes.status === 200, 'PA create lead', String(leadRes.status));
    const leadId = (leadRes.json.lead as Json)?.id as string;
    assert(!!leadId, 'Lead id returned');

    const leadGet = await api('GET', `/leads/${leadId}`, pa);
    assert(leadGet.status === 200, 'PA get lead');

    // --- Follow-up ---
    console.log('\n[5] Follow-ups');
    const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const fu = await api('POST', '/followups', pa, {
        leadId,
        dueAt,
        priority: 'HIGH',
        notes: 'e2e follow-up',
    });
    assert(fu.status === 201 || fu.status === 200, 'PA create follow-up', String(fu.status));
    const fuList = await api('GET', '/followups?page=1&limit=10', pa);
    assert(fuList.status === 200, 'PA list follow-ups');

    // --- Admission → verify → commission ---
    console.log('\n[6] Admissions + commission');
    const adm = await api('POST', '/admissions', pa, {
        leadId,
        courseId,
        fee: 55000,
        studentName: 'E2E Live Student',
    });
    assert(adm.status === 201 || adm.status === 200, 'PA create admission', String(adm.status));
    const admissionId = (adm.json.admission as Json)?.id as string;
    assert(!!admissionId, 'Admission id returned');

    const verify = await api('POST', `/admissions/${admissionId}/verify`, pa, {
        verificationStatus: 'VERIFIED',
    });
    let verified = verify.status === 200 || verify.status === 201;
    if (!verified) {
        const v2 = await api('POST', `/admissions/${admissionId}/verify`, sa, {
            verificationStatus: 'VERIFIED',
        });
        verified = v2.status === 200 || v2.status === 201;
        if (!verified) {
            console.error('  verify detail:', verify.status, JSON.stringify(verify.json));
            console.error('  verify SA detail:', v2.status, JSON.stringify(v2.json));
        }
    }
    assert(verified, 'Verify admission (PA or SA)');

    const commissions = await api('GET', '/commissions?page=1&limit=50', sa);
    assert(commissions.status === 200, 'SA list commissions');
    const rows = (commissions.json.data as Json[]) ?? [];
    const commission = rows.find((r) => r.admissionId === admissionId);
    assert(!!commission, 'Commission row exists for admission');

    const summary = await api('GET', '/commissions/summary', pa);
    assert(summary.status === 200, 'PA GET /commissions/summary');
    assert(!!(summary.json.summary as Json), 'Summary payload present');

    if (commission?.id) {
        const approve = await api('PATCH', `/commissions/${commission.id}/status`, sa, {
            status: 'APPROVED',
        });
        assert(approve.status === 200, 'SA approve commission');
    }

    // --- Team invite ---
    console.log('\n[7] Team invite');
    const inviteEmail = `e2e.invite.${Date.now()}@example.com`;
    const invite = await api('POST', '/users', pa, {
        name: 'E2E Invitee',
        email: inviteEmail,
        role: 'COUNSELOR',
        phone: uniquePhone(),
    });
    assert(invite.status === 201 || invite.status === 200, 'PA invite user', String(invite.status));
    const tempPassword =
        (invite.json.temporaryPassword as string) ??
        ((invite.json.user as Json)?.temporaryPassword as string);
    assert(!!tempPassword, 'temporaryPassword returned once');

    // --- Audit ---
    console.log('\n[8] Audit');
    const audit = await api('GET', '/audit-logs?page=1&limit=50', sa);
    assert(audit.status === 200, 'SA list audit logs');
    const actions = ((audit.json.data as Json[]) ?? []).map((a) => a.action);
    assert(
        actions.some((a) => String(a).includes('ADMISSION') || String(a).includes('USER')),
        'Audit contains admission/user actions',
        actions.slice(0, 8).join(','),
    );

    // --- Notifications ---
    console.log('\n[9] Notifications');
    const notif = await api('GET', '/notifications?page=1&limit=20', pa);
    assert(notif.status === 200, 'PA list notifications');
    const unread = await api('GET', '/notifications/unread-count', pa);
    assert(unread.status === 200, 'PA unread-count');

    // --- Commission rules (SA) + PA forbidden ---
    console.log('\n[10] Commission rules');
    const rules = await api('GET', '/commission-rules?page=1&limit=20', sa);
    assert(rules.status === 200, 'SA list commission-rules');
    const rulesPa = await api('GET', '/commission-rules?page=1&limit=5', pa);
    assert(rulesPa.status === 403, 'PA commission-rules → 403');

    // --- Marketing ---
    console.log('\n[11] Marketing + CSV + docs');
    const assets = await api('GET', '/marketing-assets?page=1&limit=10', sa);
    assert(assets.status === 200, 'List marketing assets');

    const csvLeads = await api('GET', '/reports/export?report=leads', pa);
    assert(csvLeads.status === 200, 'CSV export leads');
    assert(
        csvLeads.headers.get('content-type')?.includes('text/csv') === true ||
            csvLeads.text.includes(',') ||
            csvLeads.text.includes('\n'),
        'CSV body/content-type for leads',
    );

    const csvAdm = await api('GET', '/reports/export?report=admissions', pa);
    assert(csvAdm.status === 200, 'CSV export admissions');

    const openapi = await fetch('http://localhost:4000/api/v1/openapi.json');
    assert(openapi.status === 200, 'OpenAPI JSON');
    const docs = await fetch('http://localhost:4000/api/v1/docs');
    assert(docs.status === 200, 'Swagger docs HTML');

    // --- Counselor boundaries ---
    console.log('\n[12] Counselor boundaries');
    const coComm = await api('GET', '/commissions?page=1&limit=5', co);
    assert(coComm.status === 403, 'Counselor commissions → 403');
    const coDash = await api('GET', '/reports/dashboard', co);
    assert(coDash.status === 403, 'Counselor reports/dashboard → 403');
    const coLeads = await api('GET', '/leads?page=1&limit=5', co);
    assert(coLeads.status === 200, 'Counselor can list leads');

    console.log('\n=======================================================');
    console.log(`  Live E2E Complete: ${passed} Passed, ${failed} Failed`);
    console.log('=======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
    console.error('Fatal E2E error:', err);
    process.exit(1);
});
