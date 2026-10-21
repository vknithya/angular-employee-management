import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LeaveRequest, LeaveReviewPayload } from '../../core/models';

export interface ReviewLeaveData {
  leave: LeaveRequest;
  decision: LeaveReviewPayload['status'];
}

/** Collects the reviewer's comment. Rejections require one. */
@Component({
  selector: 'app-review-leave-dialog',
  imports: [ReactiveFormsModule, DatePipe, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ approving ? 'Approve' : 'Reject' }} leave request</h2>
    <mat-dialog-content>
      <p>
        <strong>{{ data.leave.employeeName }}</strong> · {{ data.leave.type }} leave,
        {{ data.leave.startDate | date: 'd MMM' }} – {{ data.leave.endDate | date: 'd MMM y' }}
        ({{ data.leave.days }} day(s))
      </p>
      <p class="muted">“{{ data.leave.reason }}”</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ approving ? 'Comment (optional)' : 'Reason for rejection' }}</mat-label>
        <textarea matInput [formControl]="comment" rows="3" cdkFocusInitial></textarea>
        <mat-error>A reason is required when rejecting</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [class.danger-button]="!approving" (click)="confirm()">
        {{ approving ? 'Approve' : 'Reject' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ReviewLeaveDialog {
  protected readonly data = inject<ReviewLeaveData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ReviewLeaveDialog, LeaveReviewPayload>);

  protected readonly approving = this.data.decision === 'Approved';
  protected readonly comment = new FormControl('', {
    nonNullable: true,
    validators: this.approving ? [] : [Validators.required],
  });

  protected confirm(): void {
    if (this.comment.invalid) {
      this.comment.markAsTouched();
      return;
    }
    this.dialogRef.close({ status: this.data.decision, comment: this.comment.value.trim() });
  }
}
