"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
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
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PaymentIcon from "@mui/icons-material/Payment";
import { useEffect, useState } from "react";

import {
  ConfirmDialog,
  EmptyState,
  PageHeader,
  TableSkeletonLoader,
} from "@/components/common";
import { listBranches, Branch } from "@/features/branches/api";
import { listCustomers, Customer } from "@/features/customers/api";
import {
  convertCratesToPieces,
  DEFAULT_EGG_CRATE_CAPACITY,
  formatEggGradeLabel,
} from "@/features/eggInventory/constants";
import { listEggInventory, EggInventory } from "@/features/eggInventory/api";
import { listHarvests, Harvest } from "@/features/harvest/api";
import {
  Invoice,
  InvoiceItemWriteInput,
  createInvoice,
  deleteInvoice,
  listInvoices,
} from "@/features/invoices/api";
import { createPayment, listPayments, Payment, PAYMENT_METHODS } from "@/features/payments/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate } from "@/lib/formatters";

type SourceType = "harvest" | "egg_inventory";

interface ItemDraft {
  source_type: SourceType;
  harvest_id: string;
  egg_inventory_id: string;
  selling_unit: "piece" | "crate";
  quantity: string;
  unit_price: string;
}

const emptyItem = (): ItemDraft => ({
  source_type: "harvest",
  harvest_id: "",
  egg_inventory_id: "",
  selling_unit: "piece",
  quantity: "",
  unit_price: "",
});

interface InvoiceFormState {
  customer_id: string;
  branch_id: string;
  invoice_date: string;
  due_date: string;
  notes: string;
  items: ItemDraft[];
}

const emptyInvoiceForm = (): InvoiceFormState => ({
  customer_id: "",
  branch_id: "",
  invoice_date: new Date().toISOString().split("T")[0],
  due_date: "",
  notes: "",
  items: [emptyItem()],
});

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "error"> = {
  unpaid: "warning",
  partially_paid: "default",
  paid: "success",
  overdue: "error",
};

const STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
};

