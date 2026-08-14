const AUTH_STORAGE_KEY = "nexlogs.auth.tokens";
const TENANT_STORAGE_KEY = "nexlogs.activeTenantId";

export interface StoredAuthTokens {
  access: string;
  refresh: string;
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const isBrowser = typeof window !== "undefined";

export const readAuthTokens = (): StoredAuthTokens | null => {
  if (!isBrowser) {
    return null;
  }

  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthTokens;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const writeAuthTokens = (tokens: StoredAuthTokens): void => {
  if (!isBrowser) {
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
};

export const clearAuthTokens = (): void => {
  if (!isBrowser) {
    return;
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const readActiveTenantId = (): string | null => {
  if (!isBrowser) {
    return null;
  }

  return localStorage.getItem(TENANT_STORAGE_KEY);
};

export const writeActiveTenantId = (tenantId: string): void => {
  if (!isBrowser) {
    return;
  }

  localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
};

export const clearActiveTenantId = (): void => {
  if (!isBrowser) {
    return;
  }

  localStorage.removeItem(TENANT_STORAGE_KEY);
};
