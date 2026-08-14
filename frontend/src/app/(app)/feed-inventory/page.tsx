"use client";

import {
  Alert,
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/context/AuthContext";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  StatusChip,
  TableSkeletonLoader,
} from "@/components/common";
import {
  FeedInventory,
  listFeedInventory,
} from "@/features/feedInventory/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

const getInventoryStatus = (
  availableQuantity: number
) => {
  if (availableQuantity <= 0) {
    return "out_of_stock";
  }

  if (availableQuantity < 100) {
    return "low_stock";
  }

  return "in_stock";
};

export default function FeedInventoryPage() {
  const { activeTenantId } = useAuth();
  const [inventory, setInventory] = useState<
    FeedInventory[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setInventory([]);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await listFeedInventory();

        if (isMounted) {
          setInventory(result);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load feed inventory."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  const totalAvailableStock = useMemo(
    () =>
      inventory.reduce(
        (sum, item) =>
          sum + Number(item.available_quantity || 0),
        0
      ),
    [inventory]
  );

  const lowStockCount = useMemo(
    () =>
      inventory.filter(
        (item) =>
          getInventoryStatus(
            Number(item.available_quantity || 0)
          ) === "low_stock"
      ).length,
    [inventory]
  );

  const branchesWithStock = useMemo(
    () => new Set(inventory.map((item) => item.branch)).size,
    [inventory]
  );

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Feed Inventory"
        subtitle="View current feed stock balances by branch and feed type."
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          <MetricCard
            label="Feed Types in Stock"
            value={formatNumber(inventory.length)}
          />
          <MetricCard
            label="Available Stock (kg)"
            value={formatNumber(totalAvailableStock)}
          />
          <MetricCard
            label="Branches With Stock"
            value={formatNumber(branchesWithStock)}
          />
          <MetricCard
            label="Low Stock Items"
            value={formatNumber(lowStockCount)}
          />
        </Box>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific feed inventory data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid #E5EAF2", overflowX: "auto" }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>
                Feed Type
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Branch
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Available Stock
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Total Stock
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Unit
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Last Updated
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={7} />
            ) : inventory.length > 0 ? (
              inventory.map((item) => {
                const status = getInventoryStatus(
                  Number(item.available_quantity || 0)
                );

                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {item.feed_type_name}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {item.branch_name}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatNumber(item.available_quantity)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatNumber(item.quantity)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {item.unit}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={status} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(item.updated_at)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="No feed inventory yet"
                    message="Feed inventory will appear here when purchases are recorded."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
