import { axiosInstance } from "@/utils/axiosInstance";

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  category: string;
  category_name: string;
  branch: string | null;
  branch_name: string | null;
  house: string | null;
  house_name: string | null;
  batch: string | null;
  batch_name: string | null;
  description: string;
  amount: string;
  expense_date: string;
  vendor_name: string;
  payment_method: string;
  payment_method_label: string;
  reference: string;
  notes: string;
  payment: string | null;
  payment_reference: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  category: string;
  branch?: string | null;
  house?: string | null;
  batch?: string | null;
  description: string;
  amount: number;
  expense_date: string;
  vendor_name?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}

export const listExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const res = await axiosInstance.get<ExpenseCategory[]>("/api/expense-categories/");
  return res.data;
};

export const listExpenses = async (params?: {
  category?: string;
  category_id?: string;
  branch?: string;
  branch_id?: string;
  house?: string;
  house_id?: string;
  batch?: string;
  batch_id?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  amount?: string | number;
  created_by?: string;
  search?: string;
}): Promise<Expense[]> => {
  const res = await axiosInstance.get<Expense[]>("/api/expenses/", { params });
  return res.data;
};

export const createExpense = async (
  data: CreateExpenseInput
): Promise<Expense> => {
  const res = await axiosInstance.post<Expense>("/api/expenses/", data);
  return res.data;
};
