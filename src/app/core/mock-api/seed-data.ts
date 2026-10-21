import {
  Department,
  Employee,
  EmploymentType,
  EmployeeStatus,
  Gender,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  UserRole,
} from '../models';
import { addDays, countWorkingDays, isWeekend, toIsoDate } from '../utils/date.utils';

export interface UserRecord {
  id: string;
  employeeId: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface DbState {
  users: UserRecord[];
  departments: Department[];
  employees: Employee[];
  leaves: LeaveRequest[];
}

/** Credentials shown on the login page for demos. */
export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@company.com', password: 'Admin@123' },
  { label: 'Employee', email: 'employee@company.com', password: 'Employee@123' },
] as const;

/** Small deterministic PRNG so every reset produces the same dataset. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
  };
}

const DEPARTMENTS: (Omit<Department, 'headId'> & { roles: string[]; lead: string; size: number })[] = [
  {
    id: 'dept-eng',
    name: 'Engineering',
    code: 'ENG',
    description: 'Builds and maintains our products and internal platforms.',
    location: 'Bengaluru',
    lead: 'Engineering Manager',
    roles: ['Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Engineer'],
    size: 12,
  },
  {
    id: 'dept-hr',
    name: 'Human Resources',
    code: 'HR',
    description: 'Hiring, onboarding, people operations and employee wellbeing.',
    location: 'Chennai',
    lead: 'HR Manager',
    roles: ['HR Executive', 'Talent Acquisition Specialist'],
    size: 4,
  },
  {
    id: 'dept-fin',
    name: 'Finance',
    code: 'FIN',
    description: 'Accounting, payroll, budgeting and compliance.',
    location: 'Mumbai',
    lead: 'Finance Manager',
    roles: ['Accountant', 'Financial Analyst'],
    size: 4,
  },
  {
    id: 'dept-mkt',
    name: 'Marketing',
    code: 'MKT',
    description: 'Brand, content, campaigns and market research.',
    location: 'Bengaluru',
    lead: 'Marketing Manager',
    roles: ['Marketing Executive', 'Content Strategist', 'SEO Specialist'],
    size: 5,
  },
  {
    id: 'dept-sal',
    name: 'Sales',
    code: 'SAL',
    description: 'New business, account management and partnerships.',
    location: 'Delhi',
    lead: 'Sales Manager',
    roles: ['Sales Executive', 'Account Manager'],
    size: 6,
  },
  {
    id: 'dept-ops',
    name: 'Operations',
    code: 'OPS',
    description: 'Facilities, IT support and day-to-day business operations.',
    location: 'Chennai',
    lead: 'Operations Manager',
    roles: ['Operations Executive', 'Office Administrator', 'IT Support Specialist'],
    size: 4,
  },
];

const FIRST_NAMES: [string, Gender][] = [
  ['Aarav', 'Male'], ['Ananya', 'Female'], ['Vikram', 'Male'], ['Divya', 'Female'],
  ['Rohan', 'Male'], ['Meera', 'Female'], ['Karthik', 'Male'], ['Sneha', 'Female'],
  ['Arjun', 'Male'], ['Lakshmi', 'Female'], ['Rahul', 'Male'], ['Kavya', 'Female'],
  ['Siddharth', 'Male'], ['Nisha', 'Female'], ['Aditya', 'Male'], ['Pooja', 'Female'],
  ['Harish', 'Male'], ['Ishita', 'Female'], ['Manoj', 'Male'], ['Revathi', 'Female'],
  ['Naveen', 'Male'], ['Swathi', 'Female'], ['Ganesh', 'Male'], ['Deepika', 'Female'],
  ['Suresh', 'Male'], ['Aishwarya', 'Female'], ['Varun', 'Male'], ['Nandini', 'Female'],
  ['Prakash', 'Male'], ['Shalini', 'Female'], ['Alex', 'Other'], ['Tanvi', 'Female'],
  ['Kiran', 'Other'], ['Bhavana', 'Female'], ['Ajay', 'Male'],
];

const LAST_NAMES = [
  'Sharma', 'Iyer', 'Reddy', 'Nair', 'Menon', 'Patel', 'Gupta', 'Krishnan', 'Rao',
  'Subramanian', 'Pillai', 'Verma', 'Joshi', 'Kumar', 'Banerjee', 'Desai', 'Chopra',
];

const CITIES = ['Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi', 'Coimbatore'];
const STREETS = ['MG Road', 'Anna Salai', 'Park Street', 'Residency Road', 'Lake View', 'Gandhi Nagar'];

const LEAVE_REASONS: Record<LeaveType, string[]> = {
  Casual: ['Family function', 'Personal errands', 'Attending a wedding', 'House shifting'],
  Sick: ['Fever and cold', 'Doctor appointment', 'Recovering from flu', 'Migraine'],
  Earned: ['Family vacation', 'Trip to hometown', 'Annual holiday', 'Travel abroad'],
  Unpaid: ['Extended personal leave', 'Higher studies exam'],
};

/** Moves a date forward to the next weekday if it falls on a weekend. */
function nextWorkingDay(date: Date): Date {
  let result = date;
  while (isWeekend(result)) result = addDays(result, 1);
  return result;
}

