"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/auth/context/AuthContext";
import { RegisterFormInputs } from "@/auth/types";
import { getApiErrorMessage } from "@/lib/api/errors";

const registerSchema = z
  .object({
    email: z.email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    password2: z.string().min(1, "Please confirm your password."),
    first_name: z.string().min(1, "First name is required."),
    last_name: z.string().min(1, "Last name is required."),
    phone_number: z.string().min(1, "Phone number is required."),
    organization_name: z.string().min(1, "Organization name is required."),
  })
  .refine((values) => values.password === values.password2, {
    path: ["password2"],
    message: "Passwords do not match.",
  });

export default function Register() {
  const router = useRouter();
  const { registerUser, isLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { handleSubmit, control } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      password2: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      organization_name: "",
    },
  });

  const onSubmit = async (values: RegisterFormInputs) => {
    setFormError(null);
    try {
      await registerUser(values);
      setIsSubmitted(true);
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to create your account right now."));
    }
  };

  return (
    <Stack sx={{ minHeight: "100vh", justifyContent: "center", alignItems: "center", px: 2, py: 4 }}>
      <Paper sx={{ width: "100%", maxWidth: 720, p: 4 }}>
        <Stack sx={{ spacing: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Create NexlogsFlock account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Register your organization to get started with secure poultry operations.
            </Typography>
          </Box>

          {formError ? <Alert severity="error">{formError}</Alert> : null}
          {isSubmitted ? (
            <Alert severity="success">
              Registration successful. Please verify your email, then sign in.
            </Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack sx={{ spacing: 2 }}>
              <Stack sx={{ direction: { xs: "column", md: "row" }, spacing: 2 }}>
                <Controller
                  control={control}
                  name="first_name"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="First name"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="last_name"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Last name"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Stack>

              <Controller
                control={control}
                name="organization_name"
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Organization name"
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                )}
              />

              <Stack sx={{ direction: { xs: "column", md: "row" }, spacing: 2 }}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="email"
                      label="Email"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="phone_number"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Phone number"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Stack>

              <Stack sx={{ direction: { xs: "column", md: "row" }, spacing: 2 }}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Password"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="password2"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Confirm password"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              </Stack>

              <Button type="submit" variant="contained" size="large" disabled={isLoading || isSubmitted}>
                {isLoading ? <CircularProgress size={22} color="inherit" /> : "Create account"}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Already have an account? <Link href="/login">Sign in</Link>
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
