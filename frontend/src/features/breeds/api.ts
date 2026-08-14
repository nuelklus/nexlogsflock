import { axiosInstance } from "@/utils/axiosInstance";

export type BirdType = "layer" | "broiler";

export interface Breed {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  bird_type: BirdType;
  market_age_days: number;
  laying_start_days: number | null;
  retirement_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBreedInput {
  name: string;
  bird_type: BirdType;
  market_age_days?: number;
  laying_start_days?: number | null;
  retirement_days?: number | null;
  is_active?: boolean;
}

export interface UpdateBreedInput {
  name?: string;
  bird_type?: BirdType;
  market_age_days?: number;
  laying_start_days?: number | null;
  retirement_days?: number | null;
  is_active?: boolean;
}

export const listBreeds = async (): Promise<Breed[]> => {
  const response = await axiosInstance.get<Breed[]>("/api/breeds/");
  return response.data;
};

export const getBreedById = async (id: string): Promise<Breed> => {
  const response = await axiosInstance.get<Breed>(`/api/breeds/${id}/`);
  return response.data;
};

export const createBreed = async (data: CreateBreedInput): Promise<Breed> => {
  const response = await axiosInstance.post<Breed>("/api/breeds/", data);
  return response.data;
};

export const updateBreed = async (id: string, data: UpdateBreedInput): Promise<Breed> => {
  const response = await axiosInstance.patch<Breed>(`/api/breeds/${id}/`, data);
  return response.data;
};

export const deleteBreed = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/breeds/${id}/`);
};
