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

export interface InvoiceSummary {
  total_invoices: number;
  total_invoiced?: string;
  total_amount?: string;
  total_paid?: string;
  amount_paid?: string;
  total_partially_paid?: string;
  total_unpaid?: string;
  amount_outstanding?: string;
  total_outstanding?: string;
  total_balance?: string;
  paid_invoices?: number;
  paid_invoice_count?: number;
  partial_invoices?: number;
  partially_paid_invoice_count?: number;
  unpaid_invoices?: number;
  unpaid_invoice_count?: number;
  overdue_invoices?: number;
}

export interface InvoiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Invoice[];
  summary?: InvoiceSummary;
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

export interface InvoiceListParams {
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  payment_status?: string;
  item_type?: string;
  branch_id?: string;
  branch?: string;
  customer_id?: string;
  customer?: string;
  amount_min?: string;
  amount_max?: string;
  search?: string;
}

export const listInvoices = async (params?: InvoiceListParams): Promise<Invoice[]> => {
  const res = await axiosInstance.get<Invoice[] | InvoiceListResponse>("/api/invoice/", {
    params: {
      ...params,
      page_size: params?.page_size ?? 80,
    },
  });

  const payload = res.data;
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.results ?? [];
};

export const getInvoiceSummary = async (params?: InvoiceListParams): Promise<InvoiceSummary> => {
  const res = await axiosInstance.get<{ summary: InvoiceSummary }>("/api/invoice/summary/", {
    params: {
      ...params,
      page_size: undefined,
    },
  });

  return res.data.summary ?? {
    total_invoices: 0,
    total_invoiced: "0.00",
    total_amount: "0.00",
    total_paid: "0.00",
    amount_paid: "0.00",
    total_partially_paid: "0.00",
    total_unpaid: "0.00",
    total_outstanding: "0.00",
    amount_outstanding: "0.00",
    total_balance: "0.00",
    paid_invoices: 0,
    paid_invoice_count: 0,
    partial_invoices: 0,
    partially_paid_invoice_count: 0,
    unpaid_invoices: 0,
    unpaid_invoice_count: 0,
    overdue_invoices: 0,
  };
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
