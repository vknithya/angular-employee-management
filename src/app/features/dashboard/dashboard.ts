import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AdminDashboard, EmployeeDashboard } from '../../core/models';
import { Avatar } from '../../shared/components/avatar';
import { EmptyState } from '../../shared/components/empty-state';
import { Loader } from '../../shared/components/loader';
import { StatusChip } from '../../shared/components/status-chip';
import { AuthService } from '../authentication/auth';
import { DashboardService } from './dashboard.service';

interface StatTile {
  label: string;
  value: number;
  icon: string;
  link?: string;
  hint?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    Avatar,
    Loader,
    EmptyState,
    StatusChip,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  protected readonly auth = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly admin = signal<AdminDashboard | null>(null);
  protected readonly mine = signal<EmployeeDashboard | null>(null);
  protected readonly today = new Date();

  protected readonly greeting = computed(() => {
    const hour = this.today.getHours();
    const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    return `Good ${part}, ${this.auth.currentUser()?.fullName.split(' ')[0] ?? ''}`;
  });

  protected readonly adminTiles = computed<StatTile[]>(() => {
    const d = this.admin();
    if (!d) return [];
    return [
      { label: 'Total employees', value: d.totalEmployees, icon: 'groups', link: '/employees' },
      { label: 'Active employees', value: d.activeEmployees, icon: 'how_to_reg', hint: 'Excludes inactive' },
      { label: 'On leave today', value: d.onLeaveToday, icon: 'beach_access', link: '/leaves' },
      { label: 'Pending requests', value: d.pendingLeaveRequests, icon: 'pending_actions', link: '/leaves' },
      { label: 'Departments', value: d.totalDepartments, icon: 'apartment', link: '/departments' },
      { label: 'New hires this month', value: d.newHiresThisMonth, icon: 'person_add' },
    ];
  });

  /** Largest department sets the bar scale. */
  protected readonly maxDepartmentCount = computed(() =>
    Math.max(1, ...(this.admin()?.departmentDistribution.map((d) => d.count) ?? [])),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const done = { complete: () => this.isLoading.set(false), error: () => this.fail() };

    if (this.auth.isAdmin()) {
      this.dashboardService.getAdminDashboard().subscribe({ next: (d) => this.admin.set(d), ...done });
    } else {
      this.dashboardService.getMyDashboard().subscribe({ next: (d) => this.mine.set(d), ...done });
    }
  }

  private fail(): void {
    this.isLoading.set(false);
    this.loadFailed.set(true);
  }
}
