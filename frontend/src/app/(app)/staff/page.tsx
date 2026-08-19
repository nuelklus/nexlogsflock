"use client";

import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { registerStaff } from "@/auth/api";
import { useAuth } from "@/auth/context/AuthContext";
import type { StaffRegistrationFormInputs } from "@/auth/types";
import { PageHeader } from "@/components/common";
import { listBranches, type Branch } from "@/features/branches/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const emptyForm: StaffRegistrationFormInputs = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  password: "",
  confirm_password: "",
  branch_id: "",
  staff_type: "farm_manager",
};

export default function StaffPage() {
  const { activeTenantId, tenants } = useAuth();

  const activeTenant = useMemo(
    () => tenants.find((organization) => organization.id === activeTenantId) ?? null,
    [activeTenantId, tenants]
  );

  const isOwner = activeTenant?.role.name === "Owner";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<StaffRegistrationFormInputs>(emptyForm);

  useEffect(() => {
    let isMounted = true;

    const loadBranches = async () => {
      if (!activeTenantId || !isOwner) {
        if (isMounted) {
          setBranches([]);
        }
        return;
      }

      if (isMounted) {
        setLoadingBranches(true);
      }

      try {
        const result = await listBranches();
        if (isMounted) {
          setBranches(result.filter((branch) => branch.is_active));
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(getApiErrorMessage(fetchError, "Unable to load branches for this tenant."));
        }
      } finally {
        if (isMounted) {
          setLoadingBranches(false);
        }
      }
    };

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, [activeTenantId, isOwner]);

  const handleFieldChange = (field: keyof StaffRegistrationFormInputs) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeTenantId) {
      setError("Select a tenant before registering staff.");
      return;
    }

    if (!isOwner) {
      setError("Only the tenant owner can register staff members.");
      return;
    }

    if (!form.branch_id) {
      setError("Please choose the staff member's assigned branch.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await registerStaff({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        password: form.password,
        branch_id: form.branch_id,
        staff_type: form.staff_type,
      });

      setSuccess("Staff member registered successfully.");
      setForm(emptyForm);
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, "Unable to register staff member."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Staff"
        subtitle={
          isOwner
            ? "Register farm staff for the active tenant."
            : "Only the tenant owner can add staff members."
        }
      />

      {!activeTenantId ? (
        <Alert severity="info">Select a tenant from the header before managing staff.</Alert>
      ) : null}

      {activeTenantId && !isOwner ? (
        <Alert severity="warning">Only the current tenant owner can register staff members.</Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Paper sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }}>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "grid", gap: 2.5 }}>
          <Grid container spacing={2}>
            <Grid xs={12} sm={4}>
              <TextField
                label="First name"
                fullWidth
                value={form.first_name}
                onChange={handleFieldChange("first_name")}
                required
                disabled={isSubmitting || !isOwner || !activeTenantId}
              />
            </Grid>
            <Grid xs={12} sm={4}>
              <TextField
                label="Last name"
                fullWidth
                value={form.last_name}
                onChange={handleFieldChange("last_name")}
                required
                disabled={isSubmitting || !isOwner || !activeTenantId}
              />
            </Grid>
            <Grid xs={12} sm={4}>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                value={form.email}
                onChange={handleFieldChange("email")}
                required
                disabled={isSubmitting || !isOwner || !activeTenantId}
              />
            </Grid>
            <Grid xs={12} sm={4}>
              <TextField
                label="Phone number"
                fullWidth
                value={form.phone_number}
                onChange={handleFieldChange("phone_number")}
                required
                disabled={isSubmitting || !isOwner || !activeTenantId}
              />
            </Grid>
            <Grid xs={12} sm={4}>
              <FormControl fullWidth disabled={isSubmitting || !isOwner || !activeTenantId}>
                <InputLabel id="staff-type-label">Staff type</InputLabel>
                <Select
                  labelId="staff-type-label"
                  label="Staff type"
                  value={form.staff_type}
                  onChange={handleFieldChange("staff_type")}
                >
                  <MenuItem value="farm_manager">Farm Manager</MenuItem>
                  <MenuItem value="farm_attendant">Farm Attendant</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={4}>
              <FormControl
                fullWidth
                disabled={isSubmitting || !isOwner || !activeTenantId || loadingBranches}
                sx={{ minWidth: 220 }}
              >
                <InputLabel id="branch-label">Branch</InputLabel>
                <Select
                  labelId="branch-label"
                  label="Branch"
                  value={form.branch_id}
                  onChange={handleFieldChange("branch_id")}
                  sx={{ minHeight: 56 }}
                >
                  {branches.length === 0 ? (
                    <MenuItem value="" disabled>
                      {loadingBranches ? "Loading branches..." : "No active branches found"}
                    </MenuItem>
                  ) : (
                    branches.map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={form.password}
                onChange={handleFieldChange("password")}
                required
                disabled={isSubmitting || !isOwner || !activeTenantId}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                value={form.confirm_password}
                onChange={handleFieldChange("confirm_password")}
                required
                disabled={isSubmitting || !isOwner || !activeTenantId}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !isOwner || !activeTenantId || loadingBranches}
              sx={{ minWidth: 160 }}
            >
              {isSubmitting ? "Registering..." : "Register Staff"}
            </Button>
            <Button type="button" variant="outlined" onClick={resetForm} disabled={isSubmitting}>
              Reset
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Stack>
  );
}
