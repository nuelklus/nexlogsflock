"use client";

import { CircularProgress, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/auth/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [isAuthenticated, isLoading, router]);

  return (
    <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <CircularProgress />
    </Stack>
  );
}
