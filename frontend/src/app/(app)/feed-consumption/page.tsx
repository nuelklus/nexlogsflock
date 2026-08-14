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
import { BirdBatch, listBatches } from "@/features/batches/api";
import { Branch, listBranches } from "@/features/branches/api";
import {
  FeedInventory,
  listFeedInventory,
} from "@/features/feedInventory/api";
import {
  FeedConsumption,
  createFeedConsumption,
  deleteFeedConsumption,
  listFeedConsumptions,
  updateFeedConsumption,
} from "@/features/feedConsumption/api";
import { FeedType, listFeedTypes } from "@/features/feedTypes/api";
import { House, listHouses } from "@/features/houses/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

const getToday = () => new Date().toISOString().split("T")[0];

export default function FeedConsumptionPage() {
  const { activeTenantId } = useAuth();
  const [consumptions, setConsumptions] = useState<
    FeedConsumption[]
  >([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [feedTypes, setFeedTypes] = useState<FeedType[]>(
    []
  );
  const [inventory, setInventory] = useState<
    FeedInventory[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    branch: "",
    house: "",
    batch: "",
    feed_type: "",
    consumption_date: getToday(),
    quantity: 0,
    unit: "kg",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setConsumptions([]);
          setBranches([]);
          setHouses([]);
          setBatches([]);
          setFeedTypes([]);
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
        const [
          consumptionsResult,
          branchesResult,
          housesResult,
          batchesResult,
          feedTypesResult,
          inventoryResult,
        ] = await Promise.all([
          listFeedConsumptions(),
          listBranches(),
          listHouses(),
          listBatches(),
          listFeedTypes(),
          listFeedInventory(),
        ]);

        if (isMounted) {
          setConsumptions(consumptionsResult);
          setBranches(branchesResult);
          setHouses(housesResult);
          setBatches(batchesResult);
          setFeedTypes(feedTypesResult);
          setInventory(inventoryResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load feed consumption records."
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

  const filteredHouses = useMemo(
    () =>
      formData.branch
        ? houses.filter(
            (house) => house.branch === formData.branch
          )
        : [],
    [formData.branch, houses]
  );

  const filteredBatches = useMemo(
    () =>
      formData.branch && formData.house
        ? batches.filter(
            (batch) =>
              batch.branch === formData.branch &&
              batch.house === formData.house
          )
        : [],
    [batches, formData.branch, formData.house]
  );

  const selectedInventory = useMemo(
    () =>
      inventory.find(
        (item) =>
          item.branch === formData.branch &&
          item.feed_type === formData.feed_type
      ) || null,
    [formData.branch, formData.feed_type, inventory]
  );

  const selectedInventoryAvailable = useMemo(
    () => Number(selectedInventory?.available_quantity || 0),
    [selectedInventory]
  );

  const selectedConsumptionRecord = useMemo(
    () =>
      editingId
        ? consumptions.find(
            (item) => item.id === editingId
          ) || null
        : null,
    [consumptions, editingId]
  );

  const effectiveAvailableStock = useMemo(() => {
    if (!selectedInventory) {
      return 0;
    }

    if (
      !selectedConsumptionRecord ||
      selectedConsumptionRecord.branch !== formData.branch ||
      selectedConsumptionRecord.feed_type !==
        formData.feed_type
    ) {
      return selectedInventoryAvailable;
    }

    return (
      selectedInventoryAvailable +
      Number(selectedConsumptionRecord.quantity || 0)
    );
  }, [
    formData.branch,
    formData.feed_type,
    selectedConsumptionRecord,
    selectedInventory,
    selectedInventoryAvailable,
  ]);

  const handleOpenForm = (record?: FeedConsumption) => {
    if (record) {
      setEditingId(record.id);
      setFormData({
        branch: record.branch,
        house: record.house,
        batch: record.batch,
        feed_type: record.feed_type,
        consumption_date: record.consumption_date,
        quantity: Number(record.quantity),
        unit: record.unit,
        notes: record.notes,
      });
    } else {
      setEditingId(null);
      setFormData({
        branch: branches[0]?.id || "",
        house: "",
        batch: "",
        feed_type: feedTypes[0]?.id || "",
        consumption_date: getToday(),
        quantity: 0,
        unit: "kg",
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
      !formData.branch ||
      !formData.house ||
      !formData.batch ||
      !formData.feed_type ||
      !formData.consumption_date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.quantity <= 0) {
      setFormError(
        "Feed consumption quantity must be greater than zero."
      );
      return;
    }

    if (formData.quantity > effectiveAvailableStock) {
      setFormError(
        `Insufficient feed stock. Available: ${formatNumber(effectiveAvailableStock)} kg.`
      );
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        branch: formData.branch,
        house: formData.house,
        batch: formData.batch,
        feed_type: formData.feed_type,
        consumption_date: formData.consumption_date,
        quantity: formData.quantity,
        unit: formData.unit,
        notes: formData.notes,
      };

      if (editingId) {
        const updated = await updateFeedConsumption(
          editingId,
          payload
        );
        setConsumptions((prev) =>
          prev.map((record) =>
            record.id === editingId ? updated : record
          )
        );
      } else {
        const created = await createFeedConsumption(
          payload
        );
        setConsumptions((prev) => [created, ...prev]);
      }

      handleCloseForm();
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(
          saveError,
          "Failed to save feed consumption."
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
      await deleteFeedConsumption(deleteTarget);
      setConsumptions((prev) =>
        prev.filter((record) => record.id !== deleteTarget)
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Failed to delete feed consumption."
        )
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalFeedConsumed = useMemo(
    () =>
      consumptions.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
    [consumptions]
  );

  const consumedToday = useMemo(() => {
    const today = getToday();

    return consumptions
      .filter(
        (item) => item.consumption_date === today
      )
      .reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
  }, [consumptions]);

  const activeBatchesFed = useMemo(
    () =>
      new Set(consumptions.map((item) => item.batch)).size,
    [consumptions]
  );

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Feed Consumption"
        subtitle="Record where feed was consumed and which batch used it."
        action={{
          label: "Record Feed Consumption",
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
            label="Consumption Records"
            value={formatNumber(consumptions.length)}
          />
          <MetricCard
            label="Feed Consumed (kg)"
            value={formatNumber(totalFeedConsumed)}
          />
          <MetricCard
            label="Consumed Today (kg)"
            value={formatNumber(consumedToday)}
          />
          <MetricCard
            label="Batches Fed"
            value={formatNumber(activeBatchesFed)}
          />
        </Box>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific feed consumption data.
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
              <TableCell sx={{ fontWeight: 600 }}>
                Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Branch
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                House
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Batch
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Feed Type
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Quantity
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Unit
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Notes
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Recorded By
              </TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={10} />
            ) : consumptions.length > 0 ? (
              consumptions.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(record.consumption_date)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {record.branch_name}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {record.house_name}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {record.batch_number}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {record.feed_type_name}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.quantity)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {record.unit}
                  </TableCell>
                  <TableCell>{record.notes || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {record.created_by_name || "—"}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Stack
                      sx={{
                        flexDirection: "row",
                        gap: 1,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleOpenForm(record)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() =>
                          handleDeleteClick(record.id)
                        }
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    title="No feed consumption recorded"
                    message="Record feed usage by branch, house, and bird batch to track stock depletion accurately."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openForm}
        onClose={isSaving ? undefined : handleCloseForm}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingId
            ? "Edit Feed Consumption"
            : "Record Feed Consumption"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack sx={{ gap: 2, mt: 1 }}>
            {formError ? (
              <Alert severity="error">{formError}</Alert>
            ) : null}

            <TextField
              select
              label="Branch"
              value={formData.branch}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  branch: event.target.value,
                  house: "",
                  batch: "",
                }))
              }
              fullWidth
              required
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="House"
              value={formData.house}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  house: event.target.value,
                  batch: "",
                }))
              }
              fullWidth
              required
              disabled={!formData.branch}
            >
              {filteredHouses.map((house) => (
                <MenuItem key={house.id} value={house.id}>
                  {house.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Bird Batch"
              value={formData.batch}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  batch: event.target.value,
                }))
              }
              fullWidth
              required
              disabled={!formData.house}
            >
              {filteredBatches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Feed Type"
              value={formData.feed_type}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  feed_type: event.target.value,
                }))
              }
              fullWidth
              required
            >
              {feedTypes.map((feedType) => (
                <MenuItem
                  key={feedType.id}
                  value={feedType.id}
                >
                  {feedType.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              label="Consumption Date"
              value={formData.consumption_date}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  consumption_date: event.target.value,
                }))
              }
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              type="number"
              label="Quantity (kg)"
              value={formData.quantity}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  quantity: Number(event.target.value),
                }))
              }
              fullWidth
              required
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              helperText={`Available for this transaction: ${formatNumber(effectiveAvailableStock)} kg`}
            />

            {selectedInventory ? (
              <Alert
                severity={
                  formData.quantity > effectiveAvailableStock
                    ? "error"
                    : "info"
                }
              >
                {formData.quantity > effectiveAvailableStock
                  ? `Insufficient stock. Available for this transaction: ${formatNumber(effectiveAvailableStock)} kg.`
                  : `Available stock for this transaction: ${formatNumber(effectiveAvailableStock)} kg.`}
              </Alert>
            ) : formData.branch && formData.feed_type ? (
              <Alert severity="warning">
                No feed inventory record found for the selected branch and feed type.
              </Alert>
            ) : null}

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
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCloseForm}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveForm}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete feed consumption?"
        message="This will reverse the inventory effect of the selected feed consumption record."
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        isLoading={isDeleting}
        onCancel={() => {
          if (isDeleting) {
            return;
          }
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </Stack>
  );
}
