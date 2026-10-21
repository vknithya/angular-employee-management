import { Employee } from './employee.model';
import { LeaveBalance, LeaveRequest } from './leave.model';

export interface Holiday {
  date: string;
  name: string;
}

export interface UpcomingBirthday {
  employee: Employee;
  date: string;
}

export interface AdminDashboard {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  newHiresThisMonth: number;
  totalDepartments: number;
  pendingLeaveRequests: number;
  departmentDistribution: { departmentId: string; name: string; count: number }[];
  recentHires: Employee[];
  upcomingBirthdays: UpcomingBirthday[];
  pendingLeaves: LeaveRequest[];
  holidays: Holiday[];
}

export interface EmployeeDashboard {
  employee: Employee;
  leaveBalance: LeaveBalance[];
  recentLeaves: LeaveRequest[];
  teamSize: number;
  holidays: Holiday[];
}
