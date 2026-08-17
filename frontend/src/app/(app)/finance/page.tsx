"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/common";

const financeModules = [
  {
    title: "Expenses",
    description: "Track operating costs across branches, houses, and batches.",
    href: "/expenses",
  },
  {
    title: "Suppliers",
    description: "Maintain supplier records and contact information.",
    href: "/suppliers",
  },
  {
    title: "Customers",
    description: "View and manage customer details used across invoicing.",
    href: "/customers",
  },
  {
    title: "Invoices",
    description: "Review invoice records and payment-related activity.",
    href: "/invoices",
  },
];

export default function FinancePage() {
  const router = useRouter();

  return (
    <Box>
      <PageHeader
        title="Finance"
        subtitle="Manage the financial side of the farm, from suppliers to invoices and expenses."
      />

      <Grid container spacing={2}>
        {financeModules.map((module) => (
          <Grid size={{ xs: 12, md: 6 }} key={module.href} sx={{ width: "100%" }}>
            <Card
              sx={{
                height: "100%",
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: 2,
                },
              }}
            >
              <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {module.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {module.description}
                </Typography>
                <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                  <Button variant="contained" onClick={() => router.push(module.href)}>
                    Open
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
