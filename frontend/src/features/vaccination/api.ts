import { axiosInstance } from "@/utils/axiosInstance";

export type VaccinationRoute =
  | "water"
  | "injection"
  | "spray"
  | "eye_drop"
  | "oral"
  | "other";

export interface Vaccine {
  id: string;
  tenant: string;
  tenant_name: string;
  name: string;
  manufacturer: string;
  bird_type: "layer" | "broiler" | "both";
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaccinationRecord {
  id: string;
  batch: string;
  batch_number: string;
  plan: string | null;
  vaccine: string | null;
  vaccine_name: string | null;
  date_administered: string;
  quantity_used: string | null;
  route: VaccinationRoute;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVaccinationRecordInput {
  batch: string;
  plan?: string | null;
  vaccine: string;
  date_administered: string;
  quantity_used?: number | null;
  route?: VaccinationRoute;
  notes?: string;
}

export const listVaccines = async (): Promise<Vaccine[]> => {
  const response = await axiosInstance.get<Vaccine[]>(
    "/api/vaccines/"
  );

  return response.data;
};

export const listVaccinationRecords = async (): Promise<
  VaccinationRecord[]
> => {
  const response = await axiosInstance.get<VaccinationRecord[]>(
    "/api/vaccination-records/"
  );

  return response.data;
};

export const createVaccinationRecord = async (
  data: CreateVaccinationRecordInput
): Promise<VaccinationRecord> => {
  const response = await axiosInstance.post<VaccinationRecord>(
    "/api/vaccination-records/",
    data
  );

  return response.data;
};
