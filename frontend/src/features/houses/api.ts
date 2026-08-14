import { axiosInstance } from "@/utils/axiosInstance";

export type HouseType = "deep_litter" | "cage";

export interface House {
  id: string;
  tenant_id: string;
  tenant_name: string;
  branch: string; // UUID
  branch_name: string;
  name: string;
  house_type: HouseType;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHouseInput {
  branch: string; // UUID
  name: string;
  house_type: HouseType;
  capacity: number;
  is_active?: boolean;
}

export interface UpdateHouseInput {
  branch?: string; // UUID
  name?: string;
  house_type?: HouseType;
  capacity?: number;
  is_active?: boolean;
}

export const listHouses = async (): Promise<House[]> => {
  const response = await axiosInstance.get<House[]>("/api/houses/");
  return response.data;
};

export const getHouseById = async (id: string): Promise<House> => {
  const response = await axiosInstance.get<House>(`/api/houses/${id}/`);
  return response.data;
};

export const createHouse = async (data: CreateHouseInput): Promise<House> => {
  const response = await axiosInstance.post<House>("/api/houses/", data);
  return response.data;
};

export const updateHouse = async (id: string, data: UpdateHouseInput): Promise<House> => {
  const response = await axiosInstance.patch<House>(`/api/houses/${id}/`, data);
  return response.data;
};

export const deleteHouse = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/houses/${id}/`);
};
