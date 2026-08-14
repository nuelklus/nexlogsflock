"use client";

import { Paper, Stack, Typography } from "@mui/material";

export interface MetricCardProps {
  label: string;
  value: string;
  helperText?: string;
}

export function MetricCard({
  label,
  value,
  helperText,
}: MetricCardProps) {
  return (
    <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
      <Stack sx={{ gap: 0.75 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
        {helperText ? (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}
