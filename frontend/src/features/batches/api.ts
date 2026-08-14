import { axiosInstance } from "@/utils/axiosInstance";

export type BirdType = "layer" | "broiler" | "cockerel" | "breeder" | "pullet";
export type BatchStatus = "active" | "closed" | "sold";

export interface BirdBatch {
  id: string;
  tenant_id: string;
  tenant_name: string;
  branch: string; // UUID
  branch_name: string;
  house: string | null; // UUID, nullable
  house_name: string | null;
  purchase: string | null; // UUID, nullable
  breed: string | null; // UUID, nullable
  breed_name: string | null;
  batch_number: string;
  bird_type: BirdType;
  arrival_date: string; // ISO date
  initial_quantity: number;
  current_quantity: number;
  status: BatchStatus;
  age_days: number; // read-only calculated field
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBatchInput {
  branch: string; // UUID
  house?: string | null; // UUID, optional
  purchase?: string | null; // UUID, optional
  breed?: string | null; // UUID, optional
  batch_number: string;
  bird_type: BirdType;
  arrival_date: string; // ISO date
  initial_quantity: number;
  current_quantity?: number;
  status?: BatchStatus;
  is_active?: boolean;
}

export interface UpdateBatchInput {
  branch?: string;
  house?: string | null;
  purchase?: string | null;
  breed?: string | null;
  batch_number?: string;
  bird_type?: BirdType;
  arrival_date?: string;
  initial_quantity?: number;
  current_quantity?: number;
  status?: BatchStatus;
  is_active?: boolean;
}

export const listBatches = async (): Promise<BirdBatch[]> => {
  const response = await axiosInstance.get<BirdBatch[]>("/api/batches/");
  return response.data;
};

export const getBatchById = async (id: string): Promise<BirdBatch> => {
  const response = await axiosInstance.get<BirdBatch>(`/api/batches/${id}/`);
  return response.data;
};

export const createBatch = async (data: CreateBatchInput): Promise<BirdBatch> => {
  const response = await axiosInstance.post<BirdBatch>("/api/batches/", data);
  return response.data;
};

export const updateBatch = async (id: string, data: UpdateBatchInput): Promise<BirdBatch> => {
  const response = await axiosInstance.patch<BirdBatch>(`/api/batches/${id}/`, data);
  return response.data;
};

export const deleteBatch = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/batches/${id}/`);
};
