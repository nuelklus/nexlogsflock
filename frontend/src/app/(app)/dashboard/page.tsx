"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  AgricultureRounded,
  ArrowUpwardRounded,
  AttachMoneyRounded,
  EggAltOutlined,
  Inventory2Outlined,
  LocalShippingOutlined,
  PetsRounded,
  ReceiptLongOutlined,
  TrendingUpRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/auth/context/AuthContext";
import { EmptyState } from "@/components/common";
import { BirdBatch, listBatches } from "@/features/batches/api";
import { FeedConsumption, listFeedConsumptions } from "@/features/feedConsumption/api";
import { FeedInventory, listFeedInventory } from "@/features/feedInventory/api";
import { FeedPurchase, listFeedPurchases } from "@/features/feedPurchases/api";
import { EggInventory, listEggInventory } from "@/features/eggInventory/api";
import { EggProduction, listEggProductions } from "@/features/eggProduction/api";
import { Invoice, listInvoices } from "@/features/invoices/api";
import { MortalityRecord, listMortalities } from "@/features/mortalities/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatNumber } from "@/lib/formatters";

const safeNumber = (value: number | string | null | undefined) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getTodayIso = () => new Date().toISOString().split("T")[0];

const formatDateTimeLabel = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function TrendSparkline({ values, color }: { values: number[]; color: string }) {
  const normalizedValues = values.length > 0 ? values : [0, 0, 0, 0];
  const maxValue = Math.max(...normalizedValues, 1);
  const minValue = Math.min(...normalizedValues, 0);
  const range = maxValue - minValue || 1;

  const points = normalizedValues
    .map((value, index) => {
      const x = (index / Math.max(normalizedValues.length - 1, 1)) * 100;
      const y = 100 - ((value - minValue) / range) * 72 - 12;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: 42 }}>
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points={`${points} 100,100 0,100`}
        fill={`url(#spark-${color.replace("#", "")})`}
      />
    </svg>
  );
}

function ProductionChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.some((item) => item.value > 0)) {
    return (
      <EmptyState
        title="No production recorded"
        message="Start recording today's production to see your farm's trend." 
      />
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const chartBars = data.map((item) => ({ ...item, height: (item.value / maxValue) * 100 }));

  return (
    <Box sx={{ pt: 1 }}>
      <Stack direction="row" spacing={1} sx={{ height: 160, px: 1, alignItems: "flex-end" }}>
        {chartBars.map((item) => (
          <Box key={item.label} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {item.value}
            </Typography>
            <Box
              sx={{
                width: "100%",
                maxWidth: 34,
                height: `${Math.max(item.height, 8)}%`,
                borderRadius: "12px 12px 8px 8px",
                background: "linear-gradient(180deg, #1E88E5 0%, #BA68C8 100%)",
                boxShadow: "0 10px 18px rgba(30, 136, 229, 0.16)",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { activeTenantId, tenantLoading, tenantError, tenants, user } = useAuth();

  const [feedPurchases, setFeedPurchases] = useState<FeedPurchase[]>([]);
  const [feedInventory, setFeedInventory] = useState<FeedInventory[]>([]);
  const [feedConsumptions, setFeedConsumptions] = useState<FeedConsumption[]>([]);
  const [eggInventory, setEggInventory] = useState<EggInventory[]>([]);
  const [eggProductions, setEggProductions] = useState<EggProduction[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setFeedPurchases([]);
          setFeedInventory([]);
          setFeedConsumptions([]);
          setEggInventory([]);
          setEggProductions([]);
          setBatches([]);
          setInvoices([]);
          setMortalities([]);
          setSectionErrors({});
          setDashboardLoading(false);
        }
        return;
      }

      const requests = [
        { key: "feedPurchases", request: listFeedPurchases(), label: "feed purchases" },
        { key: "feedInventory", request: listFeedInventory(), label: "feed inventory" },
        { key: "feedConsumptions", request: listFeedConsumptions(), label: "feed consumption" },
        { key: "eggInventory", request: listEggInventory(), label: "egg inventory" },
        { key: "eggProductions", request: listEggProductions(), label: "egg production" },
        { key: "batches", request: listBatches(), label: "livestock batches" },
        { key: "invoices", request: listInvoices(), label: "invoices" },
        { key: "mortalities", request: listMortalities(), label: "mortalities" },
      ];

      const results = await Promise.allSettled(requests.map(({ request }) => request));

      if (!isMounted) {
        return;
      }

      const nextErrors: Record<string, string> = {};
      const nextState = {
        feedPurchases: [] as FeedPurchase[],
        feedInventory: [] as FeedInventory[],
        feedConsumptions: [] as FeedConsumption[],
        eggInventory: [] as EggInventory[],
        eggProductions: [] as EggProduction[],
        batches: [] as BirdBatch[],
        invoices: [] as Invoice[],
        mortalities: [] as MortalityRecord[],
      };

      results.forEach((result, index) => {
        const key = requests[index].key;
        if (result.status === "fulfilled") {
          if (key === "feedPurchases") nextState.feedPurchases = result.value as FeedPurchase[];
          if (key === "feedInventory") nextState.feedInventory = result.value as FeedInventory[];
          if (key === "feedConsumptions") nextState.feedConsumptions = result.value as FeedConsumption[];
          if (key === "eggInventory") nextState.eggInventory = result.value as EggInventory[];
          if (key === "eggProductions") nextState.eggProductions = result.value as EggProduction[];
          if (key === "batches") nextState.batches = result.value as BirdBatch[];
          if (key === "invoices") nextState.invoices = result.value as Invoice[];
          if (key === "mortalities") nextState.mortalities = result.value as MortalityRecord[];
        } else {
          nextErrors[key] = getApiErrorMessage(result.reason, `Unable to load ${requests[index].label}.`);
        }
      });

      setFeedPurchases(nextState.feedPurchases);
      setFeedInventory(nextState.feedInventory);
      setFeedConsumptions(nextState.feedConsumptions);
      setEggInventory(nextState.eggInventory);
      setEggProductions(nextState.eggProductions);
      setBatches(nextState.batches);
      setInvoices(nextState.invoices);
      setMortalities(nextState.mortalities);
      setSectionErrors(nextErrors);
      setDashboardLoading(false);
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  const activeTenant = useMemo(
    () => tenants.find((organization) => organization.id === activeTenantId) ?? null,
    [activeTenantId, tenants]
  );

  const activeTenantCurrency = useMemo(() => activeTenant?.currency || "USD", [activeTenant]);

  const greetingName = user && (user.first_name || user.last_name)
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : "Farmer";

  const [greetingMeta, setGreetingMeta] = useState({ greeting: "Good day", dateText: "Today" });

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const dateText = now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    setGreetingMeta({ greeting, dateText });
  }, []);

  const currentMonth = useMemo(() => getTodayIso().slice(0, 7), []);

  const totalFeedStock = useMemo(
    () => feedInventory.reduce((sum, item) => sum + safeNumber(item.available_quantity), 0),
    [feedInventory]
  );

  const totalEggInventory = useMemo(
    () => eggInventory.reduce((sum, item) => sum + safeNumber(item.available_quantity), 0),
    [eggInventory]
  );

  const totalBirds = useMemo(
    () => batches.reduce((sum, item) => sum + safeNumber(item.current_quantity), 0),
    [batches]
  );

  const activeBatches = useMemo(
    () => batches.filter((item) => item.is_active || item.status === "active").length,
    [batches]
  );

  const lowStockFeeds = useMemo(
    () => feedInventory.filter((item) => safeNumber(item.available_quantity) < 100),
    [feedInventory]
  );

  const feedConsumedToday = useMemo(
    () => feedConsumptions
      .filter((item) => item.consumption_date === getTodayIso())
      .reduce((sum, item) => sum + safeNumber(item.quantity), 0),
    [feedConsumptions]
  );

  const eggsCollectedToday = useMemo(
    () => eggProductions
      .filter((item) => item.production_date === getTodayIso())
      .reduce((sum, item) => sum + safeNumber(item.total_eggs), 0),
    [eggProductions]
  );

  const feedPurchasedThisMonth = useMemo(
    () => feedPurchases
      .filter((item) => item.purchase_date.startsWith(currentMonth))
      .reduce((sum, item) => sum + safeNumber(item.quantity), 0),
    [currentMonth, feedPurchases]
  );

  const feedCostThisMonth = useMemo(
    () => feedPurchases
      .filter((item) => item.purchase_date.startsWith(currentMonth))
      .reduce((sum, item) => sum + safeNumber(item.total_cost), 0),
    [currentMonth, feedPurchases]
  );

  const revenueThisMonth = useMemo(
    () => invoices
      .filter((invoice) => (invoice.invoice_date || invoice.created_at).startsWith(currentMonth))
      .reduce((sum, invoice) => sum + safeNumber(invoice.total), 0),
    [currentMonth, invoices]
  );

  const outstandingInvoices = useMemo(
    () => invoices.reduce((sum, invoice) => sum + safeNumber(invoice.balance_due), 0),
    [invoices]
  );

  const totalMortalityThisMonth = useMemo(
    () => mortalities
      .filter((item) => item.date.startsWith(currentMonth))
      .reduce((sum, item) => sum + safeNumber(item.quantity), 0),
    [currentMonth, mortalities]
  );

  const previousMonth = useMemo(() => {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return previous.toISOString().slice(0, 7);
  }, []);

  const previousFeedConsumed = useMemo(
    () => feedConsumptions
      .filter((item) => item.consumption_date && item.consumption_date.startsWith(previousMonth))
      .reduce((sum, item) => sum + safeNumber(item.quantity), 0),
    [feedConsumptions, previousMonth]
  );

  const previousEggs = useMemo(
    () => eggProductions
      .filter((item) => item.production_date && item.production_date.startsWith(previousMonth))
      .reduce((sum, item) => sum + safeNumber(item.total_eggs), 0),
    [eggProductions, previousMonth]
  );

  const previousFeedPurchased = useMemo(
    () => feedPurchases
      .filter((item) => item.purchase_date.startsWith(previousMonth))
      .reduce((sum, item) => sum + safeNumber(item.quantity), 0),
    [feedPurchases, previousMonth]
  );

  const previousRevenue = useMemo(
    () => invoices
      .filter((invoice) => (invoice.invoice_date || invoice.created_at).startsWith(previousMonth))
      .reduce((sum, invoice) => sum + safeNumber(invoice.total), 0),
    [invoices, previousMonth]
  );

  const lineSeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return { key: date.toISOString().split("T")[0], label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
    });

    return days.map(({ key, label }) => ({
      label,
      value: eggProductions
        .filter((item) => item.production_date === key)
        .reduce((sum, item) => sum + safeNumber(item.total_eggs), 0),
    }));
  }, [eggProductions]);

  const dashboardCards = useMemo(() => {
    const cards = [
      {
        title: "Total birds",
        value: formatNumber(totalBirds),
        unit: "birds",
        icon: <PetsRounded fontSize="small" />,
        color: "#1E88E5",
        subtext: `${activeBatches} active batches`,
        trend: totalBirds > 0 ? 0 : null,
        positive: true,
      },
      {
        title: "Feed stock",
        value: `${formatNumber(totalFeedStock)} kg`,
        unit: "", 
        icon: <Inventory2Outlined fontSize="small" />,
        color: "#16A34A",
        subtext: `${lowStockFeeds.length} items need attention`,
        trend: totalFeedStock > 0 && previousFeedPurchased > 0 ? ((totalFeedStock - previousFeedPurchased) / Math.max(previousFeedPurchased, 1)) * 100 : null,
        positive: true,
      },
      {
        title: "Feed consumed today",
        value: `${formatNumber(feedConsumedToday)} kg`,
        unit: "",
        icon: <LocalShippingOutlined fontSize="small" />,
        color: "#BA68C8",
        subtext: previousFeedConsumed > 0 ? `${formatNumber(previousFeedConsumed)} kg last period` : "No historic comparison",
        trend: previousFeedConsumed > 0 ? ((feedConsumedToday - previousFeedConsumed) / Math.max(previousFeedConsumed, 1)) * 100 : null,
        positive: feedConsumedToday <= previousFeedConsumed,
      },
      {
        title: "Today’s Eggs",
        value: formatNumber(eggsCollectedToday),
        unit: "eggs",
        icon: <EggAltOutlined fontSize="small" />,
        color: "#F59E0B",
        subtext: previousEggs > 0 ? `${formatNumber(previousEggs)} eggs previous period` : "No historic comparison",
        trend: previousEggs > 0 ? ((eggsCollectedToday - previousEggs) / Math.max(previousEggs, 1)) * 100 : null,
        positive: eggsCollectedToday >= previousEggs,
      },
      {
        title: "Egg inventory",
        value: formatNumber(totalEggInventory),
        unit: "eggs",
        icon: <EggAltOutlined fontSize="small" />,
        color: "#1E88E5",
        subtext: totalEggInventory > 0 ? "Available in inventory" : "No eggs on hand",
        trend: null,
        positive: true,
      },
      {
        title: "Revenue this month",
        value: formatCurrency(revenueThisMonth, activeTenantCurrency),
        unit: "",
        icon: <AttachMoneyRounded fontSize="small" />,
        color: "#16A34A",
        subtext: previousRevenue > 0 ? `${formatCurrency(previousRevenue, activeTenantCurrency)} last month` : "No prior month revenue",
        trend: previousRevenue > 0 ? ((revenueThisMonth - previousRevenue) / Math.max(previousRevenue, 1)) * 100 : null,
        positive: revenueThisMonth >= previousRevenue,
      },
      {
        title: "Expenses this month",
        value: formatCurrency(feedCostThisMonth, activeTenantCurrency),
        unit: "",
        icon: <ReceiptLongOutlined fontSize="small" />,
        color: "#DC2626",
        subtext: previousFeedPurchased > 0 ? `${formatCurrency(feedCostThisMonth, activeTenantCurrency)} costs recorded` : "Feed costs tracked",
        trend: previousFeedPurchased > 0 ? ((feedPurchasedThisMonth - previousFeedPurchased) / Math.max(previousFeedPurchased, 1)) * 100 : null,
        positive: false,
      },
      {
        title: "Outstanding invoices",
        value: formatCurrency(outstandingInvoices, activeTenantCurrency),
        unit: "",
        icon: <TrendingUpRounded fontSize="small" />,
        color: "#F59E0B",
        subtext: `${invoices.length} invoices in the tenant`,
        trend: null,
        positive: outstandingInvoices === 0,
      },
    ];

    return cards;
  }, [activeBatches, activeTenantCurrency, eggsCollectedToday, feedConsumedToday, feedCostThisMonth, feedPurchasedThisMonth, lowStockFeeds.length, previousEggs, previousFeedConsumed, previousFeedPurchased, previousRevenue, revenueThisMonth, totalBirds, totalEggInventory, totalFeedStock, outstandingInvoices, invoices.length]);

  const insightText = useMemo(() => {
    if (eggsCollectedToday > 0 && previousEggs > 0) {
      const delta = ((eggsCollectedToday - previousEggs) / Math.max(previousEggs, 1)) * 100;
      return `Egg production is ${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? "higher" : "lower"} than last month.`;
    }
    if (feedConsumedToday > 0 && previousFeedConsumed > 0) {
      const delta = ((feedConsumedToday - previousFeedConsumed) / Math.max(previousFeedConsumed, 1)) * 100;
      return `Feed consumption is ${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? "higher" : "lower"} than the previous period.`;
    }
    if (lowStockFeeds.length > 0) {
      return `${lowStockFeeds.length} feed items are under the recommended stock threshold.`;
    }
    return "No fresh comparison data is available yet. Record more farm activity to generate insights.";
  }, [eggsCollectedToday, feedConsumedToday, lowStockFeeds.length, previousEggs, previousFeedConsumed]);

  const recentActivities = useMemo(() => {
    const entries = [
      ...feedPurchases.map((item) => ({
        id: item.id,
        label: "Feed purchase recorded",
        body: `${item.feed_type_name} • ${formatNumber(item.quantity)} ${item.unit}`,
        time: item.purchase_date,
        icon: <LocalShippingOutlined fontSize="small" />,
      })),
      ...eggProductions.map((item) => ({
        id: item.id,
        label: "Egg collection recorded",
        body: `${formatNumber(item.total_eggs)} eggs collected`,
        time: item.production_date,
        icon: <EggAltOutlined fontSize="small" />,
      })),
      ...invoices.map((item) => ({
        id: item.id,
        label: "Invoice created",
        body: `${item.invoice_no} • ${formatCurrency(safeNumber(item.total), activeTenantCurrency)}`,
        time: item.invoice_date || item.created_at,
        icon: <ReceiptLongOutlined fontSize="small" />,
      })),
      ...mortalities.map((item) => ({
        id: item.id,
        label: "Mortality recorded",
        body: `${formatNumber(item.quantity)} birds • ${item.cause}`,
        time: item.date,
        icon: <WarningAmberRounded fontSize="small" />,
      })),
    ];

    return entries
      .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
      .slice(0, 5);
  }, [activeTenantCurrency, eggProductions, feedPurchases, invoices, mortalities]);

  const inventoryStatus = [
    {
      label: "Feed",
      value: `${formatNumber(totalFeedStock)} kg`,
      detail: lowStockFeeds.length > 0 ? `${lowStockFeeds.length} low-stock items` : "Healthy stock",
      tone: lowStockFeeds.length > 0 ? "warning" : "success",
    },
    {
      label: "Eggs",
      value: `${formatNumber(totalEggInventory)} eggs`,
      detail: totalEggInventory > 0 ? "Available in inventory" : "No eggs in stock",
      tone: totalEggInventory > 0 ? "success" : "default",
    },
    {
      label: "Bird population",
      value: formatNumber(totalBirds),
      detail: `${activeBatches} active batches`,
      tone: "primary",
    },
  ];

  const quickActions = [
    { label: "Record egg production", href: "/egg-collection", icon: <EggAltOutlined fontSize="small" /> },
    { label: "Record feed consumption", href: "/feed-consumption", icon: <LocalShippingOutlined fontSize="small" /> },
    { label: "Add livestock", href: "/batches", icon: <AgricultureRounded fontSize="small" /> },
    { label: "Record mortality", href: "/mortalities", icon: <WarningAmberRounded fontSize="small" /> },
    { label: "Create invoice", href: "/invoices", icon: <ReceiptLongOutlined fontSize="small" /> },
  ];

  const pageLoading = tenantLoading || dashboardLoading;

  return (
    <Stack spacing={3}>
      <Paper
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          background: "linear-gradient(135deg, rgba(30, 136, 229, 0.08), rgba(186, 104, 200, 0.08), rgba(255,255,255,0.96))",
          borderColor: "divider",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" } }}>
          <Stack spacing={1}>
            {/* <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em" }}>
              {activeTenant?.name || "Farm overview"}
            </Typography> */}
            <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: "-0.04em" }}>
              {greetingMeta.greeting}, {greetingName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 620 }}>
              Here&apos;s what&apos;s happening across your farm today.
            </Typography>
          </Stack>

          <Stack spacing={0.75} sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}>
            <Typography variant="caption" color="text.secondary">Active farm</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{activeTenant?.name || "No tenant selected"}</Typography>
            <Typography variant="body2" color="text.secondary">{mounted ? greetingMeta.dateText : "Today"}</Typography>
          </Stack>
        </Stack>
      </Paper>

      {tenantError ? <Alert severity="warning">{tenantError}</Alert> : null}
      {Object.values(sectionErrors).map((errorMessage) => (
        <Alert key={errorMessage} severity="error">{errorMessage}</Alert>
      ))}
      {!activeTenantId && !tenantLoading ? (
        <Alert severity="info">No active organization selected yet. Once organization data is available, dashboard metrics will load.</Alert>
      ) : null}

      <Grid container spacing={2}>
        {pageLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }} sx={{ width: "100%" }}>
                <Paper sx={{ p: 2.5, minHeight: 150 }}>
                  <Skeleton variant="text" width={100} sx={{ mb: 1.5 }} />
                  <Skeleton variant="text" width={120} height={42} sx={{ mb: 1.5 }} />
                  <Skeleton variant="text" width={140} />
                </Paper>
              </Grid>
            ))
          : dashboardCards.map((card) => {
              const percent = typeof card.trend === "number" ? Math.abs(card.trend) : 0;
              const trendColor = card.positive ? "success.main" : "error.main";

              return (
                <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 3 }} sx={{ width: "100%" }}>
                  <Paper
                    sx={{
                      p: 2.5,
                      minHeight: 182,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 160ms ease, box-shadow 160ms ease",
                      "&:hover": { transform: "translateY(-2px)" },
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          color: card.color,
                          backgroundColor: `${card.color}15`,
                        }}
                      >
                        {card.icon}
                      </Box>
                      {typeof card.trend === "number" ? (
                        <Chip
                          size="small"
                          label={`${card.positive ? "+" : "-"}${percent.toFixed(1)}%`}
                          sx={{
                            bgcolor: `${trendColor}15`,
                            color: trendColor,
                            fontWeight: 700,
                          }}
                        />
                      ) : null}
                    </Stack>

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {card.title}
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1, fontWeight: 800, letterSpacing: "-0.03em" }}>
                        {card.value}
                      </Typography>
                    </Box>

                    <Stack spacing={1}>
                      <TrendSparkline values={Array.from({ length: 8 }, (_, index) => (index + 1) * (card.trend ?? 0) + (Math.sin(index + 1) * 12))} color={card.color} />
                      <Typography variant="caption" color="text.secondary">
                        {card.subtext}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }} sx={{ width: "100%" }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Production overview</Typography>
              <Chip label="7-day trend" size="small" color="primary" variant="outlined" />
            </Stack>
            {pageLoading ? (
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            ) : (
              <ProductionChart data={lineSeries} />
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} sx={{ width: "100%" }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Farm performance</Typography>
              <TrendingUpRounded color="primary" fontSize="small" />
            </Stack>
            <Stack spacing={2.5}>
              {[
                { label: "Bird population", value: formatNumber(totalBirds), percentage: Math.min((totalBirds / Math.max(totalBirds + 50, 1)) * 100, 100), detail: `${activeBatches} active batches` },
                { label: "Egg production", value: `${formatNumber(eggsCollectedToday)} eggs today`, percentage: Math.min((eggsCollectedToday / Math.max(eggsCollectedToday + 80, 1)) * 100, 100), detail: previousEggs > 0 ? `${formatNumber(previousEggs)} eggs previous period` : "No comparison data yet" },
                { label: "Feed efficiency", value: `${formatNumber(feedConsumedToday)} kg used`, percentage: Math.min((feedConsumedToday / Math.max(totalFeedStock + 1, 1)) * 100, 100), detail: `${formatNumber(totalFeedStock)} kg available` },
                { label: "Mortality", value: `${formatNumber(totalMortalityThisMonth)} birds`, percentage: totalBirds > 0 ? Math.min((totalMortalityThisMonth / Math.max(totalBirds, 1)) * 100, 100) : 0, detail: totalBirds > 0 ? `${((totalMortalityThisMonth / Math.max(totalBirds, 1)) * 100).toFixed(2)}% of flock` : "No flock data" },
              ].map((metric) => (
                <Box key={metric.label}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">{metric.label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{metric.value}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={metric.percentage} sx={{ height: 8, borderRadius: 999, backgroundColor: "rgba(30,136,229,0.08)", '& .MuiLinearProgress-bar': { borderRadius: 999 } }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>{metric.detail}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ width: "100%" }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Inventory status</Typography>
              <Inventory2Outlined color="primary" fontSize="small" />
            </Stack>
            <Stack spacing={2}>
              {inventoryStatus.map((item) => (
                <Box key={item.label} sx={{ p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "rgba(148,163,184,0.03)" }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Chip
                      size="small"
                      label={item.tone === "success" ? "Healthy" : item.tone === "warning" ? "Low" : item.tone === "primary" ? "Active" : "Available"}
                      color={item.tone === "success" ? "success" : item.tone === "warning" ? "warning" : item.tone === "primary" ? "primary" : "default"}
                    />
                  </Stack>
                  <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>{item.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} sx={{ width: "100%" }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Low stock alerts</Typography>
              <Button variant="text" color="primary" onClick={() => router.push("/feed-inventory")}>View inventory</Button>
            </Stack>

            {lowStockFeeds.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Feed type</TableCell>
                      <TableCell>Available</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockFeeds.slice(0, 5).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Stack>
                            <Typography sx={{ fontWeight: 600 }}>{item.feed_type_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.branch_name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{formatNumber(item.available_quantity)} kg</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={safeNumber(item.available_quantity) <= 0 ? "Critical" : "Low"}
                            color={safeNumber(item.available_quantity) <= 0 ? "error" : "warning"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 2.5, borderRadius: 2, backgroundColor: "rgba(22, 163, 74, 0.06)", border: "1px solid rgba(22, 163, 74, 0.22)", display: "flex", alignItems: "center", gap: 1 }}>
                <Chip label="Healthy" color="success" size="small" />
                <Typography variant="body2" color="text.secondary">All inventory levels are healthy.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }} sx={{ width: "100%" }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Recent farm activities</Typography>
              <ArrowUpwardRounded color="primary" fontSize="small" />
            </Stack>
            <Stack spacing={1.5}>
              {recentActivities.length > 0 ? recentActivities.map((item) => (
                <Box key={item.id} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, display: "grid", placeItems: "center", backgroundColor: "rgba(30,136,229,0.08)", color: "primary.main" }}>
                    {item.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.body}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{formatDateTimeLabel(item.time)}</Typography>
                  </Box>
                </Box>
              )) : (
                <EmptyState title="No recent farm activity" message="Your latest feed, egg, invoice, and livestock records will appear here." />
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }} sx={{ width: "100%" }}>
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>Quick actions</Typography>
              <Chip label="Fast access" size="small" color="secondary" variant="outlined" />
            </Stack>
            <Grid container spacing={1.5}>
              {quickActions.map((action) => (
                <Grid key={action.label} size={{ xs: 12, sm: 6 }} sx={{ width: "100%" }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => router.push(action.href)}
                    sx={{
                      justifyContent: "flex-start",
                      py: 1.5,
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {action.icon}
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{action.label}</Typography>
                    </Stack>
                  </Button>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 2.5 }} />
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
                <TrendingUpRounded fontSize="small" color="primary" /> Farm insights
              </Typography>
              <Typography variant="body2" color="text.secondary">{insightText}</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
