import { HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Department, LeaveBalance, LoginResponse } from '../models';
import { addDays, toIsoDate } from '../utils/date.utils';
import { MockApi } from './mock-api';
import { MockDb } from './mock-db';

describe('MockApi', () => {
  let api: MockApi;

  async function call<T>(method: string, url: string, body: unknown = null, token?: string): Promise<T> {
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
    const req = new HttpRequest(method as 'POST', `/api/${url}`, body, { headers });
    const res = (await firstValueFrom(api.handle(req))) as HttpResponse<T>;
    return res.body as T;
  }

  async function callError(method: string, url: string, body: unknown = null, token?: string) {
    try {
      await call(method, url, body, token);
    } catch (error) {
      return error as HttpErrorResponse;
    }
    throw new Error('Expected request to fail');
  }

  async function login(email: string, password: string): Promise<string> {
    return (await call<LoginResponse>('POST', 'auth/login', { email, password })).token;
  }

  /** Next Monday, so test leave ranges never fall on a weekend. */
  function nextMonday(weeksAhead = 1): Date {
    const date = new Date();
    return addDays(date, ((8 - date.getDay()) % 7 || 7) + (weeksAhead - 1) * 7);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(MockDb).reset();
    api = TestBed.inject(MockApi);
  });

  it('signs in demo accounts and rejects bad credentials', async () => {
    const res = await call<LoginResponse>('POST', 'auth/login', { email: 'admin@company.com', password: 'Admin@123' });
    expect(res.user.role).toBe('admin');

    const error = await callError('POST', 'auth/login', { email: 'admin@company.com', password: 'wrong' });
    expect(error.status).toBe(401);
  });

  it('requires a token for protected endpoints', async () => {
    expect((await callError('GET', 'employees')).status).toBe(401);
  });

  it('forbids employees from admin endpoints', async () => {
    const token = await login('employee@company.com', 'Employee@123');
    expect((await callError('GET', 'dashboard/admin', null, token)).status).toBe(403);
  });

  it('hides colleagues\' salaries from non-admins', async () => {
    const token = await login('employee@company.com', 'Employee@123');
    const employees = await call<{ email: string; salary: number }[]>('GET', 'employees', null, token);
    expect(employees.find((e) => e.email !== 'employee@company.com')!.salary).toBe(0);
    expect(employees.find((e) => e.email === 'employee@company.com')!.salary).toBeGreaterThan(0);
  });

  it('blocks deleting a department that still has employees', async () => {
    const token = await login('admin@company.com', 'Admin@123');
    const [dept] = await call<Department[]>('GET', 'departments', null, token);
    expect((await callError('DELETE', `departments/${dept.id}`, null, token)).status).toBe(409);
  });

  it('applies leave, updates the balance and rejects overlaps', async () => {
    const token = await login('employee@company.com', 'Employee@123');
    const start = nextMonday(3);
    const leave = { type: 'Sick', startDate: toIsoDate(start), endDate: toIsoDate(addDays(start, 1)), reason: 'Flu' };

    const before = await call<LeaveBalance[]>('GET', 'leaves/balance', null, token);
    const created = await call<{ days: number; status: string }>('POST', 'leaves', leave, token);
    expect(created).toMatchObject({ days: 2, status: 'Pending' });

    const after = await call<LeaveBalance[]>('GET', 'leaves/balance', null, token);
    const sick = (list: LeaveBalance[]) => list.find((b) => b.type === 'Sick')!;
    expect(sick(after).pending).toBe(sick(before).pending + 2);

    expect((await callError('POST', 'leaves', leave, token)).status).toBe(409);
  });

  it('rejects leave beyond the available balance', async () => {
    const token = await login('employee@company.com', 'Employee@123');
    const start = nextMonday(6);
    const error = await callError(
      'POST',
      'leaves',
      { type: 'Sick', startDate: toIsoDate(start), endDate: toIsoDate(addDays(start, 25)), reason: 'Long' },
      token,
    );
    expect(error.status).toBe(400);
  });
});
