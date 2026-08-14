import { axiosInstance } from "@/utils/axiosInstance";

export interface BirdPurchase {
  id: string;
  tenant_id: string;
  tenant_name: string;
  batch?: string | null;
  batch_number?: string | null;
  supplier: string | null;
  supplier_name: string | null;
  breed: string | null;
  breed_name: string | null;
  branch: string;
  branch_name: string;
  purchase_date: string;
  arrival_date: string | null;
  quantity: number;
  unit_cost: string;
  total_cost: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBirdPurchaseInput {
  batch?: string | null;
  supplier?: string | null;
  breed?: string | null;
  branch: string;
  purchase_date: string;
  arrival_date?: string | null;
  quantity: number;
  unit_cost: number;
}

export interface UpdateBirdPurchaseInput {
  batch?: string | null;
  supplier?: string | null;
  breed?: string | null;
  branch?: string;
  purchase_date?: string;
  arrival_date?: string | null;
  quantity?: number;
  unit_cost?: number;
}

export const listBirdPurchases = async (): Promise<
  BirdPurchase[]
> => {
  const response = await axiosInstance.get<BirdPurchase[]>(
    "/api/purchases/"
  );

  return response.data;
};

export const createBirdPurchase = async (
  data: CreateBirdPurchaseInput
): Promise<BirdPurchase> => {
  const response = await axiosInstance.post<BirdPurchase>(
    "/api/purchases/",
    data
  );

  return response.data;
};

export const updateBirdPurchase = async (
  id: string,
  data: UpdateBirdPurchaseInput
): Promise<BirdPurchase> => {
  const response = await axiosInstance.patch<BirdPurchase>(
    `/api/purchases/${id}/`,
    data
  );

  return response.data;
};

export const deleteBirdPurchase = async (
  id: string
): Promise<void> => {
  await axiosInstance.delete(`/api/purchases/${id}/`);
};
