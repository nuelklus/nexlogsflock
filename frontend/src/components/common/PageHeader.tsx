"use client";

import { ReactNode } from "react";
import { Button, Stack, Typography } from "@mui/material";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
    disabled?: boolean;
    loading?: boolean;
  };
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
  return (
    <Stack sx={{ spacing: 2 }}>
      <Stack
        sx={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        <Stack sx={{ spacing: 0.5, flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 1600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Stack>
        {action && (
          <Button
            variant="contained"
            onClick={action.onClick}
            color={action.color || "primary"}
            disabled={action.disabled || action.loading}
            loading={action.loading}
            sx={{ flexShrink: 0 }}
          >
            {action.label}
          </Button>
        )}
      </Stack>
      {children}
    </Stack>
  );
}
