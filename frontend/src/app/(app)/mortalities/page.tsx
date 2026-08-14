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
import { DiseaseOutbreak, listDiseaseOutbreaks } from "@/features/diseaseOutbreaks/api";
import { Disease, listDiseases } from "@/features/diseases/api";
import { House, listHouses } from "@/features/houses/api";
import {
  MortalityCause,
  MortalityRecord,
  createMortality,
  deleteMortality,
  listMortalities,
  updateMortality,
} from "@/features/mortalities/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

const MORTALITY_CAUSES: {
  value: MortalityCause;
  label: string;
}[] = [
  { value: "disease", label: "Disease" },
  { value: "heat_stress", label: "Heat Stress" },
  { value: "accident", label: "Accident" },
  { value: "predator", label: "Predator" },
  { value: "poor_quality", label: "Poor Chick Quality" },
  { value: "unknown", label: "Unknown" },
  { value: "other", label: "Other" },
];

const getToday = () => new Date().toISOString().split("T")[0];

export default function MortalitiesPage() {
  const { activeTenantId } = useAuth();
  const [mortalities, setMortalities] = useState<MortalityRecord[]>(
    []
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [outbreaks, setOutbreaks] = useState<DiseaseOutbreak[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    branch: "",
    house: "",
    batch: "",
    disease: "",
    disease_outbreak: "",
    date: getToday(),
    quantity: 0,
    cause: "unknown" as MortalityCause,
    notes: "",
  });
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
          setMortalities([]);
          setBranches([]);
          setHouses([]);
          setBatches([]);
          setDiseases([]);
          setOutbreaks([]);
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
          mortalitiesResult,
          branchesResult,
          housesResult,
          batchesResult,
          diseasesResult,
          outbreaksResult,
        ] = await Promise.all([
          listMortalities(),
          listBranches(),
          listHouses(),
          listBatches(),
          listDiseases(),
          listDiseaseOutbreaks(),
        ]);

        if (isMounted) {
          setMortalities(mortalitiesResult);
          setBranches(branchesResult);
          setHouses(housesResult);
          setBatches(batchesResult);
          setDiseases(diseasesResult);
          setOutbreaks(outbreaksResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load mortality records."
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

  const filteredOutbreaks = useMemo(
    () =>
      formData.batch
        ? outbreaks.filter(
            (outbreak) =>
              outbreak.batch === formData.batch &&
              (!formData.disease ||
                outbreak.disease === formData.disease)
          )
        : [],
    [formData.batch, formData.disease, outbreaks]
  );

  const selectedBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === formData.batch) || null,
    [batches, formData.batch]
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

  const filteredMortalities = useMemo(
    () =>
      mortalities.filter((record) => {
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
    [filters.batch, filters.branch, filters.house, mortalities]
  );

  const selectedFilterBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === filters.batch) || null,
    [batches, filters.batch]
  );

  const handleOpenForm = (record?: MortalityRecord) => {
    if (record) {
      setEditingId(record.id);
      setFormData({
        branch: record.branch,
        house: record.house,
        batch: record.batch,
        disease: record.disease || "",
        disease_outbreak: record.disease_outbreak || "",
        date: record.date,
        quantity: record.quantity,
        cause: record.cause,
        notes: record.notes,
      });
    } else {
      setEditingId(null);
      setFormData({
        branch: branches[0]?.id || "",
        house: "",
        batch: "",
        disease: "",
        disease_outbreak: "",
        date: getToday(),
        quantity: 0,
        cause: "unknown",
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
      !formData.date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.quantity <= 0) {
      setFormError(
        "Mortality quantity must be greater than zero."
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
        disease: formData.disease || null,
        disease_outbreak: formData.disease_outbreak || null,
        date: formData.date,
        quantity: formData.quantity,
        cause: formData.cause,
        notes: formData.notes,
      };

      if (editingId) {
        const updated = await updateMortality(editingId, payload);
        setMortalities((prev) =>
          prev.map((record) =>
            record.id === editingId ? updated : record
          )
        );
      } else {
        const created = await createMortality(payload);
        setMortalities((prev) => [created, ...prev]);
      }

      const refreshedBatches = await listBatches();
      setBatches(refreshedBatches);
      handleCloseForm();
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(
          saveError,
          "Failed to save mortality record."
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
      await deleteMortality(deleteTarget);
      setMortalities((prev) =>
        prev.filter((record) => record.id !== deleteTarget)
      );
      const refreshedBatches = await listBatches();
      setBatches(refreshedBatches);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(
        getApiErrorMessage(
          deleteError,
          "Failed to delete mortality record."
        )
      );
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalDeaths = filteredMortalities.reduce(
    (sum, record) => sum + record.quantity,
    0
  );
  const diseaseLinkedRecords = filteredMortalities.filter(
    (record) => record.disease || record.disease_outbreak
  ).length;
  const affectedBatches = new Set(
    filteredMortalities.map((record) => record.batch)
  ).size;

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Mortalities"
        subtitle="Record bird deaths, relate them to outbreaks, and keep live stock balances in sync."
        action={{
          label: "Record Mortality",
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
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600 }}
                  >
                    Filters
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Narrow mortality records by branch, house, or batch.
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
                  Showing mortality records for batch{" "}
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
              label="Mortality Records"
              value={formatNumber(filteredMortalities.length)}
            />
            <MetricCard
              label="Total Deaths"
              value={formatNumber(totalDeaths)}
            />
            <MetricCard
              label="Affected Batches"
              value={formatNumber(affectedBatches)}
            />
            <MetricCard
              label="Disease-linked Records"
              value={formatNumber(diseaseLinkedRecords)}
            />
          </Box>
        </Stack>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific mortality data.
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
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>House</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Disease</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Outbreak</TableCell>
              <TableCell
                sx={{ fontWeight: 600, textAlign: "right" }}
              >
                Quantity
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Cause</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
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
            ) : filteredMortalities.length > 0 ? (
              filteredMortalities.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{record.branch_name}</TableCell>
                  <TableCell>{record.house_name}</TableCell>
                  <TableCell>{record.batch_number}</TableCell>
                  <TableCell>{record.disease_name || "—"}</TableCell>
                  <TableCell>
                    {record.outbreak_disease || "—"}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {formatNumber(record.quantity)}
                  </TableCell>
                  <TableCell>
                    {MORTALITY_CAUSES.find(
                      (cause) => cause.value === record.cause
                    )?.label || record.cause}
                  </TableCell>
                  <TableCell>{record.notes || "—"}</TableCell>
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
                        onClick={() =>
                          handleDeleteClick(record.id)
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
                    title={
                      mortalities.length > 0
                        ? "No mortality records match these filters"
                        : "No mortality records yet"
                    }
                    message={
                      mortalities.length > 0
                        ? "Adjust the filters to see more mortality records."
                        : "Record your first mortality event to track live stock reductions accurately."
                    }
                    action={{
                      label:
                        mortalities.length > 0
                          ? "Clear Filters"
                          : "Record Mortality",
                      onClick: () =>
                        mortalities.length > 0
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingId
            ? "Edit Mortality Record"
            : "Record Mortality"}
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
            label="Branch"
            select
            value={formData.branch}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                branch: event.target.value,
                house: "",
                batch: "",
                disease_outbreak: "",
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
                disease_outbreak: "",
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
                disease_outbreak: "",
              }))
            }
            fullWidth
            disabled={isSaving || !formData.house}
            helperText={
              selectedBatch
                ? `Current birds remaining: ${formatNumber(
                    selectedBatch.current_quantity
                  )}`
                : undefined
            }
          >
            {filteredBatches.map((batch) => (
              <MenuItem key={batch.id} value={batch.id}>
                {batch.batch_number}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Disease (Optional)"
            select
            value={formData.disease}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                disease: event.target.value,
                disease_outbreak: "",
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {diseases.map((disease) => (
              <MenuItem key={disease.id} value={disease.id}>
                {disease.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Disease Outbreak (Optional)"
            select
            value={formData.disease_outbreak}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                disease_outbreak: event.target.value,
              }))
            }
            fullWidth
            disabled={isSaving || !formData.batch}
          >
            <MenuItem value="">None</MenuItem>
            {filteredOutbreaks.map((outbreak) => (
              <MenuItem key={outbreak.id} value={outbreak.id}>
                {outbreak.disease_name} -{" "}
                {formatDate(outbreak.outbreak_date)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date"
            type="date"
            value={formData.date}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                date: event.target.value,
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
                quantity:
                  Number.parseInt(event.target.value, 10) || 0,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="Cause"
            select
            value={formData.cause}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                cause: event.target.value as MortalityCause,
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            {MORTALITY_CAUSES.map((cause) => (
              <MenuItem key={cause.value} value={cause.value}>
                {cause.label}
              </MenuItem>
            ))}
          </TextField>
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
        title="Delete Mortality Record"
        message="Are you sure you want to delete this mortality record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
