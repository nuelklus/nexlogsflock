import { axiosInstance } from "@/utils/axiosInstance";

export type DiseaseBirdType = "layer" | "broiler" | "both";
export type DiseaseType =
  | "viral"
  | "bacterial"
  | "parasitic"
  | "fungal"
  | "nutritional"
  | "other";

export interface Disease {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  bird_type: DiseaseBirdType;
  disease_type: DiseaseType;
  description: string;
  symptoms: string;
  prevention: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listDiseases = async (): Promise<Disease[]> => {
  const response = await axiosInstance.get<Disease[]>(
    "/api/diseases/"
  );

  return response.data;
};
