import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './shared/unsaved-changes.guard';
import { authGuard, roleGuard } from './features/authentication/auth.guards';
import { AUTHENTICATION_ROUTES } from './features/authentication/authentication.routes';

export const routes: Routes = [
  ...AUTHENTICATION_ROUTES,

  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Dashboard'
      },
      {
        path: 'employees',
        loadChildren: () => import('./features/employees/employees.routes').then((m) => m.EMPLOYEE_ROUTES)
      },
      {
        path: 'departments',
        loadComponent: () => import('./features/departments/department-list').then((m) => m.DepartmentList),
        canActivate: [roleGuard('admin')],
        title: 'Departments'
      },
      {
        path: 'leaves',
        loadComponent: () => import('./features/leaves/leave-page').then((m) => m.LeavePage),
        title: 'Leave'
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
        canDeactivate: [unsavedChangesGuard],
        title: 'My profile'
      }
    ]
  },

  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
    title: 'Page not found'
  }
];
