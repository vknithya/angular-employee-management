import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { filter, forkJoin, map, switchMap, tap } from 'rxjs';
import { Department, Employee, EMPLOYEE_STATUSES } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { downloadCsv } from '../../../core/utils/csv.utils';
import { Avatar } from '../../../shared/components/avatar';
import { openConfirmDialog } from '../../../shared/components/confirm-dialog';
import { EmptyState } from '../../../shared/components/empty-state';
import { Loader } from '../../../shared/components/loader';
import { PageHeader } from '../../../shared/components/page-header';
import { StatusChip } from '../../../shared/components/status-chip';
import { AuthService } from '../../authentication/auth';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../employee.service';

const FULL_COLUMNS = ['employee', 'employeeCode', 'department', 'designation', 'status', 'dateOfJoining', 'actions'];
const COMPACT_COLUMNS = ['employee', 'status', 'actions'];

@Component({
  selector: 'app-employee-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatCardModule,
    MatProgressSpinnerModule,
    PageHeader,
    Loader,
    EmptyState,
    Avatar,
    StatusChip,
  ],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeList implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly departmentService = inject(DepartmentService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly statuses = EMPLOYEE_STATUSES;
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly departments = signal<Department[]>([]);

  protected readonly search = signal('');
  protected readonly departmentFilter = signal('');
  protected readonly statusFilter = signal('');
  protected readonly hasFilters = computed(
    () => !!(this.search() || this.departmentFilter() || this.statusFilter()),
  );

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const dept = this.departmentFilter();
    const status = this.statusFilter();
    return this.employees().filter(
      (e) =>
        (!dept || e.departmentId === dept) &&
        (!status || e.status === status) &&
        (!term ||
          [e.firstName + ' ' + e.lastName, e.email, e.employeeCode, e.designation].some((v) =>
            v.toLowerCase().includes(term),
          )),
    );
  });

  private readonly isHandset = toSignal(
    inject(BreakpointObserver).observe([Breakpoints.XSmall]).pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly displayedColumns = computed(() => (this.isHandset() ? COMPACT_COLUMNS : FULL_COLUMNS));

  protected readonly dataSource = new MatTableDataSource<Employee>([]);
  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  constructor() {
    this.dataSource.sortingDataAccessor = (e, column) => {
      switch (column) {
        case 'employee':
          return `${e.firstName} ${e.lastName}`.toLowerCase();
        case 'department':
          return e.departmentName ?? '';
        default:
          return (e as unknown as Record<string, string>)[column] ?? '';
      }
    };
    effect(() => {
      this.dataSource.data = this.filtered();
      this.paginator()?.firstPage();
    });
    effect(() => {
      this.dataSource.sort = this.sort() ?? null;
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    forkJoin([this.employeeService.getAll(), this.departmentService.getAll()]).subscribe({
      next: ([employees, departments]) => {
        this.employees.set(employees);
        this.departments.set(departments);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected clearFilters(): void {
    this.search.set('');
    this.departmentFilter.set('');
    this.statusFilter.set('');
  }

  protected openEmployee(employee: Employee): void {
    this.router.navigate(['/employees', employee.id]);
  }

  protected deleteEmployee(employee: Employee): void {
    const name = `${employee.firstName} ${employee.lastName}`;
    openConfirmDialog(this.dialog, {
      title: 'Delete employee?',
      message: `${name} and all of their leave records will be permanently removed.`,
      confirmText: 'Delete',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.deletingId.set(employee.id)),
        switchMap(() => this.employeeService.delete(employee.id)),
      )
      .subscribe({
        next: () => {
          this.employees.update((list) => list.filter((e) => e.id !== employee.id));
          this.deletingId.set(null);
          this.notify.success(`${name} was deleted.`);
        },
        error: () => this.deletingId.set(null),
      });
  }

  protected exportCsv(): void {
    const admin = this.auth.isAdmin();
    downloadCsv(`employees-${new Date().toISOString().slice(0, 10)}.csv`, this.filtered(), [
      { header: 'Employee ID', value: (e) => e.employeeCode },
      { header: 'First name', value: (e) => e.firstName },
      { header: 'Last name', value: (e) => e.lastName },
      { header: 'Email', value: (e) => e.email },
      { header: 'Phone', value: (e) => e.phone },
      { header: 'Department', value: (e) => e.departmentName },
      { header: 'Designation', value: (e) => e.designation },
      { header: 'Employment type', value: (e) => e.employmentType },
      { header: 'Status', value: (e) => e.status },
      { header: 'Date of joining', value: (e) => e.dateOfJoining },
      ...(admin ? [{ header: 'Annual salary', value: (e: Employee) => e.salary }] : []),
    ]);
    this.notify.info(`Exported ${this.filtered().length} employees.`);
  }
}
