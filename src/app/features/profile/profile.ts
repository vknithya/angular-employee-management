import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { Employee } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import {
  matchFieldsValidator,
  PHONE_PATTERN,
  strongPasswordValidator,
} from '../../core/utils/form.validators';
import { getErrorMessage } from '../../core/utils/http-error.utils';
import { Avatar } from '../../shared/components/avatar';
import { EmptyState } from '../../shared/components/empty-state';
import { Loader } from '../../shared/components/loader';
import { PageHeader } from '../../shared/components/page-header';
import { StatusChip } from '../../shared/components/status-chip';
import { HasUnsavedChanges } from '../../shared/unsaved-changes.guard';
import { AuthService } from '../authentication/auth';
import { ProfileService } from './profile.service';

@Component({
  selector: 'app-profile',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageHeader,
    Loader,
    EmptyState,
    Avatar,
    StatusChip,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  protected readonly user = this.auth.currentUser;
  protected readonly employee = signal<Employee | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isChangingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly hidePasswords = signal(true);

  protected readonly contactForm = this.fb.nonNullable.group({
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    emergencyContact: ['', Validators.pattern(PHONE_PATTERN)],
    address: ['', Validators.maxLength(200)],
  });

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8), strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFieldsValidator('newPassword', 'confirmPassword') },
  );

  ngOnInit(): void {
    this.load();
  }

  hasUnsavedChanges(): boolean {
    return this.contactForm.dirty;
  }

  protected load(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.profileService.get().subscribe({
      next: (employee) => {
        this.setEmployee(employee);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  protected saveContact(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);
    this.contactForm.disable();
    this.profileService.update(this.contactForm.getRawValue()).subscribe({
      next: (employee) => {
        this.setEmployee(employee);
        this.isSaving.set(false);
        this.contactForm.enable();
        this.notify.success('Your contact details were updated.');
      },
      error: () => {
        this.isSaving.set(false);
        this.contactForm.enable();
      },
    });
  }

  protected resetContact(): void {
    const e = this.employee();
    if (e) this.setEmployee(e);
  }

  protected changePassword(formDirective: FormGroupDirective): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.isChangingPassword.set(true);
    this.passwordError.set(null);
    this.passwordForm.disable();
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isChangingPassword.set(false);
        this.passwordForm.enable();
        // Resetting through the directive also clears the "submitted" error state.
        formDirective.resetForm();
        this.notify.success('Password changed. Use your new password next time you sign in.');
      },
      error: (error: unknown) => {
        this.isChangingPassword.set(false);
        this.passwordForm.enable();
        this.passwordError.set(getErrorMessage(error));
      },
    });
  }

  private setEmployee(employee: Employee): void {
    this.employee.set(employee);
    this.contactForm.reset({
      phone: employee.phone,
      emergencyContact: employee.emergencyContact,
      address: employee.address,
    });
  }
}
