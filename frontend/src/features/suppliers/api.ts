import { axiosInstance } from "@/utils/axiosInstance";

export interface Supplier {
  id: string;
  tenant_id: string;
  tenant_name: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const listSuppliers = async (): Promise<Supplier[]> => {
  const response = await axiosInstance.get<Supplier[]>(
    "/api/suppliers/"
  );

  return response.data;
};
