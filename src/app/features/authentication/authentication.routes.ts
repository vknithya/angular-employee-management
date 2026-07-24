import { Routes } from '@angular/router';
import { Login } from './login/login';

export const AUTHENTICATION_ROUTES: Routes = [
  {
    path: 'login',
    component: Login
  }
];