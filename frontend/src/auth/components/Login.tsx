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
import { LoginFormInputs } from "@/auth/types";
import { getApiErrorMessage } from "@/lib/api/errors";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export default function Login() {
  const router = useRouter();
  const { loginUser, isLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const { handleSubmit, control } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormInputs) => {
    setFormError(null);
    try {
      await loginUser(values);
      router.push("/dashboard");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to sign in. Please verify your credentials."));
    }
  };

  return (
    <Stack sx={{ minHeight: "100vh", justifyContent: "center", alignItems: "center", px: 2 }}>
      <Paper sx={{ width: "100%", maxWidth: 480, p: 4 }}>
        <Stack sx={{ spacing: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Sign in to NexlogsFlock
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your poultry operations with secure multi-tenant access.
            </Typography>
          </Box>

          {formError ? <Alert severity="error">{formError}</Alert> : null}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack sx={{ spacing: 2 }}>
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

              <Button type="submit" variant="contained" size="large" disabled={isLoading}>
                {isLoading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Need an account? <Link href="/register">Create one</Link>
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
