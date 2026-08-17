import { axiosInstance } from "@/utils/axiosInstance";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export interface Payment {
  id: string;
  invoice: string | null;
  invoice_no: string | null;
  invoice_total: string | null;
  customer_name: string | null;
  amount: string;
  method: string;
  payment_purpose: string;
  payment_purpose_display: string;
  date: string;
  reference: string;
  notes: string;
  balance_before: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentInput {
  invoice?: string | null;
  amount: number;
  method: string;
  payment_purpose?: string;
  date: string;
  reference?: string;
  notes?: string;
}

export const listPayments = async (params?: {
  invoice?: string;
  customer?: string;
  payment_purpose?: string;
}): Promise<Payment[]> => {
  const res = await axiosInstance.get<Payment[]>("/api/payments/", { params });
  return res.data;
};

export const createPayment = async (
  data: CreatePaymentInput
): Promise<Payment> => {
  const res = await axiosInstance.post<Payment>("/api/payments/", data);
  return res.data;
};
