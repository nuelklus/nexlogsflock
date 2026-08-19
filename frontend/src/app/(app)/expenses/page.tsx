"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import {
  Expense,
  ExpenseCategory,
  createExpense,
  listExpenseCategories,
  listExpenses,
} from "@/features/expenses/api";
import { House, listHouses } from "@/features/houses/api";
import { PAYMENT_METHODS } from "@/features/payments/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { axiosInstance } from "@/utils/axiosInstance";

const getToday = () => new Date().toISOString().split("T")[0];

interface ExpenseFormState {
  category: string;
  branch: string;
  house: string;
  batch: string;
  description: string;
  amount: string;
  expense_date: string;
  vendor_name: string;
  payment_method: string;
  reference: string;
  notes: string;
}

interface ExpenseFilterState {
  branch_id: string;
  house_id: string;
  batch_id: string;
  category_id: string;
  payment_method: string;
  date_from: string;
  date_to: string;
  amount: string;
  created_by: string;
}

const emptyForm = (): ExpenseFormState => ({
  category: "",
  branch: "",
  house: "",
  batch: "",
  description: "",
  amount: "",
  expense_date: getToday(),
  vendor_name: "",
  payment_method: "",
  reference: "",
  notes: "",
});

const emptyFilters = (): ExpenseFilterState => ({
  branch_id: "",
  house_id: "",
  batch_id: "",
  category_id: "",
  payment_method: "",
  date_from: "",
  date_to: "",
  amount: "",
  created_by: "",
});

