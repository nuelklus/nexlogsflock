import { axiosInstance } from "@/utils/axiosInstance";

export interface EggProduction {
  id: string;
  branch: string;
  branch_name: string;
  house: string;
  house_name: string;
  batch: string;
  batch_number: string;
  created_by_name?: string | null;
  created_by_email?: string | null;
  production_date: string;
  large_eggs: number;
  medium_eggs: number;
  pullet_eggs: number;
  unsorted_eggs: number;
  good_eggs: number;
  cracked_eggs: number;
  broken_eggs: number;
  dirty_eggs: number;
  small_eggs: number;
  double_yolk_eggs: number;
  total_eggs: number;
  total_recorded_eggs?: number;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEggProductionInput {
  branch: string;
  house: string;
  batch: string;
  production_date: string;
  large_eggs: number;
  medium_eggs: number;
  small_eggs: number;
  pullet_eggs: number;
  unsorted_eggs: number;
  good_eggs: number;
  cracked_eggs: number;
  broken_eggs: number;
  dirty_eggs: number;
  double_yolk_eggs: number;
  notes?: string;
}

export interface UpdateEggProductionInput {
  branch?: string;
  house?: string;
  batch?: string;
  production_date?: string;
  large_eggs?: number;
  medium_eggs?: number;
  small_eggs?: number;
  pullet_eggs?: number;
  unsorted_eggs?: number;
  good_eggs?: number;
  cracked_eggs?: number;
  broken_eggs?: number;
  dirty_eggs?: number;
  double_yolk_eggs?: number;
  notes?: string;
}

export const listEggProductions = async (): Promise<
  EggProduction[]
> => {
  const response = await axiosInstance.get<EggProduction[]>(
    "/api/egg-productions/"
  );
  return response.data;
};

export const createEggProduction = async (
  data: CreateEggProductionInput
): Promise<EggProduction> => {
  const response = await axiosInstance.post<EggProduction>(
    "/api/egg-productions/",
    data
  );
  return response.data;
};

export const updateEggProduction = async (
  id: string,
  data: UpdateEggProductionInput
): Promise<EggProduction> => {
  const response = await axiosInstance.patch<EggProduction>(
    `/api/egg-productions/${id}/`,
    data
  );
  return response.data;
};

export const deleteEggProduction = async (
  id: string
): Promise<void> => {
  await axiosInstance.delete(`/api/egg-productions/${id}/`);
};
