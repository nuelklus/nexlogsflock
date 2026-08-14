export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface LoginFormInputs {
  email: string;
  password: string;
}

export interface RegisterFormInputs {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  organization_name: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationRole {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  logo: string | null;
  primary_color: string;
  timezone: string;
  currency: string;
  role: OrganizationRole;
  permissions: string[];
}

export interface MyOrganizationsResponse {
  organizations: Organization[];
  organization_count: number;
}

export interface RegisterResponse {
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}
