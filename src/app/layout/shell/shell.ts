import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { UserRole } from '../../core/models';
import { DemoService } from '../../core/services/demo.service';
import { LoadingService } from '../../core/services/loading.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../features/authentication/auth';
import { Avatar } from '../../shared/components/avatar';
import { openConfirmDialog } from '../../shared/components/confirm-dialog';
import { Loader } from '../../shared/components/loader';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['admin', 'employee'] },
  { label: 'Employees', icon: 'badge', route: '/employees', roles: ['admin', 'employee'] },
  { label: 'Departments', icon: 'apartment', route: '/departments', roles: ['admin'] },
  { label: 'Leave', icon: 'event_available', route: '/leaves', roles: ['admin', 'employee'] },
  { label: 'My Profile', icon: 'account_circle', route: '/profile', roles: ['admin', 'employee'] },
];

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    Avatar,
    Loader,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly demo = inject(DemoService);
  protected readonly theme = inject(ThemeService);
  protected readonly loading = inject(LoadingService);

  protected readonly user = this.auth.currentUser;
  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  protected readonly navItems = computed(() => {
    const role = this.user()?.role;
    return NAV_ITEMS.filter((item) => role && item.roles.includes(role));
  });

  protected readonly busyMessage = signal<string | null>(null);

  logout(): void {
    this.busyMessage.set('Signing out...');
    this.auth.logout().subscribe({ error: () => this.busyMessage.set(null) });
  }

  resetDemoData(): void {
    openConfirmDialog(this.dialog, {
      title: 'Reset demo data?',
      message: 'All employees, departments and leave requests will be restored to the original sample data.',
      confirmText: 'Reset',
      destructive: true,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.busyMessage.set('Restoring sample data...');
          return this.demo.resetData();
        }),
      )
      .subscribe({
        next: () => location.reload(),
        error: () => this.busyMessage.set(null),
      });
  }
}
