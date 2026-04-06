import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ContactMessagePayload } from '../models/contact.model';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly http = inject(HttpClient);

  sendMessage(payload: ContactMessagePayload): Observable<void> {
    return this.http.post<{ success: boolean }>('/api/contact', payload).pipe(map(() => void 0));
  }
}
