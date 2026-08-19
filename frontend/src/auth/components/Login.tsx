"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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

    const normalizedValues = {
      ...values,
      email: values.email.trim().toLowerCase(),
    };

    try {
      await loginUser(normalizedValues);
      router.push("/dashboard");
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to sign in. Please verify your credentials."));
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        overflow: "hidden",
        background: "radial-gradient(circle at top left, rgba(30,136,229,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(186,104,200,0.12), transparent 28%), #f6f8fc",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1180,
          borderRadius: { xs: 3, md: 5 },
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          boxShadow: "0 28px 80px rgba(15, 23, 42, 0.12)",
          backgroundColor: "#ffffff",
          height: { xs: "auto", md: "calc(100vh - 32px)" },
          maxHeight: { xs: "none", md: "calc(100vh - 32px)" },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.08fr 0.92fr" },
            minHeight: { xs: "calc(100vh - 32px)", md: "calc(100vh - 32px)" },
            height: "100%",
          }}
        >
          <Box
            sx={{
              position: "relative",
              p: { xs: 3, sm: 4, md: 5 },
              background: "linear-gradient(135deg, rgba(12, 34, 64, 0.96), rgba(26, 98, 179, 0.92) 48%, rgba(186,104,200,0.74))",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: "center" }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: 800,
                    fontSize: 20,
                  }}
                >
                  N
                </Box>
                <Typography variant="subtitle2" sx={{ letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.9 }}>
                  NexlogsFlock
                </Typography>
              </Stack>

              <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.06em", maxWidth: 420, fontSize: { xs: "2.1rem", sm: "2.5rem", md: "3rem" } }}>
                Smarter farm decisions, from barn to balance sheet.
              </Typography>

              <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 430, color: "rgba(255,255,255,0.8)", fontSize: { xs: "0.95rem", md: "1rem" } }}>
                Monitor flock health, production, feed flow, and financial performance in one secure, tenant-aware workspace.
              </Typography>
            </Box>

            <Box sx={{ position: "relative", zIndex: 1, mt: 2 }}>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80"
                alt="Poultry farm"
                sx={{
                  width: "100%",
                  height: { xs: 170, sm: 200, md: 240 },
                  objectFit: "cover",
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 22px 50px rgba(15, 23, 42, 0.25)",
                  mb: 2,
                }}
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#fff",
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mb: 0.5 }}>
                    Active farms
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: "1.3rem", md: "1.6rem" } }}>
                    24
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#fff",
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mb: 0.5 }}>
                    Egg production
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: "1.3rem", md: "1.6rem" } }}>
                    92.4%
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              p: { xs: 2.5, sm: 3, md: 4 },
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 430 }}>
              <Stack spacing={2.25}>
                <Box>
                  <Typography variant="overline" sx={{ display: "block", color: "primary.main", fontWeight: 700, letterSpacing: 1.2 }}>
                    Welcome back
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.045em", mt: 0.5, fontSize: { xs: "2rem", sm: "2.3rem" } }}>
                    Sign in to your farm
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Manage your poultry operations with secure multi-tenant access.
                  </Typography>
                </Box>

                {formError ? (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {formError}
                  </Alert>
                ) : null}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                  <Stack spacing={1.75}>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          type="email"
                          label="Email address"
                          fullWidth
                          error={Boolean(fieldState.error)}
                          helperText={fieldState.error?.message}
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, backgroundColor: "#fff" } }}
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
                          fullWidth
                          error={Boolean(fieldState.error)}
                          helperText={fieldState.error?.message}
                          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, backgroundColor: "#fff" } }}
                        />
                      )}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={isLoading}
                      sx={{
                        height: 50,
                        borderRadius: 2.5,
                        fontWeight: 700,
                        letterSpacing: "0.01em",
                        boxShadow: "0 14px 28px rgba(30,136,229,0.22)",
                      }}
                    >
                      {isLoading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
                    </Button>

                    <Button
                      component={Link}
                      href="/register"
                      variant="outlined"
                      size="large"
                      sx={{
                        height: 50,
                        borderRadius: 2.5,
                        fontWeight: 700,
                      }}
                      disabled
                    >
                      Create account
                    </Button>
                  </Stack>
                </Box>

                <Divider flexItem>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    Secure access
                  </Typography>
                </Divider>

                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                  Need help? Contact your tenant administrator.
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
