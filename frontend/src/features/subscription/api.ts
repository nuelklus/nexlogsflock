import { axiosInstance } from "@/utils/axiosInstance";

export type SubscriptionPlanCode = "starter" | "business" | "enterprise";
export type SubscriptionStatus =
  | "trial"
  | "active"
  | "pending_manual_payment"
  | "past_due"
  | "cancelled";

export interface SubscriptionPlan {
  id: string;
  code: SubscriptionPlanCode;
  name: string;
  description: string;
  amount: number;
  billing_cycle: "monthly" | "annual";
  max_users: number;
  max_branches: number;
  features: string[];
  is_active: boolean;
}

export interface SubscriptionHistoryEntry {
  id: string;
  previous_status: SubscriptionStatus | null;
  new_status: SubscriptionStatus;
  payment_reference: string;
  notes: string;
  changed_by_email: string | null;
  created_at: string;
}

export interface TenantSubscriptionResponse {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_cycle: "monthly" | "annual";
  amount: number;
  next_billing_date: string | null;
  payment_reference: string;
  notes: string;
  billing_history: SubscriptionHistoryEntry[];
  started_at: string;
  updated_at: string;
}

export interface UpdateSubscriptionPayload {
  plan_code: SubscriptionPlanCode | string;
  billing_cycle?: "monthly" | "annual";
  payment_reference?: string;
  notes?: string;
}

export interface ConfirmSubscriptionPaymentPayload {
  status?: "active" | "pending_manual_payment" | "past_due" | "cancelled";
  payment_reference?: string;
  notes?: string;
}

export const listSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await axiosInstance.get<SubscriptionPlan[]>("/api/tenant/subscriptions/plans/");
  return response.data;
};

export const getCurrentSubscription = async (): Promise<TenantSubscriptionResponse> => {
  const response = await axiosInstance.get<TenantSubscriptionResponse>("/api/tenant/subscriptions/current/");
  return response.data;
};

export const updateSubscription = async (
  payload: UpdateSubscriptionPayload,
): Promise<TenantSubscriptionResponse> => {
  const response = await axiosInstance.post<TenantSubscriptionResponse>(
    "/api/tenant/subscriptions/update/",
    payload,
  );

  return response.data;
};

export const confirmSubscriptionPayment = async (
  payload: ConfirmSubscriptionPaymentPayload = {},
): Promise<TenantSubscriptionResponse> => {
  const response = await axiosInstance.post<TenantSubscriptionResponse>(
    "/api/tenant/subscriptions/confirm/",
    payload,
  );

  return response.data;
};