export function createSeedData(): DbState {
  const random = createRandom(20260101);
  const now = new Date();
  const employees: Employee[] = [];
  const departments: Department[] = [];
  let nameIndex = 0;
  let counter = 1;

  for (const dept of DEPARTMENTS) {
    let headId: string | null = null;

    for (let i = 0; i < dept.size; i++) {
      const id = `emp-${String(counter).padStart(3, '0')}`;
      const [firstName, gender] = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(nameIndex * 7) % LAST_NAMES.length];
      nameIndex++;

      const isLead = i === 0;
      const designation = isLead ? dept.lead : random.pick(dept.roles);
      const employmentType: EmploymentType =
        isLead || i % 6 !== 5 ? 'Full-time' : random.pick(['Contract', 'Intern', 'Part-time'] as const);

      // Recent joiners land on probation; a few long-timers are serving notice.
      const joinedDaysAgo = isLead ? random.int(900, 2200) : i % 5 === 4 ? random.int(3, 40) : random.int(120, 1800);
      const status: EmployeeStatus =
        joinedDaysAgo < 90 ? 'Probation' : counter % 13 === 0 ? 'Notice Period' : counter % 17 === 0 ? 'Inactive' : 'Active';

      // Spread birthdays so some always fall in the next few weeks.
      const birthday = addDays(now, counter % 4 === 0 ? random.int(1, 30) : random.int(31, 360));
      const dateOfBirth = new Date(now.getFullYear() - random.int(23, 52), birthday.getMonth(), birthday.getDate());

      const baseSalary = isLead ? 1_800_000 : designation.startsWith('Senior') ? 1_400_000 : 600_000;
      const city = random.pick(CITIES);

      employees.push({
        id,
        employeeCode: `EMP-${String(1000 + counter)}`,
        firstName,
        lastName,
        email: `${firstName}.${lastName}@company.com`.toLowerCase(),
        phone: `+91 9${random.int(100000000, 999999999)}`,
        gender,
        dateOfBirth: toIsoDate(dateOfBirth),
        designation,
        departmentId: dept.id,
        employmentType,
        status,
        dateOfJoining: toIsoDate(addDays(now, -joinedDaysAgo)),
        salary: Math.round((baseSalary + random.int(0, 600_000)) / 10_000) * 10_000,
        managerId: headId,
        address: `${random.int(1, 220)}, ${random.pick(STREETS)}, ${city}`,
        emergencyContact: `+91 8${random.int(100000000, 999999999)}`,
      });

      if (isLead) headId = id;
      counter++;
    }

    const { roles: _roles, lead: _lead, size: _size, ...department } = dept;
    departments.push({ ...department, headId });
  }

  // The two demo accounts map onto real employee records.
  const admin = employees.find((e) => e.departmentId === 'dept-hr')!;
  Object.assign(admin, { firstName: 'Priya', lastName: 'Raman', gender: 'Female', email: 'admin@company.com', status: 'Active' });
  const employee = employees.find((e) => e.departmentId === 'dept-eng' && e.managerId)!;
  Object.assign(employee, {
    firstName: 'Arun',
    lastName: 'Venkatesh',
    gender: 'Male',
    designation: 'Software Engineer',
    email: 'employee@company.com',
    employmentType: 'Full-time',
    status: 'Active',
  });

  const users: UserRecord[] = [
    { id: 'usr-admin', employeeId: admin.id, email: admin.email, password: 'Admin@123', role: 'admin' },
    { id: 'usr-employee', employeeId: employee.id, email: employee.email, password: 'Employee@123', role: 'employee' },
  ];

  return { users, departments, employees, leaves: createLeaves(employees, employee.id, random) };
}

