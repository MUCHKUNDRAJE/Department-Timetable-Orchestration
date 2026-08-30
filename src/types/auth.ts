export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  password: string;
  fullName?: string;
}
