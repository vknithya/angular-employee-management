import { Routes } from '@angular/router';
import { AUTHENTICATION_ROUTES } from './features/authentication/authentication.routes';

export const routes: Routes = [
      ...AUTHENTICATION_ROUTES,

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];
