/**
 * setup.ts - Global Vitest setup file.
 *
 * Runs ONCE per test session, before any test file is imported.
 *
 * Responsibilities:
 *   1. Load `.env.test` into process.env (overriding `.env`).
 *   2. Disconnect Prisma cleanly after all tests finish.
 *
 * CRITICAL: `config/env.ts` reads process.env at import time.
 * Therefore, this file MUST load dotenv before any test imports
 * application code. Vitest guarantees setupFiles runs first.
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

// Force load .env.test — overrides any values from .env
loadEnv({
  path: resolve(process.cwd(), '.env.test'),
  override: true,
});

// Sanity check — fail fast if we accidentally load the dev DB
const dbUrl = process.env.DATABASE_URL ?? '';
if (!dbUrl.includes('admission_hub_test')) {
  throw new Error(
    `[test-setup] Refusing to run tests against a non-test database.\n` +
      `DATABASE_URL = ${dbUrl}\n` +
      `Expected a URL containing "admission_hub_test".`,
  );
}

if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    `[test-setup] NODE_ENV must be "test", got "${process.env.NODE_ENV}".`,
  );
}