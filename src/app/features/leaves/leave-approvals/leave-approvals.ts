import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap, tap } from 'rxjs';
import { LeaveRequest, LeaveReviewPayload, LeaveStatus } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { Avatar } from '../../../shared/components/avatar';
import { EmptyState } from '../../../shared/components/empty-state';
import { Loader } from '../../../shared/components/loader';
import { StatusChip } from '../../../shared/components/status-chip';
import { AuthService } from '../../authentication/auth';
import { LeaveService } from '../leave.service';
import { ReviewLeaveData, ReviewLeaveDialog } from '../review-leave-dialog';

type StatusFilter = LeaveStatus | 'All';

@Component({
  selector: 'app-leave-approvals',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    Avatar,
    Loader,
    EmptyState,
    StatusChip,
  ],
  templateUrl: './leave-approvals.html',
  styleUrl: './leave-approvals.scss',
})
export class LeaveApprovals implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly auth = inject(AuthService);

  protected readonly filters: StatusFilter[] = ['Pending', 'Approved', 'Rejected', 'All'];
  protected readonly columns = ['employee', 'type', 'dates', 'days', 'reason', 'status', 'actions'];

  protected readonly requests = signal<LeaveRequest[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly reviewingId = signal<string | null>(null);
  protected readonly statusFilter = signal<StatusFilter>('Pending');
  protected readonly search = signal('');

  protected readonly counts = computed(() => {
    const counts: Partial<Record<StatusFilter, number>> = { All: this.requests().length };
    for (const r of this.requests()) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  });

  protected readonly filtered = computed(() => {
    const status = this.statusFilter();
    const term = this.search().trim().toLowerCase();
    return this.requests().filter(
      (r) => (status === 'All' || r.status === status) && (!term || r.employeeName.toLowerCase().includes(term)),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.leaveService.getRequests().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected isOwn(leave: LeaveRequest): boolean {
    return leave.employeeId === this.auth.currentUser()?.employeeId;
  }

  protected review(leave: LeaveRequest, decision: LeaveReviewPayload['status']): void {
    this.dialog
      .open<ReviewLeaveDialog, ReviewLeaveData, LeaveReviewPayload>(ReviewLeaveDialog, {
        data: { leave, decision },
        width: '480px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        tap(() => this.reviewingId.set(leave.id)),
        switchMap((payload) => this.leaveService.review(leave.id, payload)),
      )
      .subscribe({
        next: (updated) => {
          this.requests.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
          this.reviewingId.set(null);
          this.notify.success(`${updated.employeeName}'s request was ${updated.status.toLowerCase()}.`);
        },
        error: () => this.reviewingId.set(null),
      });
  }
}
