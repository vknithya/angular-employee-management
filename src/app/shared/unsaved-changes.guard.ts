import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CanDeactivateFn } from '@angular/router';
import { map } from 'rxjs';
import { openConfirmDialog } from './components/confirm-dialog';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a page with an edited, unsaved form. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  return openConfirmDialog(inject(MatDialog), {
    title: 'Discard changes?',
    message: 'You have unsaved changes. If you leave this page they will be lost.',
    confirmText: 'Discard',
    cancelText: 'Keep editing',
    destructive: true,
  }).pipe(map(Boolean));
};
