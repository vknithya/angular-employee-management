export const LEAVE_TYPES = ['Casual', 'Sick', 'Earned', 'Unpaid'] as const;
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];
export type CappedLeaveType = Exclude<LeaveType, 'Unpaid'>;

/** Yearly allowance per leave type. Unpaid leave has no cap. */
export const LEAVE_ALLOWANCE: Record<CappedLeaveType, number> = {
  Casual: 12,
  Sick: 10,
  Earned: 15,
};

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewedBy: string | null;
  reviewedOn: string | null;
  reviewerComment: string | null;
}

export interface LeaveRequestPayload {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveReviewPayload {
  status: Extract<LeaveStatus, 'Approved' | 'Rejected'>;
  comment: string;
}

export interface LeaveBalance {
  type: CappedLeaveType;
  allowance: number;
  used: number;
  pending: number;
  available: number;
}
