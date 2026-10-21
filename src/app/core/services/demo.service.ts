import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Demo-only helpers. Remove together with the mock backend. */
@Injectable({ providedIn: 'root' })
export class DemoService {
  private readonly http = inject(HttpClient);

  resetData(): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/demo/reset`, {});
  }
}
