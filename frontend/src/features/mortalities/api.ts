import { axiosInstance } from "@/utils/axiosInstance";

export type MortalityCause =
  | "disease"
  | "heat_stress"
  | "accident"
  | "predator"
  | "poor_quality"
  | "unknown"
  | "other";

export interface MortalityRecord {
  id: string;
  branch: string;
  branch_name: string;
  house: string;
  house_name: string;
  batch: string;
  batch_number: string;
  disease: string | null;
  disease_name: string | null;
  disease_outbreak: string | null;
  outbreak_disease: string | null;
  date: string;
  quantity: number;
  cause: MortalityCause;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMortalityInput {
  branch: string;
  house: string;
  batch: string;
  disease?: string | null;
  disease_outbreak?: string | null;
  date: string;
  quantity: number;
  cause: MortalityCause;
  notes?: string;
}

export interface UpdateMortalityInput {
  branch?: string;
  house?: string;
  batch?: string;
  disease?: string | null;
  disease_outbreak?: string | null;
  date?: string;
  quantity?: number;
  cause?: MortalityCause;
  notes?: string;
}

export const listMortalities = async (): Promise<
  MortalityRecord[]
> => {
  const response = await axiosInstance.get<MortalityRecord[]>(
    "/api/mortalities/"
  );

  return response.data;
};

export const createMortality = async (
  data: CreateMortalityInput
): Promise<MortalityRecord> => {
  const response = await axiosInstance.post<MortalityRecord>(
    "/api/mortalities/",
    data
  );

  return response.data;
};

export const updateMortality = async (
  id: string,
  data: UpdateMortalityInput
): Promise<MortalityRecord> => {
  const response = await axiosInstance.patch<MortalityRecord>(
    `/api/mortalities/${id}/`,
    data
  );

  return response.data;
};

export const deleteMortality = async (
  id: string
): Promise<void> => {
  await axiosInstance.delete(`/api/mortalities/${id}/`);
};
