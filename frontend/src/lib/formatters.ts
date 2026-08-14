export const formatDate = (
  value: string | null | undefined
) => (value ? new Date(value).toLocaleDateString() : "—");

export const formatNumber = (
  value: number | string | null | undefined
) =>
  value === null || value === undefined || value === ""
    ? "—"
    : new Intl.NumberFormat().format(Number(value));

export const formatCurrency = (
  value: number | string | null | undefined,
  currency = "USD"
) =>
  value === null || value === undefined || value === ""
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
