import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { from, switchMap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Answers `/api/*` requests in the browser with simulated latency.
 * Registered last so the real auth/loading/error interceptors still run.
 * Set `environment.useMockBackend = false` to send requests to a real server.
 * The mock API is loaded lazily so it never weighs down the initial bundle.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockBackend || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  const injector = inject(Injector);
  return timer(environment.mockApiDelayMs).pipe(
    switchMap(() => from(import('./mock-api'))),
    switchMap(({ MockApi }) => injector.get(MockApi).handle(req)),
  );
};
