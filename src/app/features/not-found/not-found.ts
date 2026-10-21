import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { EmptyState } from '../../shared/components/empty-state';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, EmptyState],
  template: `
    <div class="login-container">
      <app-empty-state
        icon="travel_explore"
        title="Page not found"
        message="The page you're looking for doesn't exist or has been moved."
      >
        <a mat-flat-button routerLink="/dashboard">Go to dashboard</a>
      </app-empty-state>
    </div>
  `,
})
export class NotFound {}
