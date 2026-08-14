import { axiosInstance } from "@/utils/axiosInstance";

export type EggInventoryUnit = "piece";
export type EggInventoryGrade =
  | "LARGE"
  | "MEDIUM"
  | "SMALL"
  | "PULLET"
  | "UNSORTED";

export interface EggInventory {
  id: string;
  tenant_id: string;
  tenant_name: string;
  branch: string;
  branch_name: string;
  quantity: string;
  available_quantity: string;
  crates: string;
  available_crates: string;
  crate_capacity: string;
  unit: EggInventoryUnit;
  grade: EggInventoryGrade;
  collection_start_date: string;
  collection_end_date: string;
  storage_location: string;
  notes: string;
  created_by_email: string | null;
  updated_by_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listEggInventory = async (): Promise<EggInventory[]> => {
  const response = await axiosInstance.get<EggInventory[]>(
    "/api/egg-inventory/"
  );
  return response.data;
};
