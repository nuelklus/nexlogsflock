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
import { PageHeader, TableSkeletonLoader, EmptyState, ConfirmDialog } from "@/components/common";
import { Breed, listBreeds, createBreed, updateBreed, deleteBreed, BirdType } from "@/features/breeds/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const BIRD_TYPES: { value: BirdType; label: string }[] = [
  { value: "layer", label: "Layer" },
  { value: "broiler", label: "Broiler" },
];

export default function BreedsPage() {
  const { activeTenantId } = useAuth();
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bird_type: "layer" as BirdType,
    market_age_days: 42,
    laying_start_days: undefined as number | undefined,
    retirement_days: undefined as number | undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
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
        const result = await listBreeds();
        if (isMounted) {
          setBreeds(result);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(getApiErrorMessage(fetchError, "Unable to load breeds."));
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

  const handleOpenForm = (breed?: Breed) => {
    if (breed) {
      setEditingId(breed.id);
      setFormData({
        name: breed.name,
        bird_type: breed.bird_type,
        market_age_days: breed.market_age_days,
        laying_start_days: breed.laying_start_days ?? undefined,
        retirement_days: breed.retirement_days ?? undefined,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        bird_type: "layer",
        market_age_days: 42,
        laying_start_days: undefined,
        retirement_days: undefined,
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
    if (!formData.name) {
      setFormError("Breed name is required.");
      return;
    }

    if (formData.bird_type === "layer" && !formData.laying_start_days) {
      setFormError("Laying start days is required for layer breeds.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name,
        bird_type: formData.bird_type,
        market_age_days: formData.market_age_days,
        laying_start_days: formData.laying_start_days || null,
        retirement_days: formData.retirement_days || null,
      };

      if (editingId) {
        const updated = await updateBreed(editingId, payload);
        setBreeds((prev) =>
          prev.map((b) => (b.id === editingId ? updated : b))
        );
      } else {
        const created = await createBreed(payload);
        setBreeds((prev) => [...prev, created]);
      }
      handleCloseForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to save breed."));
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
      await deleteBreed(deleteTarget);
      setBreeds((prev) => prev.filter((b) => b.id !== deleteTarget));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete breed."));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Breeds"
        subtitle="Manage poultry breeds and their characteristics."
        action={{
          label: "New Breed",
          onClick: () => handleOpenForm(),
        }}
      />

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load tenant-specific breed data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Paper} sx={{ border: "1px solid #E5EAF2" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Market Age (days)</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Laying Start (days)</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Retirement (days)</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={6} />
            ) : breeds.length > 0 ? (
              breeds.map((breed) => (
                <TableRow key={breed.id} hover>
                  <TableCell>{breed.name}</TableCell>
                  <TableCell>
                    {BIRD_TYPES.find((t) => t.value === breed.bird_type)?.label ||
                      breed.bird_type}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{breed.market_age_days}</TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {breed.laying_start_days ?? "—"}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {breed.retirement_days ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenForm(breed)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteClick(breed.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="No breeds yet"
                    message="Create your first breed to get started."
                    action={{
                      label: "New Breed",
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
          {editingId ? "Edit Breed" : "Create New Breed"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Breed Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
            autoFocus
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
            label="Market Age (days)"
            type="number"
            value={formData.market_age_days}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                market_age_days: parseInt(e.target.value) || 42,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          {formData.bird_type === "layer" && (
            <TextField
              label="Laying Start (days)"
              type="number"
              value={formData.laying_start_days ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  laying_start_days: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              fullWidth
              disabled={isSaving}
              slotProps={{ htmlInput: { min: 0 } }}
              helperText="Required for layer breeds"
            />
          )}
          <TextField
            label="Retirement (days)"
            type="number"
            value={formData.retirement_days ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                retirement_days: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            fullWidth
            disabled={isSaving}
            slotProps={{ htmlInput: { min: 0 } }}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Breed"
        message="Are you sure you want to delete this breed? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
