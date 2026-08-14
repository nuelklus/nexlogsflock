import { axiosInstance } from "@/utils/axiosInstance";

export interface FeedInventory {
  id: string;
  branch: string;
  branch_name: string;
  feed_type: string;
  feed_type_name: string;
  quantity: string;
  available_quantity: string;
  unit: string;
  created_at: string;
  updated_at: string;
}

export const listFeedInventory = async (): Promise<
  FeedInventory[]
> => {
  const response = await axiosInstance.get<
    FeedInventory[]
  >("/api/feed-inventory/");

  return response.data;
};
