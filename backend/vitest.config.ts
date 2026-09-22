/**
 * vitest.config.ts - Vitest configuration.
 *
 * Key points:
 *   - Loads .env.test instead of .env (isolated test DB).
 *   - Uses Node environment (we're a backend, not jsdom).
 *   - Runs a global setup before all test files.
 *   - Serializes test files to prevent DB race conditions.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: false,
        include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        setupFiles: ['./tests/setup.ts'],
        // Run test files serially — they share a real DB and must not race.
        fileParallelism: false,
        testTimeout: 15_000,
        hookTimeout: 15_000,
        clearMocks: true,
        restoreMocks: true,
    },
    env: {
        // Vitest will load these from the process env at startup.
        // We point process.env at .env.test via tests/setup.ts instead,
        // because dotenv must run before any module imports config/env.
    },
});