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
import {
  FeedPurchase,
  createFeedPurchase,
  deleteFeedPurchase,
  listFeedPurchases,
  updateFeedPurchase,
} from "@/features/feedPurchases/api";
import { FeedType, listFeedTypes } from "@/features/feedTypes/api";
import { Supplier, listSuppliers } from "@/features/suppliers/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";

const getToday = () => new Date().toISOString().split("T")[0];

export default function FeedPurchasesPage() {
  const { activeTenantId, tenants } = useAuth();
  const [feedPurchases, setFeedPurchases] = useState<
    FeedPurchase[]
  >([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    supplier: "",
    feed_type: "",
    branch: "",
    purchase_date: getToday(),
    quantity_bags: 0,
    weight_per_bag: 50,
    unit_cost: 0,
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          setFeedPurchases([]);
          setBranches([]);
          setFeedTypes([]);
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
          branchesResult,
          feedTypesResult,
          suppliersResult,
        ] = await Promise.all([
          listFeedPurchases(),
          listBranches(),
          listFeedTypes(),
          listSuppliers(),
        ]);

        if (isMounted) {
          setFeedPurchases(purchasesResult);
          setBranches(branchesResult);
          setFeedTypes(feedTypesResult);
          setSuppliers(suppliersResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load feed purchases."
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

  const handleOpenForm = (purchase?: FeedPurchase) => {
    if (purchase) {
      setEditingId(purchase.id);
      setFormData({
        supplier: purchase.supplier || "",
        feed_type: purchase.feed_type,
        branch: purchase.branch,
        purchase_date: purchase.purchase_date,
        quantity_bags: purchase.quantity_bags,
        weight_per_bag: Number(purchase.weight_per_bag),
        unit_cost: Number(purchase.unit_cost),
        notes: purchase.notes,
      });
    } else {
      setEditingId(null);
      setFormData({
        supplier: "",
        feed_type: feedTypes[0]?.id || "",
        branch: branches[0]?.id || "",
        purchase_date: getToday(),
        quantity_bags: 0,
        weight_per_bag: 50,
        unit_cost: 0,
        notes: "",
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

  const handleSaveForm = async () => {
    if (
      !formData.feed_type ||
      !formData.branch ||
      !formData.purchase_date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.quantity_bags <= 0) {
      setFormError("Quantity of bags must be greater than zero.");
      return;
    }

    if (formData.weight_per_bag <= 0) {
      setFormError("Weight per bag must be greater than zero.");
      return;
    }

    if (formData.unit_cost < 0) {
      setFormError("Unit cost cannot be negative.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        supplier: formData.supplier || null,
        feed_type: formData.feed_type,
        branch: formData.branch,
        purchase_date: formData.purchase_date,
        quantity_bags: formData.quantity_bags,
        weight_per_bag: formData.weight_per_bag,
        unit_cost: formData.unit_cost,
        notes: formData.notes,
      };

      if (editingId) {
        const updated = await updateFeedPurchase(
          editingId,
          payload
        );
        setFeedPurchases((prev) =>
          prev.map((purchase) =>
            purchase.id === editingId ? updated : purchase
          )
        );
      } else {
        const created = await createFeedPurchase(payload);
        setFeedPurchases((prev) => [created, ...prev]);
      }

      handleCloseForm();
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(
          saveError,
          "Failed to save feed purchase."
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
      await deleteFeedPurchase(deleteTarget);
      setFeedPurchases((prev) =>
        prev.filter((purchase) => purchase.id !== deleteTarget)
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Failed to delete feed purchase."
        )
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalBags = feedPurchases.reduce(
    (sum, purchase) => sum + purchase.quantity_bags,
    0
  );
  const totalWeight = feedPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_weight),
    0
  );
  const totalSpend = feedPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_cost),
    0
  );

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Feed Purchases"
        subtitle="Track feed procurement, tonnage, and spend by branch."
        action={{
          label: "Record Feed Purchase",
          onClick: () => handleOpenForm(),
          disabled: !activeTenantId,
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          <MetricCard
            label="Feed Purchases"
            value={formatNumber(feedPurchases.length)}
          />
          <MetricCard
            label="Bags Purchased"
            value={formatNumber(totalBags)}
          />
          <MetricCard
            label="Total Weight (kg)"
            value={formatNumber(totalWeight)}
          />
          <MetricCard
            label="Total Spend"
            value={formatCurrency(
              totalSpend,
              activeTenantCurrency
            )}
          />
        </Box>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific feed purchase data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid #E5EAF2" }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>
                Purchase Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Supplier
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Branch
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Feed Type
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Bags
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Kg / Bag
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Total Weight
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
              <TableSkeletonLoader rows={5} columns={10} />
            ) : feedPurchases.length > 0 ? (
              feedPurchases.map((purchase) => (
                <TableRow key={purchase.id} hover>
                  <TableCell>
                    {formatDate(purchase.purchase_date)}
                  </TableCell>
                  <TableCell>
                    {purchase.supplier_name || "—"}
                  </TableCell>
                  <TableCell>{purchase.branch_name}</TableCell>
                  <TableCell>{purchase.feed_type_name}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(purchase.quantity_bags)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(purchase.weight_per_bag)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(purchase.total_weight)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatCurrency(
                      purchase.unit_cost,
                      activeTenantCurrency
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatCurrency(
                      purchase.total_cost,
                      activeTenantCurrency
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    title="No feed purchases yet"
                    message="Record your first feed purchase to track inventory costs and supply inflow."
                    action={{
                      label: "Record Feed Purchase",
                      onClick: () => handleOpenForm(),
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
            ? "Edit Feed Purchase"
            : "Record Feed Purchase"}
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
            label="Feed Type"
            select
            value={formData.feed_type}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                feed_type: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            {feedTypes.map((feedType) => (
              <MenuItem key={feedType.id} value={feedType.id}>
                {feedType.name}
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
            disabled={isSaving}
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
            label="Quantity (Bags)"
            type="number"
            value={formData.quantity_bags}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                quantity_bags:
                  Number.parseInt(event.target.value, 10) || 0,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="Weight per Bag (kg)"
            type="number"
            value={formData.weight_per_bag}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                weight_per_bag:
                  Number.parseFloat(event.target.value) || 0,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 0.01, step: "0.01" } }}
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
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                notes: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving}
            multiline
            rows={3}
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
        title="Delete Feed Purchase"
        message="Are you sure you want to delete this feed purchase record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
