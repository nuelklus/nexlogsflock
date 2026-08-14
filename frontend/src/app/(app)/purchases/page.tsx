"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/context/AuthContext";
import {
  ConfirmDialog,
  EmptyState,
  MetricCard,
  PageHeader,
  TableSkeletonLoader,
} from "@/components/common";
import { Branch, listBranches } from "@/features/branches/api";
import { BirdBatch, listBatches } from "@/features/batches/api";
import { Breed, listBreeds } from "@/features/breeds/api";
import {
  BirdPurchase,
  createBirdPurchase,
  deleteBirdPurchase,
  listBirdPurchases,
  updateBirdPurchase,
} from "@/features/purchases/api";
import { Supplier, listSuppliers } from "@/features/suppliers/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { getApiErrorMessage } from "@/lib/api/errors";

const getToday = () => new Date().toISOString().split("T")[0];

export default function PurchasesPage() {
  const { activeTenantId, tenants } = useAuth();
  const [purchases, setPurchases] = useState<BirdPurchase[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    batch: "",
    supplier: "",
    breed: "",
    branch: "",
    purchase_date: getToday(),
    arrival_date: getToday(),
    quantity: 0,
    unit_cost: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState({
    batch: "",
    branch: "",
    supplier: "",
  });

  const activeTenantCurrency = useMemo(
    () =>
      tenants.find((tenant) => tenant.id === activeTenantId)
        ?.currency || "USD",
    [activeTenantId, tenants]
  );

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setPurchases([]);
          setBatches([]);
          setBranches([]);
          setBreeds([]);
          setSuppliers([]);
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
        const [
          purchasesResult,
          batchesResult,
          branchesResult,
          breedsResult,
          suppliersResult,
        ] = await Promise.all([
          listBirdPurchases(),
          listBatches(),
          listBranches(),
          listBreeds(),
          listSuppliers(),
        ]);

        if (isMounted) {
          setPurchases(purchasesResult);
          setBatches(batchesResult);
          setBranches(branchesResult);
          setBreeds(breedsResult);
          setSuppliers(suppliersResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load bird purchases."
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

  const handleOpenForm = (purchase?: BirdPurchase) => {
    if (purchase) {
      setEditingId(purchase.id);
      setFormData({
        batch: purchase.batch || "",
        supplier: purchase.supplier || "",
        breed: purchase.breed || "",
        branch: purchase.branch,
        purchase_date: purchase.purchase_date,
        arrival_date: purchase.arrival_date || "",
        quantity: purchase.quantity,
        unit_cost: Number(purchase.unit_cost),
      });
    } else {
      setEditingId(null);
      setFormData({
        batch: "",
        supplier: "",
        breed: "",
        branch: branches[0]?.id || "",
        purchase_date: getToday(),
        arrival_date: getToday(),
        quantity: 0,
        unit_cost: 0,
      });
    }

    setFormError(null);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const selectedFormBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === formData.batch) || null,
    [batches, formData.batch]
  );

  const filteredPurchases = useMemo(
    () =>
      purchases.filter((purchase) => {
        if (filters.batch && purchase.batch !== filters.batch) {
          return false;
        }

        if (filters.branch && purchase.branch !== filters.branch) {
          return false;
        }

        if (
          filters.supplier &&
          purchase.supplier !== filters.supplier
        ) {
          return false;
        }

        return true;
      }),
    [filters.batch, filters.branch, filters.supplier, purchases]
  );

  const selectedFilterBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === filters.batch) || null,
    [batches, filters.batch]
  );

  const handleSaveForm = async () => {
    if (
      !formData.branch ||
      !formData.purchase_date ||
      formData.quantity <= 0
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.unit_cost < 0) {
      setFormError("Unit cost cannot be negative.");
      return;
    }

    if (
      formData.arrival_date &&
      formData.arrival_date < formData.purchase_date
    ) {
      setFormError(
        "Arrival date cannot be before purchase date."
      );
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        batch: formData.batch || null,
        supplier: formData.supplier || null,
        breed: formData.breed || null,
        branch: formData.branch,
        purchase_date: formData.purchase_date,
        arrival_date: formData.arrival_date || null,
        quantity: formData.quantity,
        unit_cost: formData.unit_cost,
      };

      if (editingId) {
        const updated = await updateBirdPurchase(
          editingId,
          payload
        );
        setPurchases((prev) =>
          prev.map((purchase) =>
            purchase.id === editingId ? updated : purchase
          )
        );
      } else {
        const created = await createBirdPurchase(payload);
        setPurchases((prev) => [created, ...prev]);
      }

      handleCloseForm();
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(
          saveError,
          "Failed to save bird purchase."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteBirdPurchase(deleteTarget);
      setPurchases((prev) =>
        prev.filter((purchase) => purchase.id !== deleteTarget)
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Failed to delete bird purchase."
        )
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalBirdsPurchased = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0
  );
  const totalSpend = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_cost),
    0
  );
  const averageUnitCost =
    totalBirdsPurchased > 0
      ? totalSpend / totalBirdsPurchased
      : 0;

  const displayedBatchCount = new Set(
    filteredPurchases
      .map((purchase) => purchase.batch)
      .filter((batchId): batchId is string => Boolean(batchId))
  ).size;

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Bird Purchases"
        subtitle="Track chick purchase history, spend, and branch allocations."
        action={{
          label: "Record Purchase",
          onClick: () => handleOpenForm(),
          disabled: !activeTenantId,
        }}
      >
        <Stack sx={{ gap: 2.5 }}>
          <Paper
            sx={{
              p: 2,
              border: "1px solid #E5EAF2",
            }}
          >
            <Stack sx={{ gap: 2 }}>
              <Stack
                sx={{
                  flexDirection: { xs: "column", md: "row" },
                  justifyContent: "space-between",
                  alignItems: {
                    xs: "flex-start",
                    md: "center",
                  },
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Filters
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Narrow bird purchase records by batch, branch, or supplier.
                  </Typography>
                </Box>
                {filters.batch || filters.branch || filters.supplier ? (
                  <Button
                    variant="text"
                    onClick={() =>
                      setFilters({
                        batch: "",
                        branch: "",
                        supplier: "",
                      })
                    }
                  >
                    Clear filters
                  </Button>
                ) : null}
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(3, minmax(0, 1fr))",
                  },
                }}
              >
                <TextField
                  label="Filter by Batch"
                  select
                  value={filters.batch}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      batch: event.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">All batches</MenuItem>
                  {batches.map((batch) => (
                    <MenuItem key={batch.id} value={batch.id}>
                      {batch.batch_number}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Filter by Branch"
                  select
                  value={filters.branch}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      branch: event.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">All branches</MenuItem>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Filter by Supplier"
                  select
                  value={filters.supplier}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      supplier: event.target.value,
                    }))
                  }
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">All suppliers</MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {selectedFilterBatch ? (
                <Alert severity="info" sx={{ py: 0 }}>
                  Showing purchase records for batch{" "}
                  <strong>{selectedFilterBatch.batch_number}</strong>
                  {selectedFilterBatch.house_name
                    ? ` in ${selectedFilterBatch.house_name}`
                    : ""}
                  .
                </Alert>
              ) : null}
            </Stack>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            <MetricCard
              label="Displayed Purchases"
              value={formatNumber(filteredPurchases.length)}
            />
            <MetricCard
              label="Displayed Batches"
              value={formatNumber(displayedBatchCount)}
            />
            <MetricCard
              label="Birds Purchased"
              value={formatNumber(totalBirdsPurchased)}
            />
            <MetricCard
              label="Total Spend"
              value={formatCurrency(
                totalSpend,
                activeTenantCurrency
              )}
            />
            <MetricCard
              label="Average Cost / Bird"
              value={formatCurrency(
                averageUnitCost,
                activeTenantCurrency
              )}
            />
          </Box>
        </Stack>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific bird purchase data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{
          border: "1px solid #E5EAF2",
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        <Table sx={{ minWidth: 1320 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>
                Purchase Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Arrival Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Batch
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Supplier
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Breed
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                House
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Branch
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Quantity
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Unit Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Total Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, width: 120 }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={11} />
            ) : filteredPurchases.length > 0 ? (
              filteredPurchases.map((purchase) => {
                const purchaseBatch = batches.find(
                  (batch) => batch.id === purchase.batch
                );

                return (
                  <TableRow key={purchase.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(purchase.purchase_date)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(purchase.arrival_date)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {purchase.batch_number ||
                        purchaseBatch?.batch_number ||
                        "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {purchase.supplier_name || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {purchase.breed_name || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {purchaseBatch?.house_name || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {purchase.branch_name}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {formatNumber(purchase.quantity)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {formatCurrency(
                        purchase.unit_cost,
                        activeTenantCurrency
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {formatCurrency(
                        purchase.total_cost,
                        activeTenantCurrency
                      )}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          minWidth: 120,
                        }}
                      >
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => handleOpenForm(purchase)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          onClick={() =>
                            handleDeleteClick(purchase.id)
                          }
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={11}>
                  <EmptyState
                    title={
                      purchases.length > 0
                        ? "No purchases match these filters"
                        : "No bird purchases yet"
                    }
                    message={
                      purchases.length > 0
                        ? "Adjust the filters to see more purchase records."
                        : "Record your first bird purchase to start tracking incoming stock."
                    }
                    action={{
                      label:
                        purchases.length > 0
                          ? "Clear Filters"
                          : "Record Purchase",
                      onClick: () =>
                        purchases.length > 0
                          ? setFilters({
                              batch: "",
                              branch: "",
                              supplier: "",
                            })
                          : handleOpenForm(),
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openForm}
        onClose={handleCloseForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingId
            ? "Edit Bird Purchase"
            : "Record Bird Purchase"}
        </DialogTitle>
        <DialogContent
          sx={{
            pt: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <TextField
            label="Batch (Optional)"
            select
            value={formData.batch}
            onChange={(event) => {
              const nextBatchId = event.target.value;
              const nextBatch =
                batches.find((batch) => batch.id === nextBatchId) ||
                null;

              setFormData((prev) => ({
                ...prev,
                batch: nextBatchId,
                branch: nextBatch?.branch || prev.branch,
                breed: nextBatch?.breed || "",
              }));
            }}
            fullWidth
            disabled={isSaving}
            helperText={
              selectedFormBatch
                ? `Using branch ${selectedFormBatch.branch_name}${
                    selectedFormBatch.house_name
                      ? `, house ${selectedFormBatch.house_name}`
                      : ""
                  }`
                : "Select a batch to anchor this purchase to a specific flock."
            }
          >
            <MenuItem value="">None</MenuItem>
            {batches.map((batch) => (
              <MenuItem key={batch.id} value={batch.id}>
                {batch.batch_number}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Supplier (Optional)"
            select
            value={formData.supplier}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                supplier: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {suppliers.map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Breed (Optional)"
            select
            value={formData.breed}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                breed: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving || Boolean(formData.batch)}
            helperText={
              formData.batch
                ? "Breed comes from the selected batch."
                : undefined
            }
          >
            <MenuItem value="">None</MenuItem>
            {breeds.map((breed) => (
              <MenuItem key={breed.id} value={breed.id}>
                {breed.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Branch"
            select
            value={formData.branch}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                branch: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving || Boolean(formData.batch)}
            helperText={
              formData.batch
                ? "Branch comes from the selected batch."
                : undefined
            }
          >
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Purchase Date"
            type="date"
            value={formData.purchase_date}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                purchase_date: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Arrival Date"
            type="date"
            value={formData.arrival_date}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                arrival_date: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Quantity"
            type="number"
            value={formData.quantity}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                quantity: Number.parseInt(event.target.value, 10) || 0,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="Unit Cost"
            type="number"
            value={formData.unit_cost}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                unit_cost:
                  Number.parseFloat(event.target.value) || 0,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseForm} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveForm}
            variant="contained"
            disabled={isSaving}
            loading={isSaving}
          >
            {editingId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Bird Purchase"
        message="Are you sure you want to delete this bird purchase record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
