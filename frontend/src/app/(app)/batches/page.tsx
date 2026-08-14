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
import { useEffect, useState } from "react";

import { useAuth } from "@/auth/context/AuthContext";
import { PageHeader, TableSkeletonLoader, EmptyState, ConfirmDialog, StatusChip } from "@/components/common";
import {
  BirdBatch,
  listBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  BirdType,
  BatchStatus,
} from "@/features/batches/api";
import { Branch, listBranches } from "@/features/branches/api";
import { House, listHouses } from "@/features/houses/api";
import { Breed, listBreeds } from "@/features/breeds/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const BIRD_TYPES: { value: BirdType; label: string }[] = [
  { value: "layer", label: "Layer" },
  { value: "broiler", label: "Broiler" },
  { value: "cockerel", label: "Cockerel" },
  { value: "breeder", label: "Breeder" },
  { value: "pullet", label: "Pullet" },
];

const BATCH_STATUSES: { value: BatchStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "sold", label: "Sold" },
];

export default function BatchesPage() {
  const { activeTenantId } = useAuth();
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    branch: "",
    house: "",
    breed: "",
    batch_number: "",
    bird_type: "layer" as BirdType,
    arrival_date: new Date().toISOString().split("T")[0],
    initial_quantity: 0,
    status: "active" as BatchStatus,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load all data
  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setBatches([]);
          setBranches([]);
          setHouses([]);
          setBreeds([]);
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
        const [batchesResult, branchesResult, housesResult, breedsResult] = await Promise.all([
          listBatches(),
          listBranches(),
          listHouses(),
          listBreeds(),
        ]);
        if (isMounted) {
          setBatches(batchesResult);
          setBranches(branchesResult);
          setHouses(housesResult);
          setBreeds(breedsResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(getApiErrorMessage(fetchError, "Unable to load batches."));
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

  const handleOpenForm = (batch?: BirdBatch) => {
    if (batch) {
      setEditingId(batch.id);
      setFormData({
        branch: batch.branch,
        house: batch.house || "",
        breed: batch.breed || "",
        batch_number: batch.batch_number,
        bird_type: batch.bird_type,
        arrival_date: batch.arrival_date,
        initial_quantity: batch.initial_quantity,
        status: batch.status,
      });
    } else {
      setEditingId(null);
      setFormData({
        branch: branches[0]?.id || "",
        house: "",
        breed: "",
        batch_number: "",
        bird_type: "layer",
        arrival_date: new Date().toISOString().split("T")[0],
        initial_quantity: 0,
        status: "active",
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
    if (!formData.branch || !formData.batch_number || formData.initial_quantity < 0) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingId) {
        const updated = await updateBatch(editingId, {
          branch: formData.branch,
          house: formData.house || null,
          breed: formData.breed || null,
          batch_number: formData.batch_number,
          bird_type: formData.bird_type,
          arrival_date: formData.arrival_date,
          initial_quantity: formData.initial_quantity,
          status: formData.status,
        });
        setBatches((prev) =>
          prev.map((b) => (b.id === editingId ? updated : b))
        );
      } else {
        const created = await createBatch({
          branch: formData.branch,
          house: formData.house || null,
          breed: formData.breed || null,
          batch_number: formData.batch_number,
          bird_type: formData.bird_type,
          arrival_date: formData.arrival_date,
          initial_quantity: formData.initial_quantity,
          status: formData.status,
        });
        setBatches((prev) => [...prev, created]);
      }
      handleCloseForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to save batch."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteBatch(deleteTarget);
      setBatches((prev) => prev.filter((b) => b.id !== deleteTarget));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete batch."));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredHouses = formData.branch
    ? houses.filter((h) => h.branch === formData.branch)
    : [];

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Batches"
        subtitle="Manage bird batches and track their lifecycle."
        action={{
          label: "New Batch",
          onClick: () => handleOpenForm(),
        }}
      />

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load tenant-specific batch data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Paper} sx={{ border: "1px solid #E5EAF2" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>Batch #</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>House</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Breed</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Quantity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={8} />
            ) : batches.length > 0 ? (
              batches.map((batch) => (
                <TableRow key={batch.id} hover>
                  <TableCell>{batch.batch_number}</TableCell>
                  <TableCell>{batch.branch_name}</TableCell>
                  <TableCell>{batch.house_name || "—"}</TableCell>
                  <TableCell>{batch.breed_name || "—"}</TableCell>
                  <TableCell>
                    {BIRD_TYPES.find((t) => t.value === batch.bird_type)?.label ||
                      batch.bird_type}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {batch.current_quantity} / {batch.initial_quantity}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={batch.status} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenForm(batch)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteClick(batch.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    title="No batches yet"
                    message="Create your first batch to start tracking birds."
                    action={{
                      label: "New Batch",
                      onClick: () => handleOpenForm(),
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? "Edit Batch" : "Create New Batch"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Branch"
            select
            value={formData.branch}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                branch: e.target.value,
                house: "",
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
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, house: e.target.value }))
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
            label="Batch Number"
            value={formData.batch_number}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, batch_number: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
          />
          <TextField
            label="Bird Type"
            select
            value={formData.bird_type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                bird_type: e.target.value as BirdType,
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            {BIRD_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Breed (Optional)"
            select
            value={formData.breed}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, breed: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
          >
            <MenuItem value="">None</MenuItem>
            {breeds.map((breed) => (
              <MenuItem key={breed.id} value={breed.id}>
                {breed.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Arrival Date"
            type="date"
            value={formData.arrival_date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, arrival_date: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Capacity / Initial Quantity"
            type="number"
            value={formData.initial_quantity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                initial_quantity: parseInt(e.target.value) || 0,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label="Status"
            select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as BatchStatus,
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            {BATCH_STATUSES.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </TextField>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Batch"
        message="Are you sure you want to delete this batch? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
