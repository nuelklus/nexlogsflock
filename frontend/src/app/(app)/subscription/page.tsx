"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  confirmSubscriptionPayment,
  getCurrentSubscription,
  listSubscriptionPlans,
  SubscriptionPlan,
  TenantSubscriptionResponse,
  updateSubscription,
} from "@/features/subscription/api";

const statusLabels: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  pending_manual_payment: "Pending Manual Payment",
  past_due: "Past Due",
  cancelled: "Cancelled",
};

const statusColors: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
  trial: "info",
  active: "success",
  pending_manual_payment: "warning",
  past_due: "error",
  cancelled: "default",
};

export default function SubscriptionPage() {
  const { activeTenantId, tenants } = useAuth();
  const activeTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === activeTenantId) ?? null,
    [tenants, activeTenantId],
  );

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<TenantSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("manual-payment");
  const [notes, setNotes] = useState("Manual payment recorded by the business owner.");

  useEffect(() => {
    if (!activeTenantId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSubscriptionDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const [planResponse, subscriptionResponse] = await Promise.all([
          listSubscriptionPlans(),
          getCurrentSubscription(),
        ]);

        if (!isMounted) {
          return;
        }

        setPlans(planResponse);
        setSubscription(subscriptionResponse);
        setPaymentReference(subscriptionResponse.payment_reference || "manual-payment");
        setNotes(subscriptionResponse.notes || "Manual payment recorded by the business owner.");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(getApiErrorMessage(loadError, "Unable to load subscription plans and billing status."));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSubscriptionDetails();

    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  const handlePlanSelection = async (planCode: string) => {
    if (!activeTenantId) {
      return;
    }

    setSavingPlan(planCode);
    setError(null);
    setSuccess(null);

    try {
      const updatedSubscription = await updateSubscription({
        plan_code: planCode,
        billing_cycle: "monthly",
        payment_reference: paymentReference || "manual-payment",
        notes: notes || "Plan change requested manually.",
      });

      setSubscription(updatedSubscription);
      const selectedPlan = plans.find((plan) => plan.code === planCode);
      setSuccess(
        selectedPlan
          ? `Your tenant is now set to ${selectedPlan.name}. Manual payment confirmation is pending.`
          : "Subscription update submitted successfully.",
      );
    } catch (updateError) {
      setError(getApiErrorMessage(updateError, "Unable to update this tenant subscription."));
    } finally {
      setSavingPlan(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!activeTenantId) {
      return;
    }

    setConfirmingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      const confirmed = await confirmSubscriptionPayment({
        status: "active",
        payment_reference: paymentReference || "manual-payment",
        notes: notes || "Admin marked this subscription as paid.",
      });

      setSubscription(confirmed);
      setSuccess("Subscription marked as paid successfully.");
    } catch (confirmError) {
      setError(getApiErrorMessage(confirmError, "Unable to confirm this subscription payment."));
    } finally {
      setConfirmingPayment(false);
    }
  };

  const currentPlanCode = subscription?.plan?.code ?? activeTenant?.subscription_plan ?? "starter";

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Subscription & billing
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {activeTenant ? `Manage ${activeTenant.name}'s plan and billing status.` : "Choose a tenant to manage subscriptions."}
          </Typography>
        </Box>

        {activeTenant && (
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
              >
                <Box>
                  <Typography variant="overline" color="text.secondary">Current plan</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {subscription?.plan?.name ?? "Starter"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Chip
                    label={subscription ? statusLabels[subscription.status] ?? subscription.status : "Trial"}
                    color={subscription ? statusColors[subscription.status] ?? "default" : "info"}
                    variant="outlined"
                  />
                  {subscription?.status === "pending_manual_payment" && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleConfirmPayment}
                      disabled={confirmingPayment}
                    >
                      {confirmingPayment ? "Confirming..." : "Mark as paid"}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {!activeTenantId ? (
          <Alert severity="info">Select a tenant to manage subscription billing.</Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {plans.map((plan) => {
              const isSelected = currentPlanCode === plan.code;
              const isPending = subscription?.status === "pending_manual_payment" && isSelected;

              return (
                <Grid size={{ xs: 12, md: 4 }} key={plan.id} sx={{ width: "100%" }}>
                  <Card
                    variant={isSelected ? "elevation" : "outlined"}
                    sx={{
                      height: "100%",
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? "primary.main" : "divider",
                      boxShadow: isSelected ? 3 : 0,
                    }}
                  >
                    <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%", gap: 2 }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
                        {isSelected && <CheckCircleOutlineOutlinedIcon color="primary" />}
                      </Stack>

                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {plan.amount === 0 ? "Free" : `$${Number(plan.amount).toFixed(2)}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {plan.description}
                      </Typography>

                      <Divider />

                      <Stack spacing={1}>
                        <Typography variant="body2"><strong>{plan.max_users}</strong> users</Typography>
                        <Typography variant="body2"><strong>{plan.max_branches}</strong> branches</Typography>
                        {plan.features.map((feature) => (
                          <Typography key={feature} variant="body2" color="text.secondary">
                            • {feature}
                          </Typography>
                        ))}
                      </Stack>

                      <Box sx={{ mt: "auto" }}>
                        <Button
                          fullWidth
                          variant={isSelected ? "contained" : "outlined"}
                          color={isSelected ? "primary" : "inherit"}
                          onClick={() => handlePlanSelection(plan.code)}
                          disabled={savingPlan !== null || isSelected}
                        >
                          {savingPlan === plan.code
                            ? "Updating..."
                            : isPending
                              ? "Payment pending"
                              : isSelected
                                ? "Current plan"
                                : "Choose plan"}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {activeTenant && (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Manual payment details</Typography>

                <TextField
                  label="Payment reference"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  fullWidth
                />

                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
