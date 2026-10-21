import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import {
  Department,
  Employee,
  EMPLOYEE_STATUSES,
  EmployeePayload,
  EMPLOYMENT_TYPES,
  GENDERS,
} from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { parseIsoDate, toIsoDate } from '../../../core/utils/date.utils';
import { minAgeValidator, PHONE_PATTERN } from '../../../core/utils/form.validators';
import { getErrorMessage } from '../../../core/utils/http-error.utils';
import { EmptyState } from '../../../shared/components/empty-state';
import { Loader } from '../../../shared/components/loader';
import { PageHeader } from '../../../shared/components/page-header';
import { HasUnsavedChanges } from '../../../shared/unsaved-changes.guard';
import { DepartmentService } from '../../departments/department.service';
import { EmployeeService } from '../employee.service';

@Component({
  selector: 'app-employee-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeader,
    Loader,
    EmptyState,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly employeeService = inject(EmployeeService);
  private readonly departmentService = inject(DepartmentService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  /** Bound from the `:id` route parameter; absent when creating. */
  readonly id = input<string>();
  protected readonly isEdit = computed(() => !!this.id());

  protected readonly genders = GENDERS;
  protected readonly employmentTypes = EMPLOYMENT_TYPES;
  protected readonly statuses = EMPLOYEE_STATUSES;
  protected readonly today = new Date();

  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly departments = signal<Department[]>([]);
  protected readonly managers = signal<Employee[]>([]);
  private saved = false;

  protected readonly form = this.fb.group({
    personal: this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      gender: ['', Validators.required],
      dateOfBirth: [null as Date | null, [Validators.required, minAgeValidator(18)]],
    }),
    employment: this.fb.group({
      departmentId: ['', Validators.required],
      designation: ['', [Validators.required, Validators.maxLength(80)]],
      employmentType: ['Full-time', Validators.required],
      status: ['Probation', Validators.required],
      dateOfJoining: [new Date() as Date | null, Validators.required],
      salary: [null as number | null, [Validators.required, Validators.min(0)]],
      managerId: [''],
    }),
    contact: this.fb.group({
      address: ['', Validators.maxLength(200)],
      emergencyContact: ['', Validators.pattern(PHONE_PATTERN)],
    }),
  });

  protected readonly personal = this.form.controls.personal.controls;
  protected readonly employment = this.form.controls.employment.controls;
  protected readonly contact = this.form.controls.contact.controls;

  ngOnInit(): void {
    const id = this.id();
    forkJoin({
      departments: this.departmentService.getAll(),
      employees: this.employeeService.getAll(),
      employee: id ? this.employeeService.getById(id) : of(null),
    }).subscribe({
      next: ({ departments, employees, employee }) => {
        this.departments.set(departments);
        this.managers.set(employees.filter((e) => e.id !== id && e.status !== 'Inactive'));
        if (employee) this.patchForm(employee);
        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
        this.errorMessage.set(getErrorMessage(error));
        this.isLoading.set(false);
      },
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Please fix the highlighted fields.');
      return;
    }
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.form.disable({ emitEvent: false });

    const id = this.id();
    const request = id ? this.employeeService.update(id, this.toPayload()) : this.employeeService.create(this.toPayload());
    request.subscribe({
      next: (employee) => {
        this.saved = true;
        this.notify.success(`${employee.firstName} ${employee.lastName} was ${id ? 'updated' : 'added'}.`);
        this.router.navigate(['/employees', employee.id]);
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.form.enable({ emitEvent: false });
        this.errorMessage.set(getErrorMessage(error));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.personal.email.setErrors({ taken: true });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  private patchForm(e: Employee): void {
    this.form.patchValue({
      personal: {
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone,
        gender: e.gender,
        dateOfBirth: parseIsoDate(e.dateOfBirth),
      },
      employment: {
        departmentId: e.departmentId,
        designation: e.designation,
        employmentType: e.employmentType,
        status: e.status,
        dateOfJoining: parseIsoDate(e.dateOfJoining),
        salary: e.salary,
        managerId: e.managerId ?? '',
      },
      contact: { address: e.address, emergencyContact: e.emergencyContact },
    });
  }

  private toPayload(): EmployeePayload {
    const { personal: p, employment: j, contact: c } = this.form.getRawValue();
    return {
      firstName: p.firstName!.trim(),
      lastName: p.lastName!.trim(),
      email: p.email!.trim(),
      phone: p.phone!.trim(),
      gender: p.gender as EmployeePayload['gender'],
      dateOfBirth: toIsoDate(p.dateOfBirth!),
      departmentId: j.departmentId!,
      designation: j.designation!.trim(),
      employmentType: j.employmentType as EmployeePayload['employmentType'],
      status: j.status as EmployeePayload['status'],
      dateOfJoining: toIsoDate(j.dateOfJoining!),
      salary: Number(j.salary),
      managerId: j.managerId || null,
      address: c.address?.trim() ?? '',
      emergencyContact: c.emergencyContact?.trim() ?? '',
    };
  }
}
