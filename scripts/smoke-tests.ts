/**
 * Automated Smoke Test Suite for WhiteDavid23 Partner Portal
 * Tests critical flows:
 * 1. Login & Auth User session
 * 2. Role-based Navigation filtering
 * 3. Lead list server-side pagination
 * 4. Lead creation success & backend-managed attributes
 * 5. Duplicate 409 error handling
 * 6. Permission 403 authorization guard
 * 7. Super Admin Commission Payout approval
 */

import { useAuthStore } from "../src/stores/useAuthStore";
import { getAuthorizedNavItems, ALL_NAV_ITEMS } from "../src/components/shell/navigationConfig";
import { leadService } from "../src/services/api/leadService";
import { commissionService } from "../src/services/api/commissionService";
import { isNormalizedError } from "../src/services/api/client";
import type { UserRole } from "../src/types/auth";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}${detail ? ` - ${detail}` : ""}`);
    failedCount++;
  }
}

async function runSmokeTests() {
  console.log("\n=======================================================");
  console.log("  WhiteDavid23 Partner Portal - Smoke Test Suite");
  console.log("=======================================================\n");

  // TEST 1: Login & Session Store
  console.log("\x1b[36m[Test Group 1: Auth & User Session Store]\x1b[0m");
  const testUser = {
    id: "user_test_admin",
    name: "David White",
    email: "admin@apexacademy.edu",
    role: "partner_admin" as UserRole,
    partnerId: "partner_001",
    permissions: ["lead:create", "lead:read", "lead:update", "commission:view"] as any[],
  };

  useAuthStore.getState().setAuth(testUser, "mock_jwt_test_token");
  const activeUser = useAuthStore.getState().user;
  const isAuth = useAuthStore.getState().isAuthenticated;

  assert(isAuth === true, "Session isAuthenticated is true after setAuth");
  assert(activeUser?.role === "partner_admin", "Active user role matches partner_admin");
  assert(useAuthStore.getState().hasPermission("lead:create"), "User has lead:create permission");
  assert(!useAuthStore.getState().hasPermission("partner:manage"), "Partner Admin lacks partner:manage permission");

  // TEST 2: Role-based Navigation Filtering
  console.log("\n\x1b[36m[Test Group 2: Role-Based Navigation Audit]\x1b[0m");
  const superAdminNav = getAuthorizedNavItems("super_admin", []);
  const partnerAdminNav = getAuthorizedNavItems("partner_admin", ["commission:view", "team:manage"]);
  const counselorNav = getAuthorizedNavItems("counselor", ["lead:create", "lead:read"]);

  assert(superAdminNav.some((i) => i.href === "/partners"), "Super Admin sees /partners navigation");
  assert(!partnerAdminNav.some((i) => i.href === "/partners"), "Partner Admin CANNOT see /partners navigation");
  assert(partnerAdminNav.some((i) => i.href === "/commissions"), "Partner Admin sees /commissions navigation");
  assert(!counselorNav.some((i) => i.href === "/commissions"), "Counselor CANNOT see /commissions navigation");
  assert(counselorNav.some((i) => i.href === "/leads"), "Counselor sees /leads navigation");

  // TEST 3: Lead List & Server-side Pagination
  console.log("\n\x1b[36m[Test Group 3: Leads List & Server Pagination]\x1b[0m");
  const page1 = await leadService.getLeads({ page: 1, limit: 3 });
  assert(page1.success === true, "getLeads returns success response");
  assert(page1.data.length <= 3, `Page 1 returns at most 3 records (got ${page1.data.length})`);
  assert(page1.meta.page === 1, "Meta page is 1");
  assert(page1.meta.total >= 5, "Meta total reflects server records count");
  assert(page1.meta.hasNextPage === true, "Page 1 indicates hasNextPage is true");

  const page2 = await leadService.getLeads({ page: 2, limit: 3 });
  assert(page2.meta.page === 2, "Meta page is 2 for next page fetch");
  assert(page1.data[0].id !== page2.data[0].id, "Page 2 records are distinct from Page 1");

  // TEST 4: Lead Creation Success
  console.log("\n\x1b[36m[Test Group 4: Lead Ingestion & Backend Managed Attributes]\x1b[0m");
  const uniquePhone = `+91 91234 ${Math.floor(10000 + Math.random() * 90000)}`;
  const createdLead = await leadService.createLead({
    studentName: "Smoke Test Candidate",
    phone: uniquePhone,
    email: "candidate@smoketest.com",
    courseId: "course_fs",
    courseInterest: "Full Stack Software Engineering",
    priority: "urgent",
    budget: 55000,
  });

  assert(createdLead.studentName === "Smoke Test Candidate", "Created lead studentName matches");
  assert(createdLead.phone === uniquePhone, "Created lead phone matches");
  assert(typeof createdLead.leadScore === "number", "leadScore is populated by backend (not client)");
  assert(createdLead.isDuplicate === false, "isDuplicate is false for fresh lead");
  assert(createdLead.status === "new", "Initial status is 'new'");

  // TEST 5: Duplicate Phone 409 Error Handling
  console.log("\n\x1b[36m[Test Group 5: Duplicate Detection (HTTP 409)]\x1b[0m");
  try {
    // Attempt to create with identical phone number
    await leadService.createLead({
      studentName: "Duplicate Candidate",
      phone: uniquePhone,
      priority: "high",
    });
    assert(false, "Duplicate lead creation should throw HTTP 409");
  } catch (err: unknown) {
    if (isNormalizedError(err)) {
      assert(err.statusCode === 409, "Duplicate lead throws statusCode 409");
      assert(err.code === "DUPLICATE_LEAD", "Duplicate error code is DUPLICATE_LEAD");
      assert(
        err.message.includes("already exists as a lead"),
        "Friendly duplicate warning message received"
      );
    } else {
      assert(false, "Error was not normalized properly");
    }
  }

  // TEST 6: Permission 403 Guarding
  console.log("\n\x1b[36m[Test Group 6: Permission Authorization Guard (HTTP 403)]\x1b[0m");
  // Set role to counselor who lacks commission:approve_payout
  useAuthStore.getState().setAuth(
    {
      id: "user_counselor_1",
      name: "Staff Counselor",
      email: "counselor@apexacademy.edu",
      role: "counselor",
      permissions: ["lead:read", "lead:create"],
    },
    "token_counselor"
  );

  const canApprove = useAuthStore.getState().hasPermission("commission:approve_payout");
  const isSuper = useAuthStore.getState().isSuperAdmin();
  assert(!canApprove && !isSuper, "Counselor role is correctly blocked from payout authorization");

  // TEST 7: Super Admin Commission Payout Approval
  console.log("\n\x1b[36m[Test Group 7: Super Admin Payout Approval (PATCH endpoint)]\x1b[0m");
  // Switch to Super Admin
  useAuthStore.getState().setAuth(
    {
      id: "user_super_admin",
      name: "Alex Vance",
      email: "superadmin@whitedavid23.com",
      role: "super_admin",
      permissions: ["commission:approve_payout", "partner:manage"],
    },
    "token_super_admin"
  );

  assert(useAuthStore.getState().isSuperAdmin(), "Active user is Super Admin");
  const payoutResult = await commissionService.approvePayout("comm_002");
  assert(payoutResult.payoutStatus === "approved", "Payout status updated to 'approved'");
  assert(typeof payoutResult.payoutDate === "string", "Disbursement payoutDate is recorded");
  assert(typeof payoutResult.transactionReference === "string", "Transaction reference generated");

  // SUMMARY
  console.log("\n=======================================================");
  console.log(`  Smoke Tests Complete: \x1b[32m${passedCount} Passed\x1b[0m, \x1b[31m${failedCount} Failed\x1b[0m`);
  console.log("=======================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error("Fatal test failure:", err);
  process.exit(1);
});
