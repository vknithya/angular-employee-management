import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../../core/http/http-context';
import { AuthSession, AuthUser, ChangePasswordRequest, LoginResponse } from '../../core/models';
import { LoginRequest } from './login-request.model';

const SESSION_KEY = 'ems.session';

/**
 * Owns the signed-in session. "Remember me" sessions persist in localStorage;
 * otherwise they live in sessionStorage and end when the browser tab closes.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;

  private readonly session = signal<AuthSession | null>(this.restoreSession());

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, request, { context: skipErrorToast() })
      .pipe(
        tap((response) => this.storeSession(response, !!request.rememberMe)),
        map((response) => response.user),
      );
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.baseUrl}/logout`, {}, { context: skipErrorToast() })
      .pipe(finalize(() => this.clearSession()));
  }

  /** Drops the local session and returns to the login page. */
  clearSession(options: { expired?: boolean } = {}): void {
    this.session.set(null);
    this.writeStorage(null, false);
    const queryParams = options.expired ? { expired: true, returnUrl: this.router.url } : {};
    this.router.navigate(['/login'], { queryParams });
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/forgot-password`, { email });
  }

  changePassword(request: ChangePasswordRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/change-password`, request, { context: skipErrorToast() });
  }

  private storeSession(response: LoginResponse, remember: boolean): void {
    const session: AuthSession = {
      token: response.token,
      user: response.user,
      expiresAt: Date.now() + response.expiresIn * 1000,
    };
    this.session.set(session);
    this.writeStorage(session, remember);
  }

  private writeStorage(session: AuthSession | null, remember: boolean): void {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      if (session) (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable: the session lasts for this page load only.
    }
  }

  private restoreSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
      const session = raw ? (JSON.parse(raw) as AuthSession) : null;
      return session && session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }
}
