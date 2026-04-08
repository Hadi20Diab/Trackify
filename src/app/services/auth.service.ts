import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import {
  AuthMessageResponse,
  AuthSession,
  AuthSessionResponse,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
} from '../models/auth.model';
import { environment } from '../../environments/environment';
import { StorageService } from './storage.service';

const AUTH_SESSION_STORAGE_KEY = 'trackify_auth_session';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(
    this.storage.getItem<AuthSession | null>(AUTH_SESSION_STORAGE_KEY, null),
  );

  readonly session$ = this.sessionSubject.asObservable();
  readonly user$ = this.session$.pipe(map((session) => session?.user ?? null));
  readonly isAuthenticated$ = this.session$.pipe(map((session) => Boolean(session?.accessToken)));

  login(payload: LoginPayload): Observable<AuthSession> {
    return this.http.post<AuthSessionResponse>(`${this.apiBaseUrl}/auth/login`, payload).pipe(
      map((response) => this.mapResponseToSession(response)),
      tap((session) => this.persistSession(session)),
    );
  }

  register(payload: RegisterPayload): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(`${this.apiBaseUrl}/auth/register`, payload).pipe(
      tap((response) => {
        if (response.accessToken) {
          this.persistSession(this.mapResponseToSession(response));
        }
      }),
    );
  }

  forgotPassword(payload: ForgotPasswordPayload): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.apiBaseUrl}/auth/forgot-password`, payload);
  }

  restoreCurrentUser(): Observable<AuthUser | null> {
    const currentSession = this.sessionSubject.value;
    if (!currentSession?.accessToken) {
      return of(null);
    }

    return this.http.get<AuthUser>(`${this.apiBaseUrl}/auth/me`).pipe(
      tap((user) => {
        this.persistSession({
          ...currentSession,
          user,
        });
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  logout(redirectToLogin = true): void {
    this.clearSession();

    if (redirectToLogin) {
      void this.router.navigate(['/auth/login']);
    }
  }

  isAuthenticatedSnapshot(): boolean {
    return Boolean(this.sessionSubject.value?.accessToken);
  }

  getAccessToken(): string | null {
    return this.sessionSubject.value?.accessToken ?? null;
  }

  private mapResponseToSession(response: AuthSessionResponse): AuthSession {
    const accessToken = response.accessToken?.trim();
    if (!accessToken) {
      throw new Error('Access token is missing from auth response.');
    }

    return {
      user: response.user,
      accessToken,
      refreshToken: response.refreshToken?.trim() || null,
      expiresIn: response.expiresIn ?? null,
      tokenType: response.tokenType?.trim() || null,
    };
  }

  private persistSession(session: AuthSession): void {
    this.sessionSubject.next(session);
    this.storage.setItem(AUTH_SESSION_STORAGE_KEY, session);
  }

  private clearSession(): void {
    this.sessionSubject.next(null);
    this.storage.removeItem(AUTH_SESSION_STORAGE_KEY);
  }
}
