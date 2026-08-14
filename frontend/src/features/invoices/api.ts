import { axiosInstance } from "@/utils/axiosInstance";

export interface InvoiceItemRead {
  id: string;
  harvest: string | null;
  meat_inventory: string | null;
  egg_inventory: string | null;
  product_name: string | null;
  egg_grade: string | null;
  source_available: number | null;
  branch_name: string | null;
  quantity: string;
  unit: string;
  physical_quantity: string;
  unit_price: string;
  total: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  customer: string | null;
  customer_name: string | null;
  branch: string | null;
  branch_name: string | null;
  invoice_no: string;
  invoice_date: string | null;
  due_date: string | null;
  notes: string;
  items: InvoiceItemRead[];
  crate_capacity: string;
  total: string;
  payment_status: "unpaid" | "partially_paid" | "paid" | "overdue";
  amount_paid: number;
  balance_due: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItemWriteInput {
  harvest?: string | null;
  meat_inventory?: string | null;
  egg_inventory?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price: number;
}

export interface CreateInvoiceInput {
  customer?: string | null;
  branch?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  notes?: string;
  items_write: InvoiceItemWriteInput[];
}

export const listInvoices = async (params?: {
  customer?: string;
  payment_status?: string;
}): Promise<Invoice[]> => {
  const res = await axiosInstance.get<Invoice[]>("/api/invoice/", {
    params,
  });
  return res.data;
};

export const getInvoice = async (id: string): Promise<Invoice> => {
  const res = await axiosInstance.get<Invoice>(`/api/invoice/${id}/`);
  return res.data;
};

export const createInvoice = async (
  data: CreateInvoiceInput
): Promise<Invoice> => {
  const res = await axiosInstance.post<Invoice>("/api/invoice/", data);
  return res.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/api/invoice/${id}/`);
};
