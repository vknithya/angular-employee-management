import { Routes } from '@angular/router';
import { guestGuard } from './auth.guards';

export const AUTHENTICATION_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [guestGuard],
    title: 'Sign in'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password').then((m) => m.ForgotPassword),
    canActivate: [guestGuard],
    title: 'Forgot password'
  }
];
