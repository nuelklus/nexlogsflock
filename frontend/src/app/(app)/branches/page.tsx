"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { Branch, listBranches, createBranch, updateBranch, deleteBranch } from "@/features/branches/api";
import { PageHeader, TableSkeletonLoader, EmptyState, ConfirmDialog } from "@/components/common";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function BranchesPage() {
  const { activeTenantId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", location: "" });
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
        const result = await listBranches();
        console.log("Fetched branches:", result);
        if (isMounted) {
          setBranches(result);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(getApiErrorMessage(fetchError, "Unable to load branches."));
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

  const handleOpenForm = (branch?: Branch) => {
    if (branch) {
      setEditingId(branch.id);
      setFormData({ name: branch.name, location: branch.location });
    } else {
      setEditingId(null);
      setFormData({ name: "", location: "" });
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
      setFormError("Branch name is required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingId) {
        const updated = await updateBranch(editingId, {
          name: formData.name,
          location: formData.location,
        });
        setBranches((prev) =>
          prev.map((b) => (b.id === editingId ? updated : b))
        );
      } else {
        const created = await createBranch({
          name: formData.name,
          location: formData.location,
        });
        setBranches((prev) => [...prev, created]);
      }
      handleCloseForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to save branch."));
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
      await deleteBranch(deleteTarget);
      setBranches((prev) => prev.filter((b) => b.id !== deleteTarget));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete branch."));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Branches"
        subtitle="Manage farm branches for the selected organization."
        action={{
          label: "New Branch",
          onClick: () => handleOpenForm(),
        }}
      />

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load tenant-specific branch data.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Paper} sx={{ border: "1px solid #E5EAF2" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader rows={5} columns={4} />
            ) : branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow key={branch.id} hover>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.location || "—"}</TableCell>
                  <TableCell>{new Date(branch.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleOpenForm(branch)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={() => handleDeleteClick(branch.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState
                    title="No branches yet"
                    message="Create your first branch to get started."
                    action={{
                      label: "New Branch",
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
          {editingId ? "Edit Branch" : "Create New Branch"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Branch Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
            autoFocus
          />
          <TextField
            label="Location"
            value={formData.location}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
            fullWidth
            disabled={isSaving}
            multiline
            rows={2}
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
        title="Delete Branch"
        message="Are you sure you want to delete this branch? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Stack>
  );
}
