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

export interface CreateSupplierInput {
  name: string;
  phone?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
}

export const listSuppliers = async (): Promise<Supplier[]> => {
  const response = await axiosInstance.get<Supplier[]>("/api/suppliers/");
  return response.data;
};

export const createSupplier = async (data: CreateSupplierInput): Promise<Supplier> => {
  const response = await axiosInstance.post<Supplier>("/api/suppliers/", data);
  return response.data;
};

export const updateSupplier = async (id: string, data: UpdateSupplierInput): Promise<Supplier> => {
  const response = await axiosInstance.patch<Supplier>(`/api/suppliers/${id}/`, data);
  return response.data;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/suppliers/${id}/`);
};
