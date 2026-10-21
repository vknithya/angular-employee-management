import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Centered spinner with a message, used while a page or section loads its data. */
@Component({
  selector: 'app-loader',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loader" role="status" aria-live="polite">
      <mat-spinner [diameter]="diameter()" />
      <span>{{ message() }}</span>
    </div>
  `,
  styles: `
    .loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 64px 16px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Loader {
  readonly message = input('Loading...');
  readonly diameter = input(44);
}
