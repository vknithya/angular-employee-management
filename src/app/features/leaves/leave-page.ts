import { Component, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header';
import { AuthService } from '../authentication/auth';
import { LeaveApprovals } from './leave-approvals/leave-approvals';
import { MyLeave } from './my-leave/my-leave';

@Component({
  selector: 'app-leave-page',
  imports: [MatTabsModule, PageHeader, MyLeave, LeaveApprovals],
  template: `
    <app-page-header
      title="Leave"
      [subtitle]="auth.isAdmin() ? 'Review team requests and manage your own leave' : 'Track your balance and apply for time off'"
    />
    @if (auth.isAdmin()) {
      <mat-tab-group animationDuration="150ms" mat-stretch-tabs="false" [selectedIndex]="initialTab">
        <mat-tab label="Team requests"><app-leave-approvals /></mat-tab>
        <mat-tab label="My leave">
          <ng-template matTabContent><app-my-leave /></ng-template>
        </mat-tab>
      </mat-tab-group>
    } @else {
      <app-my-leave />
    }
  `,
  styles: `
    mat-tab-group ::ng-deep .mat-mdc-tab-body-content {
      padding-top: 16px;
    }
  `,
})
export class LeavePage {
  protected readonly auth = inject(AuthService);
  /** "Apply leave" shortcuts link here with ?apply; admins land on their own tab. */
  protected readonly initialTab = inject(ActivatedRoute).snapshot.queryParamMap.has('apply') ? 1 : 0;
}
