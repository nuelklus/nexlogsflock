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
import { House, listHouses, createHouse, updateHouse, deleteHouse, HouseType } from "@/features/houses/api";
import { Branch, listBranches } from "@/features/branches/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const HOUSE_TYPES: { value: HouseType; label: string }[] = [
  { value: "deep_litter", label: "Deep Litter" },
  { value: "cage", label: "Cage" },
];

export default function HousesPage() {
  const { activeTenantId } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    branch: "",
    name: "",
    house_type: "deep_litter" as HouseType,
    capacity: 0,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load houses and branches
  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setHouses([]);
          setBranches([]);
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
        const [housesResult, branchesResult] = await Promise.all([
          listHouses(),
          listBranches(),
        ]);
        if (isMounted) {
          setHouses(housesResult);
          setBranches(branchesResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(getApiErrorMessage(fetchError, "Unable to load houses."));
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

  const handleOpenForm = (house?: House) => {
    if (house) {
      setEditingId(house.id);
      setFormData({
        branch: house.branch,
        name: house.name,
        house_type: house.house_type,
        capacity: house.capacity,
      });
    } else {
      setEditingId(null);
      setFormData({
        branch: branches[0]?.id || "",
        name: "",
        house_type: "deep_litter",
        capacity: 0,
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
    if (!formData.branch || !formData.name || formData.capacity < 0) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingId) {
        const updated = await updateHouse(editingId, {
          branch: formData.branch,
          name: formData.name,
          house_type: formData.house_type,
          capacity: formData.capacity,
        });
        setHouses((prev) =>
          prev.map((h) => (h.id === editingId ? updated : h))
        );
      } else {
        const created = await createHouse({
          branch: formData.branch,
          name: formData.name,
          house_type: formData.house_type,
          capacity: formData.capacity,
        });
        setHouses((prev) => [...prev, created]);
      }
      handleCloseForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to save house."));
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
      await deleteHouse(deleteTarget);
      setHouses((prev) => prev.filter((h) => h.id !== deleteTarget));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete house."));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Houses"
        subtitle="Manage poultry houses within your branches."
        action={{
          label: "New House",
          onClick: () => handleOpenForm(),
        }}
      />

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load tenant-specific house data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Paper} sx={{ border: "1px solid #E5EAF2" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Capacity</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={5} />
            ) : houses.length > 0 ? (
              houses.map((house) => (
                <TableRow key={house.id} hover>
                  <TableCell>{house.name}</TableCell>
                  <TableCell>{house.branch_name}</TableCell>
                  <TableCell>
                    {HOUSE_TYPES.find((t) => t.value === house.house_type)?.label ||
                      house.house_type}
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>{house.capacity}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenForm(house)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteClick(house.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="No houses yet"
                    message="Create your first house to get started."
                    action={{
                      label: "New House",
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
          {editingId ? "Edit House" : "Create New House"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Branch"
            select
            value={formData.branch}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, branch: e.target.value }))
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
            label="House Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
          />
          <TextField
            label="House Type"
            select
            value={formData.house_type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                house_type: e.target.value as HouseType,
              }))
            }
            fullWidth
            disabled={isSaving}
          >
            {HOUSE_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                capacity: parseInt(e.target.value) || 0,
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
        title="Delete House"
        message="Are you sure you want to delete this house? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
