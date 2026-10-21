import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService } from '../../features/authentication/auth';
import { LoadingService } from '../services/loading.service';
import { NotificationService } from '../services/notification.service';
import { getErrorMessage } from '../utils/http-error.utils';
import { SKIP_ERROR_TOAST } from './http-context';

/** Attaches the session token to every API request. */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token;
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};

/** Counts in-flight requests for the global progress bar. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};

/** Central error handling: expired sessions sign out, everything else shows a toast. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.isAuthenticated()) {
        auth.clearSession({ expired: true });
      } else if (!req.context.get(SKIP_ERROR_TOAST)) {
        notify.error(getErrorMessage(error));
      }
      return throwError(() => error);
    }),
  );
};
