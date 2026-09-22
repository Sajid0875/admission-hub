/**
 * Mock fallback gate for API services.
 * When false (default), network/404 errors surface to the UI instead of seed data.
 */
export function areMocksEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}

/** True when the error is a soft offline/missing-route case eligible for mock fallback. */
export function isMockableOfflineError(err: {
  code?: string;
  statusCode?: number;
}): boolean {
  return err.code === "NETWORK_ERROR" || err.statusCode === 404;
}
