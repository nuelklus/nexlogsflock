"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import {
  clearActiveTenantId,
  clearAuthTokens,
  readActiveTenantId,
  readAuthTokens,
  writeActiveTenantId,
  writeAuthTokens,
} from "@/lib/storage";

import {
  getMyOrganizations,
  login,
  logout,
  register,
} from "@/auth/api";

import {
  AuthTokens,
  LoginFormInputs,
  RegisterFormInputs,
  User,
  Organization,
} from "@/auth/types";

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;

  isAuthenticated: boolean;
  isLoading: boolean;

  tenants: Organization[];
  activeTenantId: string | null;

  tenantLoading: boolean;
  tenantError: string | null;

  loginUser: (data: LoginFormInputs) => Promise<void>;
  logoutUser: () => Promise<void>;
  registerUser: (data: RegisterFormInputs) => Promise<void>;

  setActiveTenantId: (tenantId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

const toUser = (tokens: AuthTokens): User => ({
  id: tokens.id,
  email: tokens.email,
  first_name: tokens.first_name,
  last_name: tokens.last_name,
});

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);

  const [user, setUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [tenantLoading, setTenantLoading] = useState(false);

  const [tenantError, setTenantError] = useState<string | null>(
    null
  );

  /**
   * IMPORTANT:
   *
   * tenants ALWAYS contains the organizations array.
   *
   * Example:
   *
   * tenants = [
   *   {
   *     id: "...",
   *     name: "testfarm3",
   *     ...
   *   }
   * ]
   */
  const [tenants, setTenants] = useState<Organization[]>([]);

  const [activeTenantId, setActiveTenantIdState] =
    useState<string | null>(null);
  /**
   * Load organizations belonging to the authenticated user.
   */
  const loadTenants = useCallback(
    async (options?: { preserveSelection?: boolean }) => {
      setTenantLoading(true);
      setTenantError(null);

      try {
        const response = await getMyOrganizations();

        /**
         * Backend response:
         *
         * {
         *   organizations: [...],
         *   organization_count: 1
         * }
         *
         * We ONLY store response.organizations.
         */
        const organizations = Array.isArray(
          response?.organizations
        )
          ? response.organizations
          : [];

        setTenants(organizations);

        /**
         * No organizations available.
         */
        if (organizations.length === 0) {
          setActiveTenantIdState(null);
          clearActiveTenantId();
          return;
        }

        /**
         * Try to restore previously selected organization.
         */
        const storedTenantId =
          options?.preserveSelection
            ? readActiveTenantId()
            : null;

        /**
         * Check if stored organization still belongs
         * to the current user.
         */
        const isStoredValid = storedTenantId
          ? organizations.some(
              (organization) =>
                organization.id === storedTenantId
            )
          : false;

        /**
         * Use the stored organization if valid.
         *
         * Otherwise select the first organization.
         */
        const nextTenantId = isStoredValid
          ? storedTenantId!
          : organizations[0].id;

        setActiveTenantIdState(nextTenantId);

        writeActiveTenantId(nextTenantId);
      } catch (error) {
        console.error(
          "Failed to load organizations:",
          error
        );

        setTenantError(
          getApiErrorMessage(
            error,
            "Unable to load organizations for this user."
          )
        );

        setTenants([]);

        setActiveTenantIdState(null);

        clearActiveTenantId();
      } finally {
        setTenantLoading(false);
      }
    },
    []
  );

  /**
   * Initialize authentication from stored tokens.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const storedTokens = readAuthTokens();

      if (!storedTokens) {
        setIsLoading(false);
        return;
      }

      setTokens(storedTokens);

      setUser(toUser(storedTokens));

      await loadTenants({
        preserveSelection: true,
      });

      setIsLoading(false);
    };

    initializeAuth();
  }, [loadTenants]);

  /**
   * Login.
   */
  const loginUser = useCallback(
    async (data: LoginFormInputs) => {
      setIsLoading(true);

      try {
        const response = await login(data);

        setTokens(response);

        setUser(toUser(response));

        writeAuthTokens(response);

        await loadTenants();
      } catch (error) {
        clearAuthTokens();

        clearActiveTenantId();

        setTokens(null);

        setUser(null);

        setTenants([]);

        setActiveTenantIdState(null);

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadTenants]
  );

  /**
   * Register.
   */
  const registerUser = useCallback(
    async (data: RegisterFormInputs) => {
      await register(data);
    },
    []
  );

  /**
   * Logout.
   */
  const logoutUser = useCallback(async () => {
    const currentRefresh = tokens?.refresh;

    /**
     * Clear local authentication immediately.
     */
    clearAuthTokens();

    clearActiveTenantId();

    setTokens(null);

    setUser(null);

    setTenants([]);

    setActiveTenantIdState(null);

    setTenantError(null);

    /**
     * Notify backend if a refresh token exists.
     */
    if (currentRefresh) {
      try {
        await logout(currentRefresh);
      } catch {
        /**
         * Ignore backend logout failures.
         *
         * The local session has already been cleared.
         */
      }
    }
  }, [tokens?.refresh]);

  /**
   * Change active organization.
   */
  const setActiveTenantId = useCallback(
    (tenantId: string) => {
      /**
       * Optional safety check:
       *
       * Don't allow selecting an organization
       * that isn't in the user's organization list.
       */
      const organizationExists = tenants.some(
        (organization) =>
          organization.id === tenantId
      );

      if (!organizationExists) {
        console.warn(
          "Attempted to select an organization that does not belong to the current user:",
          tenantId
        );

        return;
      }

      setActiveTenantIdState(tenantId);

      writeActiveTenantId(tenantId);
    },
    [tenants]
  );

  /**
   * Context value.
   */
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      tokens,

      isAuthenticated: Boolean(tokens && user),

      isLoading,

      tenants,

      activeTenantId,

      tenantLoading,

      tenantError,

      loginUser,

      logoutUser,

      registerUser,

      setActiveTenantId,
    }),
    [
      user,
      tokens,
      isLoading,
      tenants,
      activeTenantId,
      tenantLoading,
      tenantError,
      loginUser,
      logoutUser,
      registerUser,
      setActiveTenantId,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};