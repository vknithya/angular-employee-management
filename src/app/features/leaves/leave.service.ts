import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../../core/http/http-context';
import {
  LeaveBalance,
  LeaveRequest,
  LeaveRequestPayload,
  LeaveReviewPayload,
} from '../../core/models';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/leaves`;

  /** Admins receive every request unless `mine` is set; employees always get their own. */
  getRequests(mine = false): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(this.baseUrl, { params: mine ? { scope: 'mine' } : {} });
  }

  getBalance(): Observable<LeaveBalance[]> {
    return this.http.get<LeaveBalance[]>(`${this.baseUrl}/balance`);
  }

  apply(payload: LeaveRequestPayload): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(this.baseUrl, payload, { context: skipErrorToast() });
  }

  review(id: string, payload: LeaveReviewPayload): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/review`, payload);
  }

  cancel(id: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
