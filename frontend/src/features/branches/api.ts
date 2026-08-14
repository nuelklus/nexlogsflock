import { axiosInstance } from "@/utils/axiosInstance";

export interface Branch {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  location: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchInput {
  name: string;
  location: string;
  is_active?: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  location?: string;
  is_active?: boolean;
}

export const listBranches = async (): Promise<Branch[]> => {
  const response = await axiosInstance.get<Branch[]>("/api/branches/");
  return response.data;
};

export const getBranchById = async (id: string): Promise<Branch> => {
  const response = await axiosInstance.get<Branch>(`/api/branches/${id}/`);
  return response.data;
};

export const createBranch = async (data: CreateBranchInput): Promise<Branch> => {
  const response = await axiosInstance.post<Branch>("/api/branches/", data);
  return response.data;
};

export const updateBranch = async (id: string, data: UpdateBranchInput): Promise<Branch> => {
  const response = await axiosInstance.patch<Branch>(`/api/branches/${id}/`, data);
  return response.data;
};

export const deleteBranch = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/branches/${id}/`);
};
