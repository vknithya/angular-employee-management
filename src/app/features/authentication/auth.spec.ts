import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginResponse } from '../../core/models';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const response: LoginResponse = {
    token: 'mock.abc.9999999999999',
    expiresIn: 3600,
    user: {
      id: 'usr-1',
      employeeId: 'emp-1',
      email: 'admin@company.com',
      fullName: 'Priya Raman',
      designation: 'HR Manager',
      role: 'admin',
    },
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts signed out', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token).toBeNull();
  });

  it('stores the session in sessionStorage when "remember me" is off', () => {
    service.login({ email: 'admin@company.com', password: 'Admin@123' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
    expect(service.token).toBe(response.token);
    expect(sessionStorage.getItem('ems.session')).toBeTruthy();
    expect(localStorage.getItem('ems.session')).toBeNull();
  });

  it('stores the session in localStorage when "remember me" is on', () => {
    service.login({ email: 'admin@company.com', password: 'Admin@123', rememberMe: true }).subscribe();
    http.expectOne('/api/auth/login').flush(response);

    expect(localStorage.getItem('ems.session')).toBeTruthy();
  });

  it('clears the session on logout', () => {
    service.login({ email: 'admin@company.com', password: 'Admin@123' }).subscribe();
    http.expectOne('/api/auth/login').flush(response);

    service.logout().subscribe();
    http.expectOne('/api/auth/logout').flush({ success: true });

    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('ems.session')).toBeNull();
  });
});
