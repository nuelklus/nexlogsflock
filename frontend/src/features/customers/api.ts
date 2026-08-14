import { axiosInstance } from "@/utils/axiosInstance";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
}

export const listCustomers = async (): Promise<Customer[]> => {
  const res = await axiosInstance.get<Customer[]>("/api/customers/");
  return res.data;
};

export const createCustomer = async (
  data: CreateCustomerInput
): Promise<Customer> => {
  const res = await axiosInstance.post<Customer>("/api/customers/", data);
  return res.data;
};

export const updateCustomer = async (
  id: string,
  data: UpdateCustomerInput
): Promise<Customer> => {
  const res = await axiosInstance.patch<Customer>(
    `/api/customers/${id}/`,
    data
  );
  return res.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/customers/${id}/`);
};
