export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  employeeId: string;
  email: string;
  fullName: string;
  designation: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  expiresAt: number;
  user: AuthUser;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
