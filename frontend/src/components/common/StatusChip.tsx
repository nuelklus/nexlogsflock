"use client";

import { Chip, ChipProps } from "@mui/material";

export interface StatusChipProps extends Omit<ChipProps, "label"> {
  status: string;
}

const statusColorMap: Record<string, { color: ChipProps["color"]; label: string }> = {
  active: { color: "success", label: "Active" },
  closed: { color: "default", label: "Closed" },
  sold: { color: "info", label: "Sold" },
  pending: { color: "warning", label: "Pending" },
  completed: { color: "success", label: "Completed" },
  in_stock: { color: "success", label: "In Stock" },
  low_stock: { color: "warning", label: "Low Stock" },
  out_of_stock: { color: "error", label: "Out of Stock" },
  true: { color: "success", label: "Yes" },
  false: { color: "default", label: "No" },
};

export function StatusChip({ status, ...props }: StatusChipProps) {
  const statusConfig = statusColorMap[status?.toLowerCase()] || {
    color: "default" as const,
    label: status,
  };

  return <Chip label={statusConfig.label} color={statusConfig.color} size="small" {...props} />;
}