function createLeaves(
  employees: Employee[],
  demoEmployeeId: string,
  random: ReturnType<typeof createRandom>,
): LeaveRequest[] {
  const now = new Date();
  const leaves: LeaveRequest[] = [];
  const active = employees.filter((e) => e.status !== 'Inactive');

  // [day offset from today, length in days, status]
  const plan: [number, number, LeaveStatus][] = [
    [-60, 2, 'Approved'], [-45, 1, 'Approved'], [-30, 3, 'Approved'], [-21, 1, 'Rejected'],
    [-14, 2, 'Approved'], [-7, 1, 'Approved'], [-1, 3, 'Approved'], [0, 2, 'Approved'],
    [0, 1, 'Approved'], [3, 2, 'Pending'], [5, 1, 'Pending'], [7, 4, 'Pending'],
    [10, 2, 'Pending'], [12, 1, 'Cancelled'], [14, 5, 'Pending'], [20, 3, 'Approved'],
    [25, 2, 'Pending'],
  ];

  const demoPlan: [number, number, LeaveStatus, LeaveType][] = [
    [-40, 2, 'Approved', 'Casual'],
    [-18, 1, 'Approved', 'Sick'],
    [-9, 3, 'Rejected', 'Earned'],
    [9, 2, 'Pending', 'Casual'],
  ];

  const push = (emp: Employee, offset: number, length: number, status: LeaveStatus, type: LeaveType) => {
    const start = nextWorkingDay(addDays(now, offset));
    const end = nextWorkingDay(addDays(start, length - 1));
    const startDate = toIsoDate(start);
    const endDate = toIsoDate(end);
    const appliedOn = toIsoDate(addDays(start, -random.int(3, 15)));
    const reviewed = status === 'Approved' || status === 'Rejected';

    leaves.push({
      id: `lv-${String(leaves.length + 1).padStart(3, '0')}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      type,
      startDate,
      endDate,
      days: countWorkingDays(startDate, endDate),
      reason: random.pick(LEAVE_REASONS[type]),
      status,
      appliedOn,
      reviewedBy: reviewed ? 'Priya Raman' : null,
      reviewedOn: reviewed ? toIsoDate(addDays(start, -1)) : null,
      reviewerComment: status === 'Rejected' ? 'Critical release in progress, please reschedule.' : null,
    });
  };

  const demoEmployee = employees.find((e) => e.id === demoEmployeeId)!;
  for (const [offset, length, status, type] of demoPlan) push(demoEmployee, offset, length, status, type);

  const others = active.filter((e) => e.id !== demoEmployeeId && e.email !== 'admin@company.com');
  plan.forEach(([offset, length, status], i) => {
    const type = random.pick(['Casual', 'Casual', 'Sick', 'Earned', 'Unpaid'] as const);
    push(others[(i * 5) % others.length], offset, length, status, type);
  });

  return leaves;
}

const FIXED_HOLIDAYS: [number, number, string][] = [
  [0, 1, "New Year's Day"],
  [0, 14, 'Pongal'],
  [0, 26, 'Republic Day'],
  [3, 14, 'Tamil New Year'],
  [4, 1, 'May Day'],
  [7, 15, 'Independence Day'],
  [9, 2, 'Gandhi Jayanti'],
  [11, 25, 'Christmas'],
];

/** The next `count` company holidays from today. */
export function upcomingHolidays(count = 4): { date: string; name: string }[] {
  const now = new Date();
  const todayIso = toIsoDate(now);
  return [now.getFullYear(), now.getFullYear() + 1]
    .flatMap((year) => FIXED_HOLIDAYS.map(([m, d, name]) => ({ date: toIsoDate(new Date(year, m, d)), name })))
    .filter((h) => h.date >= todayIso)
    .slice(0, count);
}
