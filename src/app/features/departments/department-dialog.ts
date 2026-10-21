import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Department, Employee } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { getErrorMessage } from '../../core/utils/http-error.utils';
import { DepartmentService } from './department.service';

export interface DepartmentDialogData {
  department?: Department;
  employees: Employee[];
}

@Component({
  selector: 'app-department-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.department ? 'Edit department' : 'New department' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        @if (errorMessage()) {
          <div class="alert alert-error" role="alert">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>
        }
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" cdkFocusInitial />
            <mat-error>Name is required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Code</mat-label>
            <input matInput formControlName="code" placeholder="e.g. ENG" class="uppercase" />
            <mat-hint>2–6 letters</mat-hint>
            <mat-error>Enter a 2–6 letter code</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Department head</mat-label>
            <mat-select formControlName="headId">
              <mat-option value="">Not assigned</mat-option>
              @for (e of data.employees; track e.id) {
                <mat-option [value]="e.id">{{ e.firstName }} {{ e.lastName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="span-full">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="isSaving()">Cancel</button>
        <button mat-flat-button type="submit" [disabled]="isSaving()">
          @if (isSaving()) {
            <span class="button-content"><mat-spinner diameter="18" /> Saving...</span>
          } @else {
            {{ data.department ? 'Save changes' : 'Create' }}
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .uppercase {
      text-transform: uppercase;
    }
  `,
})
export class DepartmentDialog {
  protected readonly data = inject<DepartmentDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DepartmentDialog, Department>);
  private readonly departmentService = inject(DepartmentService);
  private readonly notify = inject(NotificationService);

  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data.department?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    code: [this.data.department?.code ?? '', [Validators.required, Validators.pattern(/^[A-Za-z]{2,6}$/)]],
    location: [this.data.department?.location ?? ''],
    headId: [this.data.department?.headId ?? ''],
    description: [this.data.department?.description ?? '', Validators.maxLength(300)],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.dialogRef.disableClose = true;

    const value = this.form.getRawValue();
    this.departmentService.save({ ...value, headId: value.headId || null }, this.data.department?.id).subscribe({
      next: (department) => {
        this.notify.success(`${department.name} was ${this.data.department ? 'updated' : 'created'}.`);
        this.dialogRef.close(department);
      },
      error: (error: unknown) => {
        this.isSaving.set(false);
        this.dialogRef.disableClose = false;
        this.errorMessage.set(getErrorMessage(error));
      },
    });
  }
}
