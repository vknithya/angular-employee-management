import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs';
import { Employee, LeaveRequest } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { ageOn } from '../../../core/utils/date.utils';
import { Avatar } from '../../../shared/components/avatar';
import { openConfirmDialog } from '../../../shared/components/confirm-dialog';
import { EmptyState } from '../../../shared/components/empty-state';
import { Loader } from '../../../shared/components/loader';
import { StatusChip } from '../../../shared/components/status-chip';
import { AuthService } from '../../authentication/auth';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employee-detail',
  imports: [
    DatePipe,
    CurrencyPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    Avatar,
    Loader,
    EmptyState,
    StatusChip,
  ],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.scss',
})
export class EmployeeDetail {
  private readonly employeeService = inject(EmployeeService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  readonly id = input.required<string>();

  protected readonly employee = signal<Employee | null>(null);
  protected readonly leaves = signal<LeaveRequest[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<'not-found' | 'failed' | null>(null);
  protected readonly isDeleting = signal(false);

  protected readonly fullName = computed(() => {
    const e = this.employee();
    return e ? `${e.firstName} ${e.lastName}` : '';
  });
  /** Personal details are visible to admins and to the employee themselves. */
  protected readonly canSeePrivate = computed(
    () => this.auth.isAdmin() || this.auth.currentUser()?.employeeId === this.employee()?.id,
  );
  protected readonly age = computed(() => {
    const e = this.employee();
    return e ? ageOn(e.dateOfBirth) : null;
  });
  protected readonly leaveColumns = ['type', 'dates', 'days', 'status'];

  constructor() {
    // Re-load when navigating between employees (e.g. to the manager) on the same route.
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
  }

  protected load(id = this.id()): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.leaves.set([]);
    this.employeeService.getById(id).subscribe({
      next: (employee) => {
        this.employee.set(employee);
        this.isLoading.set(false);
        if (this.auth.isAdmin()) {
          this.employeeService.getLeaves(employee.id).subscribe((leaves) => this.leaves.set(leaves));
        }
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.error.set(error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed');
      },
    });
  }

  protected delete(): void {
    openConfirmDialog(this.dialog, {
      title: 'Delete employee?',
      message: `${this.fullName()} and all of their leave records will be permanently removed.`,
      confirmText: 'Delete',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.isDeleting.set(true)),
        switchMap(() => this.employeeService.delete(this.id())),
      )
      .subscribe({
        next: () => {
          this.notify.success(`${this.fullName()} was deleted.`);
          this.router.navigate(['/employees']);
        },
        error: () => this.isDeleting.set(false),
      });
  }
}
