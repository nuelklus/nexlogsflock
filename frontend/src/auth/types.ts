export interface LoginFormInputs {
  email: string;
  password: string;
}

export interface RegisterFormInputs {
  email: string;
  password: string;
  password2: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RefreshTokenResponse {
  access: string;
}