export default function ExpensesPage() {
  const { activeTenantId, tenants } = useAuth();
  const activeTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === activeTenantId) ?? null,
    [activeTenantId, tenants]
  );
  const activeTenantPermissions = activeTenant?.permissions ?? [];
  const hasPermission = (module: string, action: string) =>
    activeTenantPermissions.some(
      (entry) => entry === `${module}.${action}` || entry === `${module}.all`
    );
  const canCreateExpenses = hasPermission("finance", "create");
  const canDeleteExpenses = hasPermission("finance", "delete");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [filters, setFilters] = useState<ExpenseFilterState>(emptyFilters());
  const [houseLoading, setHouseLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm());
  const [formHouses, setFormHouses] = useState<House[]>([]);
  const [formBatches, setFormBatches] = useState<BirdBatch[]>([]);
  const [formHouseLoading, setFormHouseLoading] = useState(false);
  const [formBatchLoading, setFormBatchLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeTenantCurrency = useMemo(
    () =>
      tenants.find((tenant) => tenant.id === activeTenantId)?.currency || "USD",
    [activeTenantId, tenants]
  );

  const currentMonth = useMemo(() => getToday().slice(0, 7), []);

  const totalThisMonth = useMemo(
    () =>
      expenses
        .filter((item) => item.expense_date.startsWith(currentMonth))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [currentMonth, expenses]
  );

  const totalSpent = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );

  const categoryCount = useMemo(
    () => new Set(expenses.map((item) => item.category_name || item.category)).size,
    [expenses]
  );

  const largestExpense = useMemo(
    () =>
      expenses.reduce<Expense | null>((largest, item) => {
        if (!largest) return item;
        return Number(item.amount || 0) > Number(largest.amount || 0) ? item : largest;
      }, null),
    [expenses]
  );

  const createdByOptions = useMemo(() => {
    const seen = new Map<string, string>();
    expenses.forEach((expense) => {
      if (!expense.created_by) return;
      const label = expense.created_by_name || expense.created_by_email || "User";
      if (!seen.has(expense.created_by)) {
        seen.set(expense.created_by, label);
      }
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [expenses]);

  const getFilterPayload = (nextFilters: ExpenseFilterState) => ({
    category_id: nextFilters.category_id || undefined,
    branch_id: nextFilters.branch_id || undefined,
    house_id: nextFilters.house_id || undefined,
    batch_id: nextFilters.batch_id || undefined,
    payment_method: nextFilters.payment_method || undefined,
    date_from: nextFilters.date_from || undefined,
    date_to: nextFilters.date_to || undefined,
    amount: nextFilters.amount || undefined,
    created_by: nextFilters.created_by || undefined,
  });

  const loadExpenses = async (nextFilters: ExpenseFilterState = filters) => {
    if (!activeTenantId) {
      setExpenses([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const [expensesResult, categoriesResult, branchesResult] = await Promise.all([
        listExpenses(getFilterPayload(nextFilters)),
        listExpenseCategories(),
        listBranches(),
      ]);
      setExpenses(expensesResult);
      setCategories(categoriesResult);
      setBranches(branchesResult);
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to load expenses."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setExpenses([]);
          setCategories([]);
          setBranches([]);
          setHouses([]);
          setBatches([]);
          setFilters(emptyFilters());
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const [expensesResult, categoriesResult, branchesResult] = await Promise.all([
          listExpenses(getFilterPayload(filters)),
          listExpenseCategories(),
          listBranches(),
        ]);

        if (isMounted) {
          setExpenses(expensesResult);
          setCategories(categoriesResult);
          setBranches(branchesResult);
        }
      } catch (e) {
        if (isMounted) {
          setError(getApiErrorMessage(e, "Unable to load expenses."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  useEffect(() => {
    if (!activeTenantId) {
      setHouses([]);
      setBatches([]);
      return;
    }

    if (!filters.branch_id) {
      setHouses([]);
      setFilters((prev) => ({ ...prev, house_id: "", batch_id: "" }));
      return;
    }

    let isMounted = true;
    setHouseLoading(true);

    listHouses({ branch_id: filters.branch_id })
      .then((result) => {
        if (isMounted) {
          setHouses(result);
          if (filters.house_id && !result.some((house) => house.id === filters.house_id)) {
            setFilters((prev) => ({ ...prev, house_id: "", batch_id: "" }));
          }
        }
      })
      .catch(() => {
        if (isMounted) setHouses([]);
      })
      .finally(() => {
        if (isMounted) setHouseLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTenantId, filters.branch_id]);

  useEffect(() => {
    if (!activeTenantId) {
      setBatches([]);
      return;
    }

    if (!filters.house_id) {
      setBatches([]);
      return;
    }

    let isMounted = true;
    setBatchLoading(true);

    listBatches({ house_id: filters.house_id })
      .then((result) => {
        if (isMounted) {
          setBatches(result);
          if (filters.batch_id && !result.some((batch) => batch.id === filters.batch_id)) {
            setFilters((prev) => ({ ...prev, batch_id: "" }));
          }
        }
      })
      .catch(() => {
        if (isMounted) setBatches([]);
      })
      .finally(() => {
        if (isMounted) setBatchLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTenantId, filters.house_id]);

  useEffect(() => {
    if (!activeTenantId) {
      setFormHouses([]);
      setFormBatches([]);
      return;
    }

    if (!form.branch) {
      setFormHouses([]);
      setFormBatches([]);
      setForm((prev) => ({ ...prev, house: "", batch: "" }));
      return;
    }

    let isMounted = true;
    setFormHouseLoading(true);

    listHouses({ branch_id: form.branch })
      .then((result) => {
        if (!isMounted) return;
        setFormHouses(result);
        if (form.house && !result.some((house) => house.id === form.house)) {
          setForm((prev) => ({ ...prev, house: "", batch: "" }));
        }
      })
      .catch(() => {
        if (isMounted) setFormHouses([]);
      })
      .finally(() => {
        if (isMounted) setFormHouseLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTenantId, form.branch]);

  useEffect(() => {
    if (!activeTenantId) {
      setFormBatches([]);
      return;
    }

    if (!form.house) {
      setFormBatches([]);
      setForm((prev) => ({ ...prev, batch: "" }));
      return;
    }

    let isMounted = true;
    setFormBatchLoading(true);

    listBatches({ house_id: form.house })
      .then((result) => {
        if (!isMounted) return;
        setFormBatches(result);
        if (form.batch && !result.some((batch) => batch.id === form.batch)) {
          setForm((prev) => ({ ...prev, batch: "" }));
        }
      })
      .catch(() => {
        if (isMounted) setFormBatches([]);
      })
      .finally(() => {
        if (isMounted) setFormBatchLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTenantId, form.house]);

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      category: categories[0]?.id || "",
      branch: branches[0]?.id || "",
      house: "",
      batch: "",
    });
    setFormError(null);
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!form.category) {
      setFormError("Please select an expense category.");
      return;
    }

    if (!form.description.trim()) {
      setFormError("Please enter an expense description.");
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be a positive number.");
      return;
    }

    if (!form.expense_date) {
      setFormError("Please select the expense date.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      await createExpense({
        category: form.category,
        branch: form.branch || null,
        house: form.house || null,
        batch: form.batch || null,
        description: form.description.trim(),
        amount,
        expense_date: form.expense_date,
        vendor_name: form.vendor_name.trim() || undefined,
        payment_method: form.payment_method.trim() || undefined,
        reference: form.reference.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setOpenForm(false);
      setForm(emptyForm());
      await loadExpenses(filters);
    } catch (e) {
      setFormError(getApiErrorMessage(e, "The expense could not be created."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setIsDeleting(true);
      setError(null);
      await axiosInstance.delete(`/api/expenses/${deleteId}/`);
      setDeleteId(null);
      await loadExpenses(filters);
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to delete the expense."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyFilters = async () => {
    await loadExpenses(filters);
  };

  const handleClearFilters = async () => {
    const resetFilters = emptyFilters();
    setFilters(resetFilters);
    setHouses([]);
    setBatches([]);
    await loadExpenses(resetFilters);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <Box>
      <PageHeader
        title="Expenses"
        subtitle="Track farm operating costs, vendor payments, and recurring cost categories."
        action={canCreateExpenses ? { label: "Add Expense", onClick: openCreate } : undefined}
      />

      {!activeTenantId ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a tenant to view expense records.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
          <MetricCard
            label="This month"
            value={formatCurrency(totalThisMonth, activeTenantCurrency)}
            helperText={`${expenses.filter((item) => item.expense_date.startsWith(currentMonth)).length} entries`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
          <MetricCard
            label="Total spent"
            value={formatCurrency(totalSpent, activeTenantCurrency)}
            helperText="Across all records"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
          <MetricCard
            label="Categories"
            value={formatNumber(categoryCount)}
            helperText="Active expense groups"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
          <MetricCard
            label="Largest expense"
            value={largestExpense ? formatCurrency(largestExpense.amount, activeTenantCurrency) : "—"}
            helperText={largestExpense ? largestExpense.description : "No data yet"}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Filters
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Branch"
              value={filters.branch_id}
              onChange={(event) => setFilters((prev) => ({ ...prev, branch_id: event.target.value, house_id: "", batch_id: "" }))}
            >
              <MenuItem value="">All branches</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="House"
              value={filters.house_id}
              disabled={!filters.branch_id || houseLoading}
              onChange={(event) => setFilters((prev) => ({ ...prev, house_id: event.target.value, batch_id: "" }))}
            >
              <MenuItem value="">All houses</MenuItem>
              {houses.map((house) => (
                <MenuItem key={house.id} value={house.id}>
                  {house.name}
                </MenuItem>
              ))}
              {houseLoading ? <MenuItem value="" disabled>Loading houses...</MenuItem> : null}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Bird Batch"
              value={filters.batch_id}
              disabled={!filters.house_id || batchLoading}
              onChange={(event) => setFilters((prev) => ({ ...prev, batch_id: event.target.value }))}
            >
              <MenuItem value="">All batches</MenuItem>
              {batches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </MenuItem>
              ))}
              {batchLoading ? <MenuItem value="" disabled>Loading batches...</MenuItem> : null}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Category"
              value={filters.category_id}
              onChange={(event) => setFilters((prev) => ({ ...prev, category_id: event.target.value }))}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Payment Method"
              value={filters.payment_method}
              onChange={(event) => setFilters((prev) => ({ ...prev, payment_method: event.target.value }))}
            >
              <MenuItem value="">All payment methods</MenuItem>
              {PAYMENT_METHODS.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              fullWidth
              size="small"
              label="Date From"
              type="date"
              value={filters.date_from}
              onChange={(event) => setFilters((prev) => ({ ...prev, date_from: event.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              fullWidth
              size="small"
              label="Date To"
              type="date"
              value={filters.date_to}
              onChange={(event) => setFilters((prev) => ({ ...prev, date_to: event.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              fullWidth
              size="small"
              label="Amount"
              type="number"
              value={filters.amount}
              onChange={(event) => setFilters((prev) => ({ ...prev, amount: event.target.value }))}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }} sx={{ width: "100%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Created By"
              value={filters.created_by}
              onChange={(event) => setFilters((prev) => ({ ...prev, created_by: event.target.value }))}
            >
              <MenuItem value="">Anyone</MenuItem>
              {createdByOptions.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "flex-end", mt: 2 }}>
          <Button variant="outlined" onClick={handleClearFilters}>
            Clear Filters
          </Button>
          <Button variant="contained" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>House</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">{canDeleteExpenses ? "Actions" : ""}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader columns={10} rows={5} />
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <EmptyState
                    title={hasActiveFilters ? "No expenses found for the selected filters." : "No expenses recorded"}
                    message={
                      hasActiveFilters
                        ? "Try clearing the filters or adjusting the selected criteria."
                        : "Add your first expense to start tracking farm costs."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>{expense.description || "—"}</TableCell>
                  <TableCell>{expense.category_name || expense.category || "—"}</TableCell>
                  <TableCell>{expense.vendor_name || "—"}</TableCell>
                  <TableCell>{expense.payment_method_label || expense.payment_method || "—"}</TableCell>
                  <TableCell>{expense.branch_name || "—"}</TableCell>
                  <TableCell>{expense.house_name || "—"}</TableCell>
                  <TableCell>{expense.batch_name || "—"}</TableCell>
                  <TableCell align="right">{formatCurrency(expense.amount, activeTenantCurrency)}</TableCell>
                  <TableCell align="right">
                    {canDeleteExpenses ? (
                      <Button size="small" color="error" onClick={() => setDeleteId(expense.id)}>
                        Delete
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Category"
              select
              size="small"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Description"
              size="small"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Amount"
                type="number"
                size="small"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
              />
              <TextField
                label="Expense Date"
                type="date"
                size="small"
                value={form.expense_date}
                onChange={(event) => setForm((prev) => ({ ...prev, expense_date: event.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Vendor"
                size="small"
                value={form.vendor_name}
                onChange={(event) => setForm((prev) => ({ ...prev, vendor_name: event.target.value }))}
              />
              <TextField
                select
                label="Payment Method"
                size="small"
                value={form.payment_method}
                onChange={(event) => setForm((prev) => ({ ...prev, payment_method: event.target.value }))}
              >
                <MenuItem value="">Select method</MenuItem>
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Branch"
              select
              size="small"
              value={form.branch}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  branch: event.target.value,
                  house: "",
                  batch: "",
                }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="House"
                select
                size="small"
                value={form.house}
                disabled={!form.branch || formHouseLoading}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    house: event.target.value,
                    batch: "",
                  }))
                }
              >
                <MenuItem value="">None</MenuItem>
                {formHouses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.name}
                  </MenuItem>
                ))}
                {formHouseLoading ? <MenuItem value="" disabled>Loading houses...</MenuItem> : null}
              </TextField>

              <TextField
                label="Bird Batch"
                select
                size="small"
                value={form.batch}
                disabled={!form.house || formBatchLoading}
                onChange={(event) => setForm((prev) => ({ ...prev, batch: event.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {formBatches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.batch_number}
                  </MenuItem>
                ))}
                {formBatchLoading ? <MenuItem value="" disabled>Loading batches...</MenuItem> : null}
              </TextField>
            </Stack>

            <TextField
              label="Reference"
              size="small"
              value={form.reference}
              onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
            />

            <TextField
              label="Notes"
              multiline
              minRows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />

            {formError ? (
              <Typography variant="body2" color="error.main">
                {formError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Expense"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete expense"
        message="This action cannot be undone. Continue?"
        confirmText="Delete"
        isLoading={isDeleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Box>
  );
}
