import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminDashboard,
  AuthUser,
  CappedLeaveType,
  ChangePasswordRequest,
  Department,
  DepartmentPayload,
  Employee,
  EmployeeDashboard,
  EmployeePayload,
  LEAVE_ALLOWANCE,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestPayload,
  LeaveReviewPayload,
  LoginResponse,
  ProfileUpdatePayload,
} from '../models';
import { countWorkingDays, parseIsoDate, rangesOverlap, today, toIsoDate } from '../utils/date.utils';
import { generateId, MockDb } from './mock-db';
import { upcomingHolidays, UserRecord } from './seed-data';

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Access = 'public' | 'user' | 'admin';

interface RequestContext {
  req: HttpRequest<unknown>;
  params: string[];
  /** Untrusted request body: each handler validates it, as a real server would. */
  body: any;
  user: UserRecord;
}

interface Route {
  method: string;
  path: RegExp;
  access: Access;
  handle: (ctx: RequestContext) => unknown;
}

const SESSION_HOURS = 8;
const REMEMBER_ME_DAYS = 7;

/**
 * In-browser implementation of the REST API the frontend expects. Each route mirrors
 * the contract a real backend would expose, including auth, role checks and validation.
 */
@Injectable({ providedIn: 'root' })
export class MockApi {
  private readonly db = inject(MockDb);

  private readonly routes: Route[] = [
    // Auth
    { method: 'POST', path: /^auth\/login$/, access: 'public', handle: (c) => this.login(c) },
    { method: 'POST', path: /^auth\/logout$/, access: 'public', handle: () => ({ success: true }) },
    { method: 'POST', path: /^auth\/forgot-password$/, access: 'public', handle: () => ({
      message: 'If an account exists for this email, a reset link has been sent.',
    }) },
    { method: 'GET', path: /^auth\/me$/, access: 'user', handle: (c) => this.toAuthUser(c.user) },
    { method: 'POST', path: /^auth\/change-password$/, access: 'user', handle: (c) => this.changePassword(c) },

    // Dashboard
    { method: 'GET', path: /^dashboard\/admin$/, access: 'admin', handle: () => this.adminDashboard() },
    { method: 'GET', path: /^dashboard\/me$/, access: 'user', handle: (c) => this.employeeDashboard(c) },

    // Employees
    { method: 'GET', path: /^employees$/, access: 'user', handle: (c) => this.listEmployees(c) },
    { method: 'POST', path: /^employees$/, access: 'admin', handle: (c) => this.createEmployee(c) },
    { method: 'GET', path: /^employees\/([\w-]+)$/, access: 'user', handle: (c) => this.getEmployee(c) },
    { method: 'PUT', path: /^employees\/([\w-]+)$/, access: 'admin', handle: (c) => this.updateEmployee(c) },
    { method: 'DELETE', path: /^employees\/([\w-]+)$/, access: 'admin', handle: (c) => this.deleteEmployee(c) },
    { method: 'GET', path: /^employees\/([\w-]+)\/leaves$/, access: 'admin', handle: (c) => this.employeeLeaves(c.params[0]) },

    // Profile
    { method: 'GET', path: /^profile$/, access: 'user', handle: (c) => this.enrich(this.employeeOf(c.user)) },
    { method: 'PUT', path: /^profile$/, access: 'user', handle: (c) => this.updateProfile(c) },

    // Departments
    { method: 'GET', path: /^departments$/, access: 'user', handle: () => this.listDepartments() },
    { method: 'POST', path: /^departments$/, access: 'admin', handle: (c) => this.saveDepartment(c) },
    { method: 'PUT', path: /^departments\/([\w-]+)$/, access: 'admin', handle: (c) => this.saveDepartment(c) },
    { method: 'DELETE', path: /^departments\/([\w-]+)$/, access: 'admin', handle: (c) => this.deleteDepartment(c) },

    // Leave
    { method: 'GET', path: /^leaves$/, access: 'user', handle: (c) => this.listLeaves(c) },
    { method: 'POST', path: /^leaves$/, access: 'user', handle: (c) => this.applyLeave(c) },
    { method: 'GET', path: /^leaves\/balance$/, access: 'user', handle: (c) => this.leaveBalance(c.user.employeeId) },
    { method: 'PATCH', path: /^leaves\/([\w-]+)\/review$/, access: 'admin', handle: (c) => this.reviewLeave(c) },
    { method: 'PATCH', path: /^leaves\/([\w-]+)\/cancel$/, access: 'user', handle: (c) => this.cancelLeave(c) },

    // Demo utilities
    { method: 'POST', path: /^demo\/reset$/, access: 'public', handle: () => (this.db.reset(), { success: true }) },
  ];

