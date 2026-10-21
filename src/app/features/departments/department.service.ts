import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { skipErrorToast } from '../../core/http/http-context';
import { Department, DepartmentPayload } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/departments`;

  getAll(): Observable<Department[]> {
    return this.http.get<Department[]>(this.baseUrl);
  }

  save(payload: DepartmentPayload, id?: string): Observable<Department> {
    return id
      ? this.http.put<Department>(`${this.baseUrl}/${id}`, payload, { context: skipErrorToast() })
      : this.http.post<Department>(this.baseUrl, payload, { context: skipErrorToast() });
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
