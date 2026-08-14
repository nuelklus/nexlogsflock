import { axiosInstance } from "@/utils/axiosInstance";

export interface FeedConsumption {
  id: string;
  tenant_id: string;
  tenant_name: string;
  branch: string;
  branch_name: string;
  house: string;
  house_name: string;
  batch: string;
  batch_number: string;
  feed_type: string;
  feed_type_name: string;
  consumption_date: string;
  date: string;
  quantity: string;
  unit: string;
  notes: string;
  created_by: string | null;
  created_by_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFeedConsumptionInput {
  branch: string;
  house: string;
  batch: string;
  feed_type: string;
  quantity: number;
  consumption_date: string;
  unit?: string;
  notes?: string;
}

export interface UpdateFeedConsumptionInput {
  branch?: string;
  house?: string;
  batch?: string;
  feed_type?: string;
  quantity?: number;
  consumption_date?: string;
  unit?: string;
  notes?: string;
}

export const listFeedConsumptions = async (): Promise<
  FeedConsumption[]
> => {
  const response = await axiosInstance.get<FeedConsumption[]>(
    "/api/feed-consumption/"
  );

  return response.data;
};

export const createFeedConsumption = async (
  data: CreateFeedConsumptionInput
): Promise<FeedConsumption> => {
  const response = await axiosInstance.post<FeedConsumption>(
    "/api/feed-consumption/",
    data
  );

  return response.data;
};

export const updateFeedConsumption = async (
  id: string,
  data: UpdateFeedConsumptionInput
): Promise<FeedConsumption> => {
  const response = await axiosInstance.patch<FeedConsumption>(
    `/api/feed-consumption/${id}/`,
    data
  );

  return response.data;
};

export const deleteFeedConsumption = async (
  id: string
): Promise<void> => {
  await axiosInstance.delete(`/api/feed-consumption/${id}/`);
};
