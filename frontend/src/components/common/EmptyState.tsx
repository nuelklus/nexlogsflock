"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 300,
        py: 4,
      }}
    >
      <Stack sx={{ textAlign: "center", gap: 2, maxWidth: 400 }}>
        {icon && <Box sx={{ fontSize: 64, mb: 1 }}>{icon}</Box>}
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        {action && (
          <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
            {action.label}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
