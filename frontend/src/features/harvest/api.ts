import { axiosInstance } from "@/utils/axiosInstance";

export interface Harvest {
  id: string;
  branch: string;
  branch_name: string;
  batch: string;
  batch_number: string;
  harvest_date: string;
  birds_harvested: number;
  birds_available: number;
  status: string;
  average_weight: string | null;
  total_weight: string | null;
  harvest_reason: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listHarvests = async (): Promise<Harvest[]> => {
  const res = await axiosInstance.get<Harvest[]>("/api/harvest/");
  return res.data;
};
