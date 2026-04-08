export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  emailConfirmedAt: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  tokenType: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string | null;
  email: string;
  password: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number | null;
  tokenType?: string | null;
  requiresEmailConfirmation?: boolean;
  message?: string | null;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface AuthMessageResponse {
  message: string;
}
