import { axiosInstance } from "@/utils/axiosInstance";

export interface DiseaseOutbreak {
  id: string;
  branch: string;
  branch_name: string;
  house: string;
  house_name: string;
  batch: string;
  batch_number: string;
  disease: string;
  disease_name: string;
  outbreak_date: string;
  birds_affected: number;
  severity: string;
  status: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listDiseaseOutbreaks = async (): Promise<
  DiseaseOutbreak[]
> => {
  const response = await axiosInstance.get<DiseaseOutbreak[]>(
    "/api/disease-outbreaks/"
  );

  return response.data;
};
