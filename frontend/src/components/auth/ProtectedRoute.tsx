"use client";

import { CircularProgress, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/auth/context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <Stack sx={{ alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Stack>
    );
  }

  return <>{children}</>;
}
