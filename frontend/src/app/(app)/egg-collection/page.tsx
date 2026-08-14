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
import { BirdBatch, listBatches } from "@/features/batches/api";
import { Branch, listBranches } from "@/features/branches/api";
import {
  EggProduction,
  createEggProduction,
  deleteEggProduction,
  listEggProductions,
  updateEggProduction,
} from "@/features/eggProduction/api";
import { House, listHouses } from "@/features/houses/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

const getToday = () => new Date().toISOString().split("T")[0];

const createEmptyForm = () => ({
  branch: "",
  house: "",
  batch: "",
  production_date: getToday(),
  large_eggs: 0,
  medium_eggs: 0,
  small_eggs: 0,
  pullet_eggs: 0,
  unsorted_eggs: 0,
  good_eggs: 0,
  cracked_eggs: 0,
  broken_eggs: 0,
  dirty_eggs: 0,
  double_yolk_eggs: 0,
  notes: "",
});

export default function EggCollectionPage() {
  const { activeTenantId } = useAuth();
  const [productions, setProductions] = useState<EggProduction[]>(
    []
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState({
    branch: "",
    house: "",
    batch: "",
  });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setProductions([]);
          setBranches([]);
          setHouses([]);
          setBatches([]);
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
          productionsResult,
          branchesResult,
          housesResult,
          batchesResult,
        ] = await Promise.all([
          listEggProductions(),
          listBranches(),
          listHouses(),
          listBatches(),
        ]);

        if (isMounted) {
          setProductions(productionsResult);
          setBranches(branchesResult);
          setHouses(housesResult);
          setBatches(batchesResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load egg collections."
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
        ? houses.filter((house) => house.branch === formData.branch)
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

  const filteredFilterHouses = useMemo(
    () =>
      filters.branch
        ? houses.filter((house) => house.branch === filters.branch)
        : houses,
    [filters.branch, houses]
  );

  const filteredFilterBatches = useMemo(
    () => {
      if (filters.branch && filters.house) {
        return batches.filter(
          (batch) =>
            batch.branch === filters.branch &&
            batch.house === filters.house
        );
      }

      if (filters.branch) {
        return batches.filter(
          (batch) => batch.branch === filters.branch
        );
      }

      if (filters.house) {
        return batches.filter(
          (batch) => batch.house === filters.house
        );
      }

      return batches;
    },
    [batches, filters.branch, filters.house]
  );

  const filteredProductions = useMemo(
    () =>
      productions.filter((record) => {
        if (filters.branch && record.branch !== filters.branch) {
          return false;
        }

        if (filters.house && record.house !== filters.house) {
          return false;
        }

        if (filters.batch && record.batch !== filters.batch) {
          return false;
        }

        return true;
      }),
    [filters.batch, filters.branch, filters.house, productions]
  );

  const selectedFilterBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === filters.batch) || null,
    [batches, filters.batch]
  );

  const totalCollected = useMemo(
    () =>
      filteredProductions.reduce(
        (sum, record) => sum + Number(record.total_eggs || 0),
        0
      ),
    [filteredProductions]
  );

  const collectedToday = useMemo(() => {
    const today = getToday();
    return filteredProductions
      .filter((record) => record.production_date === today)
      .reduce(
        (sum, record) => sum + Number(record.total_eggs || 0),
        0
      );
  }, [filteredProductions]);

  const handleOpenForm = (record?: EggProduction) => {
    if (record) {
      setEditingId(record.id);
      setFormData({
        branch: record.branch,
        house: record.house,
        batch: record.batch,
        production_date: record.production_date,
        large_eggs: record.large_eggs,
        medium_eggs: record.medium_eggs,
        small_eggs: record.small_eggs,
        pullet_eggs: record.pullet_eggs,
        unsorted_eggs: record.unsorted_eggs,
        good_eggs: record.good_eggs,
        cracked_eggs: record.cracked_eggs,
        broken_eggs: record.broken_eggs,
        dirty_eggs: record.dirty_eggs,
        double_yolk_eggs: record.double_yolk_eggs,
        notes: record.notes || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        ...createEmptyForm(),
        branch: branches[0]?.id || "",
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
      !formData.production_date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const rowTotal =
      formData.large_eggs +
      formData.medium_eggs +
      formData.small_eggs +
      formData.pullet_eggs +
      formData.unsorted_eggs;

    if (rowTotal <= 0) {
      setFormError(
        "At least one egg quantity must be greater than zero."
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
        production_date: formData.production_date,
        large_eggs: formData.large_eggs,
        medium_eggs: formData.medium_eggs,
        small_eggs: formData.small_eggs,
        pullet_eggs: formData.pullet_eggs,
        unsorted_eggs: formData.unsorted_eggs,
        good_eggs: formData.good_eggs,
        cracked_eggs: formData.cracked_eggs,
        broken_eggs: formData.broken_eggs,
        dirty_eggs: formData.dirty_eggs,
        double_yolk_eggs: formData.double_yolk_eggs,
        notes: formData.notes,
      };

      if (editingId) {
        const updated = await updateEggProduction(
          editingId,
          payload
        );
        setProductions((prev) =>
          prev.map((item) =>
            item.id === editingId ? updated : item
          )
        );
      } else {
        const created = await createEggProduction(payload);
        setProductions((prev) => [created, ...prev]);
      }

      handleCloseForm();
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(
          saveError,
          "Failed to save egg collection."
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
      await deleteEggProduction(deleteTarget);
      setProductions((prev) =>
        prev.filter((item) => item.id !== deleteTarget)
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Failed to delete egg collection."
        )
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Egg Collection"
        subtitle="Record daily egg collection by final inventory grade."
        action={{
          label: "Record Collection",
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
                    Narrow egg collection records by branch, house, or batch.
                  </Typography>
                </Box>
                {filters.branch || filters.house || filters.batch ? (
                  <Button
                    variant="text"
                    onClick={() =>
                      setFilters({
                        branch: "",
                        house: "",
                        batch: "",
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
                  label="Filter by Branch"
                  select
                  value={filters.branch}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      branch: event.target.value,
                      house: "",
                      batch: "",
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
                  label="Filter by House"
                  select
                  value={filters.house}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      house: event.target.value,
                      batch: "",
                    }))
                  }
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">All houses</MenuItem>
                  {filteredFilterHouses.map((house) => (
                    <MenuItem key={house.id} value={house.id}>
                      {house.name}
                    </MenuItem>
                  ))}
                </TextField>
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
                  {filteredFilterBatches.map((batch) => (
                    <MenuItem key={batch.id} value={batch.id}>
                      {batch.batch_number}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {selectedFilterBatch ? (
                <Alert severity="info" sx={{ py: 0 }}>
                  Showing egg collection records for batch{" "}
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
                lg: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            <MetricCard
              label="Collection Records"
              value={formatNumber(filteredProductions.length)}
            />
            <MetricCard
              label="Total Eggs Collected"
              value={formatNumber(totalCollected)}
            />
            <MetricCard
              label="Collected Today"
              value={formatNumber(collectedToday)}
            />
            <MetricCard
              label="Unsorted Eggs"
              value={formatNumber(
                filteredProductions.reduce(
                  (sum, record) => sum + Number(record.unsorted_eggs || 0),
                  0
                )
              )}
            />
          </Box>
        </Stack>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific egg collection data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer
        component={Paper}
        sx={{ border: "1px solid #E5EAF2", overflowX: "auto" }}
      >
        <Table sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>
                Collection Date
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>House</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                Created By
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Large
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Medium
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Small
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Pullet
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Unsorted
              </TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                Total
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={13} />
            ) : filteredProductions.length > 0 ? (
              filteredProductions.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(record.production_date)}
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
                    {record.created_by_name ||
                      record.created_by_email ||
                      "—"}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.large_eggs)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.medium_eggs)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.small_eggs)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.pullet_eggs)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.unsorted_eggs)}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.total_eggs)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {formatDate(record.created_at)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenForm(record)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteClick(record.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={13}>
                  <EmptyState
                    title={
                      productions.length > 0
                        ? "No egg collections match these filters"
                        : "No egg collections yet"
                    }
                    message={
                      productions.length > 0
                        ? "Adjust the filters to see more egg collection records."
                        : "Record your first egg collection to start tracking production."
                    }
                    action={{
                      label:
                        productions.length > 0
                          ? "Clear Filters"
                          : "Record Collection",
                      onClick: () =>
                        productions.length > 0
                          ? setFilters({
                              branch: "",
                              house: "",
                              batch: "",
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingId
            ? "Edit Egg Collection"
            : "Record Egg Collection"}
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
              label="Branch"
              select
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
              disabled={isSaving}
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="House"
              select
              value={formData.house}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  house: event.target.value,
                  batch: "",
                }))
              }
              fullWidth
              disabled={isSaving || !formData.branch}
            >
              {filteredHouses.map((house) => (
                <MenuItem key={house.id} value={house.id}>
                  {house.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Batch"
              select
              value={formData.batch}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  batch: event.target.value,
                }))
              }
              fullWidth
              disabled={isSaving || !formData.house}
            >
              {filteredBatches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Collection Date"
            type="date"
            value={formData.production_date}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                production_date: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ inputLabel: { shrink: true } }}
          />

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
              label="Large Eggs"
              type="number"
              value={formData.large_eggs}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  large_eggs:
                    Number.parseInt(event.target.value, 10) || 0,
                }))
              }
              fullWidth
              disabled={isSaving}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Medium Eggs"
              type="number"
              value={formData.medium_eggs}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  medium_eggs:
                    Number.parseInt(event.target.value, 10) || 0,
                }))
              }
              fullWidth
              disabled={isSaving}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Small Eggs"
              type="number"
              value={formData.small_eggs}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  small_eggs:
                    Number.parseInt(event.target.value, 10) || 0,
                }))
              }
              fullWidth
              disabled={isSaving}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Pullet Eggs"
              type="number"
              value={formData.pullet_eggs}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  pullet_eggs:
                    Number.parseInt(event.target.value, 10) || 0,
                }))
              }
              fullWidth
              disabled={isSaving}
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Unsorted Eggs"
              type="number"
              value={formData.unsorted_eggs}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  unsorted_eggs:
                    Number.parseInt(event.target.value, 10) || 0,
                }))
              }
              fullWidth
              disabled={isSaving}
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Box>

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
        title="Delete Egg Collection"
        message="Are you sure you want to delete this egg collection record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
