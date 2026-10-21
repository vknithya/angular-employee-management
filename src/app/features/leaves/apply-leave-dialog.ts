import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LEAVE_TYPES, LeaveBalance, LeaveRequest, LeaveType } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { countWorkingDays, toIsoDate } from '../../core/utils/date.utils';
import { getErrorMessage } from '../../core/utils/http-error.utils';
import { LeaveService } from './leave.service';

@Component({
  selector: 'app-apply-leave-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>Apply for leave</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        @if (errorMessage()) {
          <div class="alert alert-error" role="alert">
            <mat-icon>error_outline</mat-icon><span>{{ errorMessage() }}</span>
          </div>
        }
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Leave type</mat-label>
          <mat-select formControlName="type">
            @for (type of types; track type) {
              <mat-option [value]="type">
                {{ type }}
                @let available = availableFor(type);
                @if (available !== null) {
                  <span class="muted"> · {{ available }} day(s) left</span>
                }
              </mat-option>
            }
          </mat-select>
          <mat-error>Choose a leave type</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dates</mat-label>
          <mat-date-range-input [rangePicker]="picker" [min]="minDate" [dateFilter]="weekdaysOnly">
            <input matStartDate formControlName="start" placeholder="Start date" />
            <input matEndDate formControlName="end" placeholder="End date" />
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-date-range-picker #picker />
          <mat-hint>Weekends are excluded automatically</mat-hint>
          <mat-error>Select a start and end date</mat-error>
        </mat-form-field>

        @if (days(); as d) {
          <div class="alert" [class.alert-error]="exceedsBalance()" [class.alert-info]="!exceedsBalance()">
            <mat-icon>{{ exceedsBalance() ? 'warning_amber' : 'event_available' }}</mat-icon>
            <span>
              {{ d }} working day(s) requested.
              @if (exceedsBalance()) {
                This is more than your available balance.
              }
            </span>
          </div>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason</mat-label>
          <textarea matInput formControlName="reason" rows="3" maxlength="250"></textarea>
          <mat-hint align="end">{{ form.controls.reason.value.length }}/250</mat-hint>
          <mat-error>Please give a short reason</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close [disabled]="isSaving()">Cancel</button>
        <button mat-flat-button type="submit" [disabled]="isSaving() || exceedsBalance()">
          @if (isSaving()) {
            <span class="button-content"><mat-spinner diameter="18" /> Submitting...</span>
          } @else {
            Submit request
          }
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ApplyLeaveDialog {
  private readonly balances = inject<LeaveBalance[]>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ApplyLeaveDialog, LeaveRequest>);
  private readonly leaveService = inject(LeaveService);
  private readonly notify = inject(NotificationService);

  protected readonly types = LEAVE_TYPES;
  protected readonly minDate = new Date();
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['Casual' as LeaveType, Validators.required],
    start: [null as Date | null, Validators.required],
    end: [null as Date | null, Validators.required],
    reason: ['', [Validators.required, Validators.maxLength(250)]],
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly days = computed(() => {
    const { start, end } = this.value();
    return start && end ? countWorkingDays(toIsoDate(start), toIsoDate(end)) : 0;
  });

  protected readonly exceedsBalance = computed(() => {
    const available = this.availableFor(this.value().type ?? 'Casual');
    return available !== null && this.days() > available;
  });

  protected readonly weekdaysOnly = (date: Date | null) => !date || (date.getDay() !== 0 && date.getDay() !== 6);

  /** Remaining days for capped leave types; null for unpaid leave. */
  protected availableFor(type: LeaveType): number | null {
    return this.balances.find((b) => b.type === type)?.available ?? null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { type, start, end, reason } = this.form.getRawValue();
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.dialogRef.disableClose = true;

    this.leaveService
      .apply({ type, startDate: toIsoDate(start!), endDate: toIsoDate(end!), reason: reason.trim() })
      .subscribe({
        next: (leave) => {
          this.notify.success('Leave request submitted for approval.');
          this.dialogRef.close(leave);
        },
        error: (error: unknown) => {
          this.isSaving.set(false);
          this.dialogRef.disableClose = false;
          this.errorMessage.set(getErrorMessage(error));
        },
      });
  }
}
