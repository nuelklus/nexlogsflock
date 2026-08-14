"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";

import { AuthProvider } from "@/auth/context/AuthContext";
import { appTheme } from "@/theme/theme";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
