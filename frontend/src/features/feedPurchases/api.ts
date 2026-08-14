import { axiosInstance } from "@/utils/axiosInstance";

export interface FeedPurchase {
  id: string;
  tenant_id: string;
  tenant_name: string;
  supplier: string | null;
  supplier_name: string | null;
  feed_type: string;
  feed_type_name: string;
  branch: string;
  branch_name: string;
  purchase_date: string;
  quantity: number | string;
  unit: string;
  quantity_bags: number;
  weight_per_bag: string;
  unit_cost: string;
  total_weight: string;
  total_cost: string;
  notes: string;
  created_by: string | null;
  created_by_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedPurchaseInput {
  supplier?: string | null;
  feed_type: string;
  branch: string;
  purchase_date: string;
  quantity_bags: number;
  weight_per_bag: number;
  unit_cost: number;
  notes?: string;
}

export interface UpdateFeedPurchaseInput {
  supplier?: string | null;
  feed_type?: string;
  branch?: string;
  purchase_date?: string;
  quantity_bags?: number;
  weight_per_bag?: number;
  unit_cost?: number;
  notes?: string;
}

export const listFeedPurchases = async (): Promise<
  FeedPurchase[]
> => {
  const response = await axiosInstance.get<FeedPurchase[]>(
    "/api/feed-purchases/"
  );

  return response.data;
};

export const createFeedPurchase = async (
  data: CreateFeedPurchaseInput
): Promise<FeedPurchase> => {
  const response = await axiosInstance.post<FeedPurchase>(
    "/api/feed-purchases/",
    data
  );

  return response.data;
};

export const updateFeedPurchase = async (
  id: string,
  data: UpdateFeedPurchaseInput
): Promise<FeedPurchase> => {
  const response = await axiosInstance.patch<FeedPurchase>(
    `/api/feed-purchases/${id}/`,
    data
  );

  return response.data;
};

export const deleteFeedPurchase = async (
  id: string
): Promise<void> => {
  await axiosInstance.delete(`/api/feed-purchases/${id}/`);
};
