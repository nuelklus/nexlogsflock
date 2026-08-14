import { axiosInstance } from "@/utils/axiosInstance";

export type FeedTypeBirdType = "layer" | "broiler" | "both";

export interface FeedType {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  bird_type: FeedTypeBirdType;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listFeedTypes = async (): Promise<FeedType[]> => {
  const response = await axiosInstance.get<FeedType[]>(
    "/api/feed-types/"
  );

  return response.data;
};
