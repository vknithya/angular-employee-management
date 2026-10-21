import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from './auth';

/** Only signed-in users; others go to login and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from login / forgot password. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.isAuthenticated() || inject(Router).createUrlTree(['/dashboard']);
};

export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return () => {
    const role = inject(AuthService).currentUser()?.role;
    if (role && roles.includes(role)) return true;
    inject(NotificationService).error('You do not have access to that page.');
    return inject(Router).createUrlTree(['/dashboard']);
  };
}
