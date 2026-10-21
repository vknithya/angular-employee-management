import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Employee, ProfileUpdatePayload } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/profile`;

  get(): Observable<Employee> {
    return this.http.get<Employee>(this.baseUrl);
  }

  update(payload: ProfileUpdatePayload): Observable<Employee> {
    return this.http.put<Employee>(this.baseUrl, payload);
  }
}
