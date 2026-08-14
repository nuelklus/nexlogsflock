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
  TableSkeletonLoader,
} from "@/components/common";
import {
  formatEggGradeLabel,
} from "@/features/eggInventory/constants";
import { EggInventory, listEggInventory } from "@/features/eggInventory/api";
import { EggProduction, listEggProductions } from "@/features/eggProduction/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

const getToday = () => new Date().toISOString().split("T")[0];

export default function EggInventoryPage() {
  const { activeTenantId } = useAuth();
  const [inventory, setInventory] = useState<EggInventory[]>([]);
  const [productions, setProductions] = useState<EggProduction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setInventory([]);
          setProductions([]);
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
        const [inventoryResult, productionsResult] =
          await Promise.all([
            listEggInventory(),
            listEggProductions(),
          ]);

        if (isMounted) {
          setInventory(inventoryResult);
          setProductions(productionsResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load egg inventory."
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

  const totalEggsInStorage = useMemo(
    () =>
      inventory.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
    [inventory]
  );

  const totalAvailableEggs = useMemo(
    () =>
      inventory.reduce(
        (sum, item) =>
          sum + Number(item.available_quantity || 0),
        0
      ),
    [inventory]
  );

  const eggsCollectedToday = useMemo(() => {
    const today = getToday();

    return productions
      .filter((item) => item.production_date === today)
      .reduce(
        (sum, item) => sum + Number(item.total_eggs || 0),
        0
      );
  }, [productions]);

  const branchesInStock = useMemo(
    () => new Set(inventory.map((item) => item.branch)).size,
    [inventory]
  );

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Egg Inventory"
        subtitle="View current egg inventory by branch and grade, stored canonically in pieces."
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
            label="Total Eggs in Storage"
            value={formatNumber(totalEggsInStorage)}
          />
          <MetricCard
            label="Available Eggs"
            value={formatNumber(totalAvailableEggs)}
          />
          <MetricCard
            label="Eggs Collected Today"
            value={formatNumber(eggsCollectedToday)}
          />
          <MetricCard
            label="Branches With Stock"
            value={formatNumber(branchesInStock)}
          />
        </Box>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific egg inventory data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid #E5EAF2", overflowX: "auto" }}
      >
        <Table sx={{ minWidth: 1100 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Pieces
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Crates
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Available Pieces
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Available Crates
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Collection Start
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Collection End
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Storage Location
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Last Updated
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={12} />
            ) : inventory.length > 0 ? (
              inventory.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {item.branch_name}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(item.quantity)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(item.crates)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(item.available_quantity)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(item.available_crates)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {item.unit}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatEggGradeLabel(item.grade)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(item.collection_start_date)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(item.collection_end_date)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {item.storage_location || "—"}
                  </TableCell>
                  <TableCell>{item.notes || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(item.updated_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12}>
                  <EmptyState
                    title="No eggs in storage"
                    message="Eggs collected from your batches will appear here."
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