interface PaymentFormState {
  amount: string;
  method: string;
  date: string;
  reference: string;
  notes: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [eggInventories, setEggInventories] = useState<EggInventory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create invoice dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(emptyInvoiceForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Invoice detail dialog
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Record payment dialog
  const [openPayment, setOpenPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: "",
    method: "cash",
    date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [inv, cust, br, harv, eggs] = await Promise.all([
        listInvoices(),
        listCustomers(),
        listBranches(),
        listHarvests(),
        listEggInventory(),
      ]);
      setInvoices(inv);
      setCustomers(cust);
      setBranches(br);
      setHarvests(harv);
      setEggInventories(eggs);
    } catch (e) {
      setError(getApiErrorMessage(e, "An unexpected error occurred."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialInvoices = async () => {
      try {
        const [inv, cust, br, harv, eggs] = await Promise.all([
          listInvoices(),
          listCustomers(),
          listBranches(),
          listHarvests(),
          listEggInventory(),
        ]);

        if (isMounted) {
          setError(null);
          setInvoices(inv);
          setCustomers(cust);
          setBranches(br);
          setHarvests(harv);
          setEggInventories(eggs);
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

    void loadInitialInvoices();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Invoice create form helpers ---

  const updateItem = (idx: number, partial: Partial<ItemDraft>) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], ...partial };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const getAvailableHarvests = () =>
    harvests.filter((h) => h.status === "pending" || h.status === "partially_sold");

  const getItemTotal = (item: ItemDraft): number => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return qty * price;
  };

  const getItemPhysicalQuantity = (item: ItemDraft): number => {
    const qty = parseFloat(item.quantity) || 0;
    if (item.source_type !== "egg_inventory") {
      return qty;
    }
    return item.selling_unit === "crate"
      ? convertCratesToPieces(qty, DEFAULT_EGG_CRATE_CAPACITY)
      : qty;
  };

  const getFormTotal = () => form.items.reduce((s, i) => s + getItemTotal(i), 0);

  const handleCreateInvoice = async () => {
    if (!form.customer_id) {
      setFormError("Please select a customer.");
      return;
    }
    if (!form.branch_id) {
      setFormError("Please select a branch.");
      return;
    }
    for (const [i, item] of form.items.entries()) {
      if (!item.unit_price || parseFloat(item.unit_price) <= 0) {
        setFormError(`Item ${i + 1}: unit price is required.`);
        return;
      }
      if (item.source_type === "harvest" && !item.harvest_id) {
        setFormError(`Item ${i + 1}: select a harvest.`);
        return;
      }
      if (item.source_type === "egg_inventory" && !item.egg_inventory_id) {
        setFormError(`Item ${i + 1}: select an egg inventory.`);
        return;
      }
      if (item.source_type === "egg_inventory" && (!item.quantity || parseFloat(item.quantity) <= 0)) {
        setFormError(`Item ${i + 1}: quantity is required for egg sales.`);
        return;
      }
      if (item.source_type === "egg_inventory") {
        const selectedInventory = eggInventories.find(
          (entry) => entry.id === item.egg_inventory_id
        );
        const requestedPieces = getItemPhysicalQuantity(item);
        const availablePieces = Number(
          selectedInventory?.available_quantity || 0
        );

        if (requestedPieces > availablePieces) {
          setFormError(
            `Item ${i + 1}: only ${availablePieces} pieces are available for this egg grade.`
          );
          return;
        }
      }
    }

    const payload = {
      customer: form.customer_id || null,
      branch: form.branch_id || null,
      invoice_date: form.invoice_date || null,
      due_date: form.due_date || null,
      notes: form.notes,
      items_write: form.items.map((item) => {
        const base: InvoiceItemWriteInput = {
          unit_price: parseFloat(item.unit_price),
        };
        if (item.source_type === "harvest") {
          base.harvest = item.harvest_id;
          if (item.quantity) base.quantity = parseFloat(item.quantity);
        } else {
          base.egg_inventory = item.egg_inventory_id;
          base.quantity = parseFloat(item.quantity);
          base.unit = item.selling_unit;
        }
        return base;
      }),
    };

    try {
      setIsSaving(true);
      setFormError(null);
      await createInvoice(payload);
      setOpenCreate(false);
      await load();
    } catch (e) {
      setFormError(getApiErrorMessage(e, "An unexpected error occurred."));
    } finally {
      setIsSaving(false);
    }
  };

  // --- Invoice detail ---
  const openDetail = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setLoadingPayments(true);
    try {
      const payments = await listPayments({ invoice: inv.id });
      setInvoicePayments(payments);
    } catch {
      setInvoicePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // --- Record payment ---
  const openRecordPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentForm({
      amount: String(inv.balance_due),
      method: "cash",
      date: new Date().toISOString().split("T")[0],
      reference: "",
      notes: "",
    });
    setPaymentError(null);
    setOpenPayment(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      setPaymentError("Amount must be greater than zero.");
      return;
    }
    if (amount > selectedInvoice.balance_due) {
      setPaymentError(
        `Amount exceeds remaining balance of ${formatCurrency(selectedInvoice.balance_due, "GHS")}.`
      );
      return;
    }
    try {
      setIsSavingPayment(true);
      setPaymentError(null);
      await createPayment({
        invoice: selectedInvoice.id,
        amount,
        method: paymentForm.method,
        date: paymentForm.date,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      setOpenPayment(false);
      // Refresh invoice list and if detail open, refresh payments
      await load();
      if (selectedInvoice) {
        const updated = await listPayments({ invoice: selectedInvoice.id });
        setInvoicePayments(updated);
        // Update selected invoice balance
        const refreshed = (await listInvoices()).find((i) => i.id === selectedInvoice.id);
        if (refreshed) setSelectedInvoice(refreshed);
      }
    } catch (e) {
      setPaymentError(getApiErrorMessage(e, "An unexpected error occurred."));
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await deleteInvoice(deleteId);
      setDeleteId(null);
      if (selectedInvoice?.id === deleteId) setSelectedInvoice(null);
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
        title="Invoices"
        action={{
          label: "New Invoice",
          onClick: () => { setForm(emptyInvoiceForm()); setFormError(null); setOpenCreate(true); },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader columns={8} rows={5} />
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    title="No invoices yet"
                    message="Create your first invoice to get started."
                  />
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell>
                    <Button size="small" variant="text" onClick={() => openDetail(inv)}>
                      {inv.invoice_no}
                    </Button>
                  </TableCell>
                  <TableCell>{inv.customer_name ?? "—"}</TableCell>
                  <TableCell>{formatDate(inv.invoice_date ?? inv.created_at)}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.total, "GHS")}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.amount_paid, "GHS")}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.balance_due, "GHS")}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[inv.payment_status] ?? inv.payment_status}
                      color={STATUS_COLORS[inv.payment_status] ?? "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack sx={{ flexDirection: "row", gap: 1, justifyContent: "flex-end" }}>
                      {inv.payment_status !== "paid" && (
                        <Tooltip title="Record Payment">
                          <IconButton size="small" color="primary" onClick={() => openRecordPayment(inv)}>
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Detail">
                        <IconButton size="small" onClick={() => openDetail(inv)}>
                          <ReceiptIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(inv.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Create Invoice Dialog ── */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Invoice</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Customer"
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  fullWidth
                  required
                >
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Branch"
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  fullWidth
                  required
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Invoice Date"
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Due Date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            <Divider />
            <Typography variant="subtitle2">Items</Typography>

            {form.items.map((item, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                <Stack sx={{ gap: 2 }}>
                  <Stack sx={{ flexDirection: "row", gap: 1, alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Item {idx + 1}
                    </Typography>
                    {form.items.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>

                  <TextField
                    select
                    label="Source Type"
                    value={item.source_type}
                    onChange={(e) =>
                      updateItem(idx, {
                        source_type: e.target.value as SourceType,
                        harvest_id: "",
                        egg_inventory_id: "",
                        selling_unit: "piece",
                        quantity: "",
                      })
                    }
                    size="small"
                  >
                    <MenuItem value="harvest">Live Birds (Harvest)</MenuItem>
                    <MenuItem value="egg_inventory">Eggs</MenuItem>
                  </TextField>

                  {item.source_type === "harvest" && (
                    <TextField
                      select
                      label="Harvest"
                      value={item.harvest_id}
                      onChange={(e) => {
                        const h = harvests.find((h) => h.id === e.target.value);
                        updateItem(idx, {
                          harvest_id: e.target.value,
                          quantity: h ? String(h.birds_available) : "",
                        });
                      }}
                      size="small"
                      fullWidth
                    >
                      {getAvailableHarvests().length === 0 && (
                        <MenuItem value="" disabled>
                          No available harvests
                        </MenuItem>
                      )}
                      {getAvailableHarvests().map((h) => (
                        <MenuItem key={h.id} value={h.id}>
                          {h.batch_number} — {h.birds_available} birds available (
                          {h.harvest_date})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {item.source_type === "egg_inventory" && (
                    <Stack sx={{ gap: 2 }}>
                      <TextField
                        select
                        label="Egg Inventory"
                        value={item.egg_inventory_id}
                        onChange={(e) =>
                          updateItem(idx, { egg_inventory_id: e.target.value })
                        }
                        size="small"
                        fullWidth
                      >
                        {eggInventories
                          .filter((entry) => parseFloat(entry.available_quantity) > 0)
                          .map((entry) => (
                            <MenuItem key={entry.id} value={entry.id}>
                              {entry.branch_name} — {formatEggGradeLabel(entry.grade)} —{" "}
                              {entry.available_quantity} pieces ({entry.available_crates} crates)
                            </MenuItem>
                          ))}
                      </TextField>

                      <TextField
                        select
                        label="Selling Unit"
                        value={item.selling_unit}
                        onChange={(e) =>
                          updateItem(idx, {
                            selling_unit: e.target.value as "piece" | "crate",
                          })
                        }
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="piece">Pieces</MenuItem>
                        <MenuItem value="crate">Crates</MenuItem>
                      </TextField>
                    </Stack>
                  )}

                  <Stack sx={{ flexDirection: "row", gap: 2 }}>
                    <TextField
                      label={
                        item.source_type === "harvest"
                          ? "Quantity (birds)"
                          : item.source_type === "egg_inventory"
                          ? `Quantity (${item.selling_unit === "crate" ? "crates" : "pieces"})`
                          : "Quantity"
                      }
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      size="small"
                      type="number"
                      slotProps={{ htmlInput: { min: 0 } }}
                      sx={{ flex: 1 }}
                      helperText={
                        item.source_type === "harvest" && item.harvest_id
                          ? `Max: ${harvests.find((h) => h.id === item.harvest_id)?.birds_available ?? "—"}`
                          : item.source_type === "egg_inventory" && item.egg_inventory_id
                          ? `Available: ${eggInventories.find((e) => e.id === item.egg_inventory_id)?.available_quantity ?? "—"} pieces (${eggInventories.find((e) => e.id === item.egg_inventory_id)?.available_crates ?? "—"} crates)`
                          : undefined
                      }
                    />
                    <TextField
                      label="Unit Price (GHS)"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                      size="small"
                      type="number"
                      slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Subtotal"
                      value={formatCurrency(getItemTotal(item), "GHS")}
                      size="small"
                      sx={{ flex: 1 }}
                      slotProps={{ htmlInput: { readOnly: true } }}
                    />
                  </Stack>
                  {item.source_type === "egg_inventory" && item.quantity ? (
                    <Alert severity="info">
                      {item.selling_unit === "crate"
                        ? `${item.quantity} crate(s) × ${DEFAULT_EGG_CRATE_CAPACITY} = ${getItemPhysicalQuantity(item)} pieces`
                        : `${item.quantity} piece(s) will deduct ${getItemPhysicalQuantity(item)} pieces from inventory`}
                    </Alert>
                  ) : null}
                </Stack>
              </Paper>
            ))}

            <Button startIcon={<AddIcon />} onClick={addItem} variant="outlined" size="small">
              Add Item
            </Button>

            <Stack sx={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Total: {formatCurrency(getFormTotal(), "GHS")}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateInvoice}
            disabled={isSaving}
            loading={isSaving}
          >
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Invoice Detail Dialog ── */}
      <Dialog
        open={!!selectedInvoice && !openPayment}
        onClose={() => setSelectedInvoice(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedInvoice && (
          <>
            <DialogTitle>
              Invoice {selectedInvoice.invoice_no}
              <Chip
                label={STATUS_LABELS[selectedInvoice.payment_status] ?? selectedInvoice.payment_status}
                color={STATUS_COLORS[selectedInvoice.payment_status] ?? "default"}
                size="small"
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent>
              <Stack sx={{ gap: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Customer</Typography>
                    <Typography>{selectedInvoice.customer_name ?? "—"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Branch</Typography>
                    <Typography>{selectedInvoice.branch_name ?? "—"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Invoice Date</Typography>
                    <Typography>{formatDate(selectedInvoice.invoice_date ?? selectedInvoice.created_at)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">Due Date</Typography>
                    <Typography>{formatDate(selectedInvoice.due_date)}</Typography>
                  </Grid>
                </Grid>

                <Divider />
                <Typography variant="subtitle2">Items</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Grade</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell align="right">Physical Qty</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name ?? "—"}</TableCell>
                          <TableCell>
                            {item.egg_grade ? formatEggGradeLabel(item.egg_grade) : "—"}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell align="right">{item.physical_quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price, "GHS")}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total, "GHS")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Stack sx={{ flexDirection: "row", justifyContent: "flex-end", gap: 4 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total</Typography>
                    <Typography variant="h6">{formatCurrency(selectedInvoice.total, "GHS")}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Paid</Typography>
                    <Typography variant="h6" color="success.main">{formatCurrency(selectedInvoice.amount_paid, "GHS")}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Balance</Typography>
                    <Typography variant="h6" color={selectedInvoice.balance_due > 0 ? "error.main" : "text.primary"}>
                      {formatCurrency(selectedInvoice.balance_due, "GHS")}
                    </Typography>
                  </Box>
                </Stack>

                <Divider />
                <Typography variant="subtitle2">Payments</Typography>
                {loadingPayments ? (
                  <Typography variant="body2" color="text.secondary">Loading payments…</Typography>
                ) : invoicePayments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No payments recorded.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoicePayments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell>{formatDate(p.date)}</TableCell>
                            <TableCell sx={{ textTransform: "capitalize" }}>{p.method.replace("_", " ")}</TableCell>
                            <TableCell>{p.reference || "—"}</TableCell>
                            <TableCell align="right">{formatCurrency(p.amount, "GHS")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              {selectedInvoice.payment_status !== "paid" && (
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={() => openRecordPayment(selectedInvoice)}
                >
                  Record Payment
                </Button>
              )}
              <Button onClick={() => setSelectedInvoice(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Record Payment Dialog ── */}
      <Dialog open={openPayment} onClose={() => setOpenPayment(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Payment — {selectedInvoice?.invoice_no}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, mt: 1 }}>
            {paymentError && <Alert severity="error">{paymentError}</Alert>}
            {selectedInvoice && (
              <Alert severity="info">
                Balance due: {formatCurrency(selectedInvoice.balance_due, "GHS")}
              </Alert>
            )}
            <TextField
              label="Amount (GHS)"
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              fullWidth
              required
              slotProps={{ htmlInput: { min: 0.01, step: "0.01" } }}
            />
            <TextField
              select
              label="Payment Method"
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              fullWidth
            >
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Payment Date"
              type="date"
              value={paymentForm.date}
              onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Reference (optional)"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              fullWidth
            />
            <TextField
              label="Notes (optional)"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPayment(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRecordPayment}
            disabled={isSavingPayment}
            loading={isSavingPayment}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </Box>
  );
}
