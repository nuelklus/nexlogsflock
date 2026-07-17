
import { axiosInstance } from '../../utils/axiosInstance';
import { LoginFormInputs, AuthTokens, RefreshTokenResponse, RegisterFormInputs } from '@/auth/types';

export const login = async (data: LoginFormInputs): Promise<AuthTokens> => {
  const response = await axiosInstance.post<AuthTokens>('/auth/token/', data);
  return response.data;
};

export const register = async (data: RegisterFormInputs): Promise<AuthTokens> => {
  const response = await axiosInstance.post<AuthTokens>('/api/auth/register/', data);
  return response.data;
};

export const refreshToken = async (refresh: string): Promise<RefreshTokenResponse> => {
  const response = await axiosInstance.post<RefreshTokenResponse>('/api/auth/token/refresh/', { refresh });
  return response.data;
};
