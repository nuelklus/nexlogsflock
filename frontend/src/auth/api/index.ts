import { axiosInstance } from "@/utils/axiosInstance";
import {
  AuthTokens,
  LoginFormInputs,
  MyOrganizationsResponse,
  RegisterFormInputs,
  RegisterResponse,
} from "@/auth/types";

export const login = async (data: LoginFormInputs): Promise<AuthTokens> => {
  const response = await axiosInstance.post<AuthTokens>("/api/auth/token/", data);
  return response.data;
};

export const register = async (data: RegisterFormInputs): Promise<RegisterResponse> => {
  const response = await axiosInstance.post<RegisterResponse>("/api/auth/register/", data);
  return response.data;
};

export const logout = async (refresh: string): Promise<void> => {
  await axiosInstance.post("/api/auth/logout/", { refresh });
};

export const getMyOrganizations = async (): Promise<MyOrganizationsResponse> => {
  const response = await axiosInstance.get<MyOrganizationsResponse>("/api/auth/organizations/");
  return response.data;
};
