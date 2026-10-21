import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, forkJoin, switchMap, tap } from 'rxjs';
import { LeaveBalance, LeaveRequest } from '../../../core/models';
import { NotificationService } from '../../../core/services/notification.service';
import { openConfirmDialog } from '../../../shared/components/confirm-dialog';
import { EmptyState } from '../../../shared/components/empty-state';
import { Loader } from '../../../shared/components/loader';
import { StatusChip } from '../../../shared/components/status-chip';
import { ApplyLeaveDialog } from '../apply-leave-dialog';
import { LeaveService } from '../leave.service';

@Component({
  selector: 'app-my-leave',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    Loader,
    EmptyState,
    StatusChip,
  ],
  templateUrl: './my-leave.html',
  styleUrl: './my-leave.scss',
})
export class MyLeave implements OnInit {
  private readonly leaveService = inject(LeaveService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly balances = signal<LeaveBalance[]>([]);
  protected readonly requests = signal<LeaveRequest[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly cancellingId = signal<string | null>(null);
  protected readonly columns = ['type', 'dates', 'days', 'reason', 'status', 'actions'];

  ngOnInit(): void {
    this.load(this.route.snapshot.queryParamMap.has('apply'));
  }

  protected load(openApplyAfterLoad = false): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    forkJoin([this.leaveService.getBalance(), this.leaveService.getRequests(true)]).subscribe({
      next: ([balances, requests]) => {
        this.balances.set(balances);
        this.requests.set(requests);
        this.isLoading.set(false);
        if (openApplyAfterLoad) {
          this.router.navigate([], { queryParams: {}, replaceUrl: true });
          this.apply();
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected apply(): void {
    this.dialog
      .open(ApplyLeaveDialog, { data: this.balances(), width: '520px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe((leave: LeaveRequest) => {
        this.requests.update((list) => [leave, ...list]);
        this.refreshBalances();
      });
  }

  protected cancel(leave: LeaveRequest): void {
    openConfirmDialog(this.dialog, {
      title: 'Cancel leave request?',
      message: `Your ${leave.type.toLowerCase()} leave request for ${leave.days} day(s) will be withdrawn.`,
      confirmText: 'Cancel request',
      cancelText: 'Keep it',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        tap(() => this.cancellingId.set(leave.id)),
        switchMap(() => this.leaveService.cancel(leave.id)),
      )
      .subscribe({
        next: (updated) => {
          this.requests.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
          this.cancellingId.set(null);
          this.notify.success('Leave request cancelled.');
          this.refreshBalances();
        },
        error: () => this.cancellingId.set(null),
      });
  }

  private refreshBalances(): void {
    this.leaveService.getBalance().subscribe((balances) => this.balances.set(balances));
  }
}
