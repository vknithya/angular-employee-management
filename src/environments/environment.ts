/**
 * Runtime configuration.
 *
 * While `useMockBackend` is true every `/api/*` call is answered in the browser by
 * the mock backend interceptor (data lives in localStorage). To connect a real
 * backend later: point `apiBaseUrl` at the server and set `useMockBackend` to false.
 * No feature code needs to change.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  useMockBackend: true,
  /** Simulated network latency so loading states are visible in demos. */
  mockApiDelayMs: 2000,
};
