import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DEMO_ACCOUNTS } from '../../../core/mock-api/seed-data';
import { NotificationService } from '../../../core/services/notification.service';
import { getErrorMessage } from '../../../core/utils/http-error.utils';
import { AuthService } from '../auth';
import { LoginRequest } from '../login-request.model';

@Component({
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);

  readonly demoAccounts = DEMO_ACCOUNTS;
  readonly sessionExpired = this.route.snapshot.queryParamMap.has('expired');

  // Signals (not plain fields) so the zoneless change detection picks up async updates.
  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });

  togglePasswordVisibility() {
    this.hidePassword.update((hidden) => !hidden);
  }

  useDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]): void {
    this.loginForm.patchValue({ email: account.email, password: account.password });
    this.errorMessage.set(null);
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.loginForm.disable();

    const request: LoginRequest = this.loginForm.getRawValue();
    this.authService.login(request).subscribe({
      next: (user) => {
        this.notify.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/dashboard');
      },
      error: (error: unknown) => {
        this.errorMessage.set(getErrorMessage(error, 'Unable to sign in. Please try again.'));
        this.isLoading.set(false);
        this.loginForm.enable();
      }
    });
  }
}
