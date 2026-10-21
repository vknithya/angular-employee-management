import { Component, computed, input } from '@angular/core';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<string, Tone> = {
  Active: 'success',
  Approved: 'success',
  Probation: 'info',
  Pending: 'warning',
  'Notice Period': 'warning',
  Rejected: 'danger',
  Inactive: 'neutral',
  Cancelled: 'neutral',
};

/** Color-coded status pill. Text always accompanies the color. */
@Component({
  selector: 'app-status-chip',
  template: `<span class="dot"></span>{{ status() }}`,
  host: { '[class]': '"status-chip tone-" + tone()' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 10px;
      border-radius: 999px;
      font: var(--mat-sys-label-medium);
      white-space: nowrap;
      background: var(--chip-bg);
      color: var(--chip-fg);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  `,
})
export class StatusChip {
  readonly status = input.required<string>();
  protected readonly tone = computed(() => TONES[this.status()] ?? 'neutral');
}
