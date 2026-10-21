export const GENDERS = ['Male', 'Female', 'Other'] as const;
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'] as const;
export const EMPLOYEE_STATUSES = ['Active', 'Probation', 'Notice Period', 'Inactive'] as const;

export type Gender = (typeof GENDERS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: Gender;
  /** ISO date (YYYY-MM-DD) */
  dateOfBirth: string;
  designation: string;
  departmentId: string;
  departmentName?: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  /** ISO date (YYYY-MM-DD) */
  dateOfJoining: string;
  salary: number;
  managerId: string | null;
  managerName?: string;
  address: string;
  emergencyContact: string;
}

/** Payload for create / update. Server-generated and derived fields are excluded. */
export type EmployeePayload = Omit<
  Employee,
  'id' | 'employeeCode' | 'departmentName' | 'managerName'
>;

export type ProfileUpdatePayload = Pick<Employee, 'phone' | 'address' | 'emergencyContact'>;