  handle(req: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
    const path = req.url.slice(environment.apiBaseUrl.length).replace(/^\/|\?.*$/g, '');
    try {
      for (const route of this.routes) {
        const match = route.method === req.method ? route.path.exec(path) : null;
        if (!match) continue;
        const user = this.authorize(req, route.access);
        const body = route.handle({ req, params: match.slice(1), body: req.body ?? {}, user });
        return of(new HttpResponse({ status: 200, url: req.url, body }));
      }
      throw new ApiError(404, `No endpoint for ${req.method} /${path}`);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      return throwError(() => new HttpErrorResponse({ status, url: req.url, error: { message } }));
    }
  }

  // ---------------------------------------------------------------- auth

  private authorize(req: HttpRequest<unknown>, access: Access): UserRecord {
    const user = this.userFromToken(req.headers.get('Authorization'));
    if (access === 'public') return user as UserRecord;
    if (!user) throw new ApiError(401, 'Your session has expired. Please sign in again.');
    if (access === 'admin' && user.role !== 'admin') {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    return user;
  }

  private userFromToken(header: string | null): UserRecord | null {
    const [, payload, expiresAt] = header?.replace('Bearer ', '').split('.') ?? [];
    if (!payload || Number(expiresAt) < Date.now()) return null;
    try {
      return this.db.data.users.find((u) => u.id === atob(payload)) ?? null;
    } catch {
      return null;
    }
  }

  private login({ body }: RequestContext): LoginResponse {
    const email = String(body.email ?? '').trim().toLowerCase();
    const user = this.db.data.users.find((u) => u.email === email && u.password === body.password);
    if (!user) throw new ApiError(401, 'Invalid email or password.');
    if (this.employeeOf(user).status === 'Inactive') {
      throw new ApiError(403, 'Your account is inactive. Please contact HR.');
    }
    const expiresIn = (body.rememberMe ? REMEMBER_ME_DAYS * 24 : SESSION_HOURS) * 3600;
    const expiresAt = Date.now() + expiresIn * 1000;
    return { token: `mock.${btoa(user.id)}.${expiresAt}`, expiresIn, user: this.toAuthUser(user) };
  }

  private changePassword({ body, user }: RequestContext): { success: boolean } {
    const { currentPassword, newPassword } = body as ChangePasswordRequest;
    if (user.password !== currentPassword) throw new ApiError(400, 'Current password is incorrect.');
    if (currentPassword === newPassword) {
      throw new ApiError(400, 'New password must be different from the current password.');
    }
    user.password = newPassword;
    this.db.commit();
    return { success: true };
  }

  private toAuthUser(user: UserRecord): AuthUser {
    const employee = this.employeeOf(user);
    return {
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      fullName: fullName(employee),
      designation: employee.designation,
      role: user.role,
    };
  }

  // ----------------------------------------------------------- dashboard

  private adminDashboard(): AdminDashboard {
    const { employees, departments, leaves } = this.db.data;
    const now = today();
    const monthPrefix = now.slice(0, 7);
    const onLeaveToday = new Set(
      leaves
        .filter((l) => l.status === 'Approved' && l.startDate <= now && l.endDate >= now)
        .map((l) => l.employeeId),
    );

    const upcomingBirthdays = employees
      .filter((e) => e.status !== 'Inactive')
      .map((employee) => ({ employee: this.enrich(employee), date: nextBirthday(employee.dateOfBirth) }))
      .filter((b) => daysUntil(b.date) <= 30)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.status !== 'Inactive').length,
      onLeaveToday: onLeaveToday.size,
      newHiresThisMonth: employees.filter((e) => e.dateOfJoining.startsWith(monthPrefix)).length,
      totalDepartments: departments.length,
      pendingLeaveRequests: leaves.filter((l) => l.status === 'Pending').length,
      departmentDistribution: departments
        .map((d) => ({
          departmentId: d.id,
          name: d.name,
          count: employees.filter((e) => e.departmentId === d.id).length,
        }))
        .sort((a, b) => b.count - a.count),
      recentHires: [...employees]
        .sort((a, b) => b.dateOfJoining.localeCompare(a.dateOfJoining))
        .slice(0, 5)
        .map((e) => this.enrich(e)),
      upcomingBirthdays,
      pendingLeaves: leaves
        .filter((l) => l.status === 'Pending')
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .slice(0, 5),
      holidays: upcomingHolidays(),
    };
  }

  private employeeDashboard({ user }: RequestContext): EmployeeDashboard {
    const employee = this.employeeOf(user);
    return {
      employee: this.enrich(employee),
      leaveBalance: this.leaveBalance(employee.id),
      recentLeaves: this.employeeLeaves(employee.id).slice(0, 5),
      teamSize: this.db.data.employees.filter((e) => e.departmentId === employee.departmentId).length,
      holidays: upcomingHolidays(),
    };
  }

  // ----------------------------------------------------------- employees

  private listEmployees({ user }: RequestContext): Employee[] {
    return [...this.db.data.employees]
      .sort((a, b) => fullName(a).localeCompare(fullName(b)))
      .map((e) => this.forViewer(this.enrich(e), user));
  }

  private getEmployee({ params, user }: RequestContext): Employee {
    return this.forViewer(this.enrich(this.findEmployee(params[0])), user);
  }

  private createEmployee({ body }: RequestContext): Employee {
    const payload = this.validateEmployee(body as EmployeePayload);
    const { employees } = this.db.data;
    const lastCode = Math.max(1000, ...employees.map((e) => Number(e.employeeCode.split('-')[1])));
    const employee: Employee = { ...payload, id: generateId('emp'), employeeCode: `EMP-${lastCode + 1}` };
    employees.push(employee);
    this.db.commit();
    return this.enrich(employee);
  }

  private updateEmployee({ params, body }: RequestContext): Employee {
    const employee = this.findEmployee(params[0]);
    const payload = this.validateEmployee(body as EmployeePayload, employee.id);
    Object.assign(employee, payload);
    this.syncDenormalizedNames(employee);
    this.syncUserEmail(employee);
    this.db.commit();
    return this.enrich(employee);
  }

  private deleteEmployee({ params, user }: RequestContext): { success: boolean } {
    const employee = this.findEmployee(params[0]);
    if (employee.id === user.employeeId) throw new ApiError(400, 'You cannot delete your own record.');
    if (this.db.data.users.some((u) => u.employeeId === employee.id)) {
      throw new ApiError(409, `${fullName(employee)} has a portal login (demo account) and cannot be deleted.`);
    }
    const data = this.db.data;
    data.employees = data.employees.filter((e) => e.id !== employee.id);
    data.leaves = data.leaves.filter((l) => l.employeeId !== employee.id);
    data.employees.forEach((e) => e.managerId === employee.id && (e.managerId = null));
    data.departments.forEach((d) => d.headId === employee.id && (d.headId = null));
    this.db.commit();
    return { success: true };
  }

  private validateEmployee(payload: EmployeePayload, existingId?: string): EmployeePayload {
    const required: (keyof EmployeePayload)[] = [
      'firstName', 'lastName', 'email', 'phone', 'designation', 'departmentId', 'dateOfJoining',
    ];
    const missing = required.filter((key) => !String(payload[key] ?? '').trim());
    if (missing.length) throw new ApiError(400, `Missing required fields: ${missing.join(', ')}.`);

    const email = payload.email.trim().toLowerCase();
    if (this.db.data.employees.some((e) => e.email === email && e.id !== existingId)) {
      throw new ApiError(409, `An employee with the email ${email} already exists.`);
    }
    if (!this.db.data.departments.some((d) => d.id === payload.departmentId)) {
      throw new ApiError(400, 'Selected department does not exist.');
    }
    if (existingId && payload.managerId === existingId) {
      throw new ApiError(400, 'An employee cannot report to themselves.');
    }
    return { ...payload, email, salary: Number(payload.salary) || 0, managerId: payload.managerId || null };
  }

  /** Keeps employee names stored on leave requests in sync after a rename. */
  private syncDenormalizedNames(employee: Employee): void {
    this.db.data.leaves
      .filter((l) => l.employeeId === employee.id)
      .forEach((l) => (l.employeeName = fullName(employee)));
  }

  private syncUserEmail(employee: Employee): void {
    const user = this.db.data.users.find((u) => u.employeeId === employee.id);
    if (user) user.email = employee.email;
  }

  private updateProfile({ body, user }: RequestContext): Employee {
    const { phone, address, emergencyContact } = body as ProfileUpdatePayload;
    if (!phone?.trim()) throw new ApiError(400, 'Phone number is required.');
    const employee = this.employeeOf(user);
    Object.assign(employee, { phone: phone.trim(), address: address?.trim() ?? '', emergencyContact: emergencyContact?.trim() ?? '' });
    this.db.commit();
    return this.enrich(employee);
  }

  // --------------------------------------------------------- departments

  private listDepartments(): Department[] {
    const { departments, employees } = this.db.data;
    return departments
      .map((d) => {
        const head = employees.find((e) => e.id === d.headId);
        return {
          ...d,
          headName: head ? fullName(head) : undefined,
          employeeCount: employees.filter((e) => e.departmentId === d.id).length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private saveDepartment({ params, body }: RequestContext): Department {
    const payload = body as DepartmentPayload;
    const id = params[0];
    const name = payload.name?.trim();
    const code = payload.code?.trim().toUpperCase();
    if (!name || !code) throw new ApiError(400, 'Department name and code are required.');

    const { departments } = this.db.data;
    const clash = departments.find(
      (d) => d.id !== id && (d.name.toLowerCase() === name.toLowerCase() || d.code === code),
    );
    if (clash) throw new ApiError(409, `A department with this ${clash.code === code ? 'code' : 'name'} already exists.`);

    const values = { ...payload, name, code, headId: payload.headId || null };
    let department: Department;
    if (id) {
      department = departments.find((d) => d.id === id) ?? notFound('Department');
      Object.assign(department, values);
    } else {
      department = { ...values, id: generateId('dept') };
      departments.push(department);
    }
    this.db.commit();
    return this.listDepartments().find((d) => d.id === department.id)!;
  }

  private deleteDepartment({ params }: RequestContext): { success: boolean } {
    const data = this.db.data;
    const department = data.departments.find((d) => d.id === params[0]) ?? notFound('Department');
    const count = data.employees.filter((e) => e.departmentId === department.id).length;
    if (count) {
      throw new ApiError(409, `${department.name} still has ${count} employee(s). Reassign them before deleting.`);
    }
    data.departments = data.departments.filter((d) => d.id !== department.id);
    this.db.commit();
    return { success: true };
  }

  // --------------------------------------------------------------- leave

  private listLeaves({ req, user }: RequestContext): LeaveRequest[] {
    const mineOnly = user.role !== 'admin' || req.params.get('scope') === 'mine';
    return [...this.db.data.leaves]
      .filter((l) => !mineOnly || l.employeeId === user.employeeId)
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.startDate.localeCompare(a.startDate));
  }

  private employeeLeaves(employeeId: string): LeaveRequest[] {
    return this.db.data.leaves
      .filter((l) => l.employeeId === employeeId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  private leaveBalance(employeeId: string): LeaveBalance[] {
    const year = String(new Date().getFullYear());
    const leaves = this.db.data.leaves.filter(
      (l) => l.employeeId === employeeId && l.startDate.startsWith(year),
    );
    return (Object.keys(LEAVE_ALLOWANCE) as CappedLeaveType[]).map((type) => {
      const sum = (status: string) =>
        leaves.filter((l) => l.type === type && l.status === status).reduce((t, l) => t + l.days, 0);
      const allowance = LEAVE_ALLOWANCE[type];
      const used = sum('Approved');
      const pending = sum('Pending');
      return { type, allowance, used, pending, available: Math.max(0, allowance - used - pending) };
    });
  }

  private applyLeave({ body, user }: RequestContext): LeaveRequest {
    const payload = body as LeaveRequestPayload;
    if (!payload.type || !payload.startDate || !payload.endDate || !payload.reason?.trim()) {
      throw new ApiError(400, 'Leave type, dates and reason are required.');
    }
    if (payload.endDate < payload.startDate) throw new ApiError(400, 'End date cannot be before start date.');

    const days = countWorkingDays(payload.startDate, payload.endDate);
    if (!days) throw new ApiError(400, 'The selected dates fall on a weekend. Choose at least one working day.');

    const overlapping = this.db.data.leaves.find(
      (l) =>
        l.employeeId === user.employeeId &&
        (l.status === 'Pending' || l.status === 'Approved') &&
        rangesOverlap(l.startDate, l.endDate, payload.startDate, payload.endDate),
    );
    if (overlapping) throw new ApiError(409, 'You already have a leave request overlapping these dates.');

    if (payload.type !== 'Unpaid') {
      const balance = this.leaveBalance(user.employeeId).find((b) => b.type === payload.type)!;
      if (days > balance.available) {
        throw new ApiError(400, `Insufficient ${payload.type} leave balance. Available: ${balance.available} day(s).`);
      }
    }

    const leave: LeaveRequest = {
      id: generateId('lv'),
      employeeId: user.employeeId,
      employeeName: fullName(this.employeeOf(user)),
      type: payload.type,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days,
      reason: payload.reason.trim(),
      status: 'Pending',
      appliedOn: today(),
      reviewedBy: null,
      reviewedOn: null,
      reviewerComment: null,
    };
    this.db.data.leaves.push(leave);
    this.db.commit();
    return leave;
  }

  private reviewLeave({ params, body, user }: RequestContext): LeaveRequest {
    const { status, comment } = body as LeaveReviewPayload;
    const leave = this.findLeave(params[0]);
    if (leave.employeeId === user.employeeId) throw new ApiError(403, 'You cannot review your own leave request.');
    if (leave.status !== 'Pending') throw new ApiError(409, `This request has already been ${leave.status.toLowerCase()}.`);
    if (status === 'Rejected' && !comment?.trim()) throw new ApiError(400, 'Please provide a reason for rejection.');

    Object.assign(leave, {
      status,
      reviewerComment: comment?.trim() || null,
      reviewedBy: fullName(this.employeeOf(user)),
      reviewedOn: today(),
    });
    this.db.commit();
    return leave;
  }

  private cancelLeave({ params, user }: RequestContext): LeaveRequest {
    const leave = this.findLeave(params[0]);
    if (leave.employeeId !== user.employeeId) throw new ApiError(403, 'You can only cancel your own requests.');
    if (leave.status !== 'Pending') throw new ApiError(409, 'Only pending requests can be cancelled.');
    leave.status = 'Cancelled';
    this.db.commit();
    return leave;
  }

  // ------------------------------------------------------------- helpers

  private employeeOf(user: UserRecord): Employee {
    return this.findEmployee(user.employeeId);
  }

  private findEmployee(id: string): Employee {
    return this.db.data.employees.find((e) => e.id === id) ?? notFound('Employee');
  }

  private findLeave(id: string): LeaveRequest {
    return this.db.data.leaves.find((l) => l.id === id) ?? notFound('Leave request');
  }

  private enrich(employee: Employee): Employee {
    const { departments, employees } = this.db.data;
    const manager = employees.find((e) => e.id === employee.managerId);
    return {
      ...employee,
      departmentName: departments.find((d) => d.id === employee.departmentId)?.name ?? 'Unassigned',
      managerName: manager ? fullName(manager) : undefined,
    };
  }

  /** Salary is confidential: only admins and the employee themselves can see it. */
  private forViewer(employee: Employee, viewer: UserRecord): Employee {
    return viewer.role === 'admin' || viewer.employeeId === employee.id ? employee : { ...employee, salary: 0 };
  }
}

function fullName(employee: Employee): string {
  return `${employee.firstName} ${employee.lastName}`;
}

function notFound(entity: string): never {
  throw new ApiError(404, `${entity} not found.`);
}

function nextBirthday(dateOfBirth: string): string {
  const dob = parseIsoDate(dateOfBirth);
  const now = parseIsoDate(today());
  const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return toIsoDate(next);
}

function daysUntil(date: string): number {
  return Math.round((parseIsoDate(date).getTime() - parseIsoDate(today()).getTime()) / 86_400_000);
}
