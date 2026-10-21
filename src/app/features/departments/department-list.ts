import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { filter, forkJoin, switchMap, tap } from 'rxjs';
import { Department, Employee } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { openConfirmDialog } from '../../shared/components/confirm-dialog';
import { EmptyState } from '../../shared/components/empty-state';
import { Loader } from '../../shared/components/loader';
import { PageHeader } from '../../shared/components/page-header';
import { EmployeeService } from '../employees/employee.service';
import { DepartmentDialog, DepartmentDialogData } from './department-dialog';
import { DepartmentService } from './department.service';

@Component({
  selector: 'app-department-list',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    PageHeader,
    Loader,
    EmptyState,
  ],
  templateUrl: './department-list.html',
  styleUrl: './department-list.scss',
})
export class DepartmentList implements OnInit {
  private readonly departmentService = inject(DepartmentService);
  private readonly employeeService = inject(EmployeeService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  protected readonly departments = signal<Department[]>([]);
  private readonly employees = signal<Employee[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    forkJoin([this.departmentService.getAll(), this.employeeService.getAll()]).subscribe({
      next: ([departments, employees]) => {
        this.departments.set(departments);
        this.employees.set(employees.filter((e) => e.status !== 'Inactive'));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected openDialog(department?: Department): void {
    this.dialog
      .open<DepartmentDialog, DepartmentDialogData, Department>(DepartmentDialog, {
        data: { department, employees: this.employees() },
        width: '640px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe((saved) =>
        this.departments.update((list) =>
          (department ? list.map((d) => (d.id === saved.id ? saved : d)) : [...list, saved]).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        ),
      );
  }

  protected delete(department: Department): void {
    openConfirmDialog(this.dialog, {
      title: `Delete ${department.name}?`,
      message: 'This department will be permanently removed. Departments with employees cannot be deleted.',
      confirmText: 'Delete',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.deletingId.set(department.id)),
        switchMap(() => this.departmentService.delete(department.id)),
      )
      .subscribe({
        next: () => {
          this.departments.update((list) => list.filter((d) => d.id !== department.id));
          this.deletingId.set(null);
          this.notify.success(`${department.name} was deleted.`);
        },
        error: () => this.deletingId.set(null),
      });
  }
}
