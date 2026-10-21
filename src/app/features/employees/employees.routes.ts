import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../shared/unsaved-changes.guard';
import { roleGuard } from '../authentication/auth.guards';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./employee-list/employee-list').then((m) => m.EmployeeList),
    title: 'Employees',
  },
  {
    path: 'new',
    loadComponent: () => import('./employee-form/employee-form').then((m) => m.EmployeeForm),
    canActivate: [roleGuard('admin')],
    canDeactivate: [unsavedChangesGuard],
    title: 'Add employee',
  },
  {
    path: ':id',
    loadComponent: () => import('./employee-detail/employee-detail').then((m) => m.EmployeeDetail),
    title: 'Employee details',
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./employee-form/employee-form').then((m) => m.EmployeeForm),
    canActivate: [roleGuard('admin')],
    canDeactivate: [unsavedChangesGuard],
    title: 'Edit employee',
  },
];
