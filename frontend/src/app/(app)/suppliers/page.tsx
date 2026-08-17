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

import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  TableSkeletonLoader,
} from "@/components/common";
import {
  Supplier,
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from "@/features/suppliers/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/formatters";

interface FormState {
  name: string;
  phone: string;
}

const emptyForm = (): FormState => ({ name: "", phone: "" });

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuppliers(await listSuppliers());
    } catch (e) {
      setError(getApiErrorMessage(e, "An unexpected error occurred."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialSuppliers = async () => {
      try {
        setError(null);
        const data = await listSuppliers();
        if (isMounted) {
          setSuppliers(data);
        }
      } catch (e) {
        if (isMounted) {
          setError(getApiErrorMessage(e, "An unexpected error occurred."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialSuppliers();

    return () => {
      isMounted = false;
    };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setOpenForm(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({ name: supplier.name, phone: supplier.phone || "" });
    setFormError(null);
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingId) {
        await updateSupplier(editingId, form);
      } else {
        await createSupplier(form);
      }

      setOpenForm(false);
      await load();
    } catch (e) {
      setFormError(getApiErrorMessage(e, "An unexpected error occurred."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      await deleteSupplier(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e, "An unexpected error occurred."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Suppliers"
        subtitle="Manage supplier records for feed, chicks, and farming inputs."
        action={{ label: "Add Supplier", onClick: openCreate }}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader columns={4} rows={5} />
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState
                    title="No suppliers yet"
                    message="Add your first supplier to start tracking purchases."
                  />
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id} hover>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.phone || "—"}</TableCell>
                  <TableCell>{formatDate(supplier.created_at)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" onClick={() => openEdit(supplier)}>
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => setDeleteId(supplier.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Supplier Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            {formError ? (
              <Alert severity="error">{formError}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create Supplier"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete supplier"
        message="This action cannot be undone. Continue?"
        confirmText="Delete"
        isLoading={isDeleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}
