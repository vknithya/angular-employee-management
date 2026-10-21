import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not call the API when the form is invalid', () => {
    const login = vi.spyOn(TestBed.inject(AuthService), 'login');
    component.onLogin();
    expect(login).not.toHaveBeenCalled();
    expect(component.loginForm.controls.email.touched).toBe(true);
  });

  it('fills the form from a demo account', () => {
    component.useDemoAccount(component.demoAccounts[0]);
    expect(component.loginForm.valid).toBe(true);
    expect(component.loginForm.controls.email.value).toBe('admin@company.com');
  });

  it('toggles password visibility', () => {
    component.togglePasswordVisibility();
    expect(component.hidePassword()).toBe(false);
  });
});
