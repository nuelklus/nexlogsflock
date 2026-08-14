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
  EmptyState,
  MetricCard,
  PageHeader,
  TableSkeletonLoader,
} from "@/components/common";
import { BirdBatch, listBatches } from "@/features/batches/api";
import { Branch, listBranches } from "@/features/branches/api";
import {
  CreateEggProductionInput,
  EggProduction,
  createEggProduction,
  listEggProductions,
} from "@/features/eggProduction/api";
import {
  CreateFeedConsumptionInput,
  FeedConsumption,
  createFeedConsumption,
  listFeedConsumptions,
} from "@/features/feedConsumption/api";
import { FeedType, listFeedTypes } from "@/features/feedTypes/api";
import { House, listHouses } from "@/features/houses/api";
import {
  CreateMortalityInput,
  MortalityCause,
  MortalityRecord,
  createMortality,
  listMortalities,
} from "@/features/mortalities/api";
import {
  CreateVaccinationRecordInput,
  VaccinationRecord,
  VaccinationRoute,
  Vaccine,
  createVaccinationRecord,
  listVaccinationRecords,
  listVaccines,
} from "@/features/vaccination/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatDate, formatNumber } from "@/lib/formatters";

const getToday = () => new Date().toISOString().split("T")[0];

const MORTALITY_CAUSES: Array<{ value: MortalityCause; label: string }> = [
  { value: "disease", label: "Disease" },
  { value: "heat_stress", label: "Heat Stress" },
  { value: "accident", label: "Accident" },
  { value: "predator", label: "Predator" },
  { value: "poor_quality", label: "Poor Chick Quality" },
  { value: "unknown", label: "Unknown" },
  { value: "other", label: "Other" },
];

const VACCINATION_ROUTES: Array<{
  value: VaccinationRoute;
  label: string;
}> = [
  { value: "water", label: "Water" },
  { value: "injection", label: "Injection" },
  { value: "spray", label: "Spray" },
  { value: "eye_drop", label: "Eye Drop" },
  { value: "oral", label: "Oral" },
  { value: "other", label: "Other" },
];

type ActivityType =
  | "egg_collection"
  | "feed_consumption"
  | "mortality"
  | "vaccination";

type ActivityItem = {
  id: string;
  key: string;
  type: ActivityType;
  date: string;
  timestamp: string;
  branchId: string;
  branchName: string;
  houseId: string;
  houseName: string;
  batchId: string;
  batchNumber: string;
  summary: string;
  recordedBy: string;
  raw:
    | EggProduction
    | FeedConsumption
    | MortalityRecord
    | VaccinationRecord;
};

const formatTime = (value: string | null | undefined) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildEmptyEggForm = (): CreateEggProductionInput => ({
  branch: "",
  house: "",
  batch: "",
  production_date: getToday(),
  large_eggs: 0,
  medium_eggs: 0,
  small_eggs: 0,
  pullet_eggs: 0,
  unsorted_eggs: 0,
  good_eggs: 0,
  cracked_eggs: 0,
  broken_eggs: 0,
  dirty_eggs: 0,
  double_yolk_eggs: 0,
  notes: "",
});

const buildEmptyFeedForm = (): CreateFeedConsumptionInput => ({
  branch: "",
  house: "",
  batch: "",
  feed_type: "",
  quantity: 0,
  consumption_date: getToday(),
});

const buildEmptyMortalityForm = (): CreateMortalityInput => ({
  branch: "",
  house: "",
  batch: "",
  disease: null,
  disease_outbreak: null,
  date: getToday(),
  quantity: 0,
  cause: "unknown",
  notes: "",
});

const buildEmptyVaccinationForm = (): CreateVaccinationRecordInput & {
  branch: string;
  house: string;
} => ({
  branch: "",
  house: "",
  batch: "",
  vaccine: "",
  date_administered: getToday(),
  quantity_used: null,
  route: "water",
  notes: "",
});

export default function DailyActivitiesPage() {
  const { activeTenantId, tenants } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [batches, setBatches] = useState<BirdBatch[]>([]);
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [eggCollections, setEggCollections] = useState<EggProduction[]>(
    []
  );
  const [feedConsumptions, setFeedConsumptions] = useState<
    FeedConsumption[]
  >([]);
  const [mortalities, setMortalities] = useState<MortalityRecord[]>(
    []
  );
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    date: getToday(),
    branch: "",
    house: "",
    batch: "",
  });

  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityItem | null>(null);

  const [eggDialogOpen, setEggDialogOpen] = useState(false);
  const [eggFormData, setEggFormData] = useState(buildEmptyEggForm);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [feedFormData, setFeedFormData] = useState(buildEmptyFeedForm);
  const [mortalityDialogOpen, setMortalityDialogOpen] = useState(false);
  const [mortalityFormData, setMortalityFormData] = useState(
    buildEmptyMortalityForm
  );
  const [vaccinationDialogOpen, setVaccinationDialogOpen] =
    useState(false);
  const [vaccinationFormData, setVaccinationFormData] = useState(
    buildEmptyVaccinationForm
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeTenant = useMemo(
    () =>
      tenants.find((organization) => organization.id === activeTenantId) ??
      null,
    [activeTenantId, tenants]
  );

  const hasPermission = (module: string, action: string) => {
    const permissionSet = activeTenant?.permissions || [];

    if (permissionSet.length === 0) {
      return true;
    }

    return (
      permissionSet.includes(`${module}.${action}`) ||
      permissionSet.includes(`${module}.all`)
    );
  };

  const canCreateEggCollection = hasPermission("eggs", "create");
  const canCreateFeedConsumption = hasPermission("feed", "create");
  const canCreateMortality = hasPermission("birds", "create");
  const canCreateVaccination = hasPermission("health", "create");

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!activeTenantId) {
        if (isMounted) {
          setBranches([]);
          setHouses([]);
          setBatches([]);
          setFeedTypes([]);
          setVaccines([]);
          setEggCollections([]);
          setFeedConsumptions([]);
          setMortalities([]);
          setVaccinations([]);
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
          branchesResult,
          housesResult,
          batchesResult,
          feedTypesResult,
          vaccinesResult,
          eggCollectionsResult,
          feedConsumptionsResult,
          mortalitiesResult,
          vaccinationsResult,
        ] = await Promise.all([
          listBranches(),
          listHouses(),
          listBatches(),
          listFeedTypes(),
          listVaccines(),
          listEggProductions(),
          listFeedConsumptions(),
          listMortalities(),
          listVaccinationRecords(),
        ]);

        if (isMounted) {
          setBranches(branchesResult);
          setHouses(housesResult);
          setBatches(batchesResult);
          setFeedTypes(feedTypesResult);
          setVaccines(vaccinesResult);
          setEggCollections(eggCollectionsResult);
          setFeedConsumptions(feedConsumptionsResult);
          setMortalities(mortalitiesResult);
          setVaccinations(vaccinationsResult);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError(
            getApiErrorMessage(
              fetchError,
              "Unable to load daily farm activities."
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

  const branchById = useMemo(
    () =>
      new Map(
        branches.map((branch) => [branch.id, branch] as const)
      ),
    [branches]
  );

  const houseById = useMemo(
    () => new Map(houses.map((house) => [house.id, house] as const)),
    [houses]
  );

  const batchById = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch] as const)),
    [batches]
  );

  const filterHouses = useMemo(
    () =>
      filters.branch
        ? houses.filter((house) => house.branch === filters.branch)
        : houses,
    [filters.branch, houses]
  );

  const filterBatches = useMemo(() => {
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
      return batches.filter((batch) => batch.house === filters.house);
    }

    return batches;
  }, [batches, filters.branch, filters.house]);

  const buildActivities = useMemo(() => {
    const activities: ActivityItem[] = [];

    eggCollections.forEach((record) => {
      activities.push({
        id: record.id,
        key: `egg-${record.id}`,
        type: "egg_collection",
        date: record.production_date,
        timestamp: record.created_at,
        branchId: record.branch,
        branchName: record.branch_name,
        houseId: record.house,
        houseName: record.house_name,
        batchId: record.batch,
        batchNumber: record.batch_number,
        summary: `${formatNumber(record.total_eggs)} eggs`,
        recordedBy:
          record.created_by_name || record.created_by_email || "—",
        raw: record,
      });
    });

    feedConsumptions.forEach((record) => {
      activities.push({
        id: record.id,
        key: `feed-${record.id}`,
        type: "feed_consumption",
        date: record.consumption_date,
        timestamp: record.created_at,
        branchId: record.branch,
        branchName: record.branch_name,
        houseId: record.house,
        houseName: record.house_name,
        batchId: record.batch,
        batchNumber: record.batch_number,
        summary: `${formatNumber(record.quantity)} kg`,
        recordedBy: record.created_by_name || "—",
        raw: record,
      });
    });

    mortalities.forEach((record) => {
      activities.push({
        id: record.id,
        key: `mortality-${record.id}`,
        type: "mortality",
        date: record.date,
        timestamp: record.created_at,
        branchId: record.branch,
        branchName: record.branch_name,
        houseId: record.house,
        houseName: record.house_name,
        batchId: record.batch,
        batchNumber: record.batch_number,
        summary: `${formatNumber(record.quantity)} birds`,
        recordedBy: "—",
        raw: record,
      });
    });

    vaccinations.forEach((record) => {
      const batch = batchById.get(record.batch);
      const house = batch?.house ? houseById.get(batch.house) : null;
      const branch = batch?.branch
        ? branchById.get(batch.branch)
        : null;

      activities.push({
        id: record.id,
        key: `vaccination-${record.id}`,
        type: "vaccination",
        date: record.date_administered,
        timestamp: record.created_at,
        branchId: branch?.id || "",
        branchName: branch?.name || "—",
        houseId: house?.id || "",
        houseName: house?.name || "—",
        batchId: record.batch,
        batchNumber: record.batch_number,
        summary: record.vaccine_name || "Vaccination",
        recordedBy: "—",
        raw: record,
      });
    });

    return activities;
  }, [
    batchById,
    branchById,
    eggCollections,
    feedConsumptions,
    houseById,
    mortalities,
    vaccinations,
  ]);

  const filteredActivities = useMemo(
    () =>
      buildActivities
        .filter((activity) => {
          if (filters.date && activity.date !== filters.date) {
            return false;
          }

          if (filters.branch && activity.branchId !== filters.branch) {
            return false;
          }

          if (filters.house && activity.houseId !== filters.house) {
            return false;
          }

          if (filters.batch && activity.batchId !== filters.batch) {
            return false;
          }

          return true;
        })
        .sort((a, b) => {
          const left = new Date(a.timestamp || a.date).getTime();
          const right = new Date(b.timestamp || b.date).getTime();

          return right - left;
        }),
    [
      buildActivities,
      filters.batch,
      filters.branch,
      filters.date,
      filters.house,
    ]
  );

  const eggsCollectedToday = useMemo(
    () =>
      filteredActivities
        .filter((item) => item.type === "egg_collection")
        .reduce((sum, item) => {
          const raw = item.raw as EggProduction;
          return sum + Number(raw.total_eggs || 0);
        }, 0),
    [filteredActivities]
  );

  const feedUsedToday = useMemo(
    () =>
      filteredActivities
        .filter((item) => item.type === "feed_consumption")
        .reduce((sum, item) => {
          const raw = item.raw as FeedConsumption;
          return sum + Number(raw.quantity || 0);
        }, 0),
    [filteredActivities]
  );

  const mortalityToday = useMemo(
    () =>
      filteredActivities
        .filter((item) => item.type === "mortality")
        .reduce((sum, item) => {
          const raw = item.raw as MortalityRecord;
          return sum + Number(raw.quantity || 0);
        }, 0),
    [filteredActivities]
  );

  const vaccinationsToday = useMemo(
    () =>
      filteredActivities.filter(
        (item) => item.type === "vaccination"
      ).length,
    [filteredActivities]
  );

  const eggFormHouses = useMemo(
    () =>
      eggFormData.branch
        ? houses.filter((house) => house.branch === eggFormData.branch)
        : [],
    [eggFormData.branch, houses]
  );

  const eggFormBatches = useMemo(
    () =>
      eggFormData.branch && eggFormData.house
        ? batches.filter(
            (batch) =>
              batch.branch === eggFormData.branch &&
              batch.house === eggFormData.house
          )
        : [],
    [batches, eggFormData.branch, eggFormData.house]
  );

  const mortalityFormHouses = useMemo(
    () =>
      mortalityFormData.branch
        ? houses.filter(
            (house) => house.branch === mortalityFormData.branch
          )
        : [],
    [houses, mortalityFormData.branch]
  );

  const mortalityFormBatches = useMemo(
    () =>
      mortalityFormData.branch && mortalityFormData.house
        ? batches.filter(
            (batch) =>
              batch.branch === mortalityFormData.branch &&
              batch.house === mortalityFormData.house
          )
        : [],
    [batches, mortalityFormData.branch, mortalityFormData.house]
  );

  const feedFormHouses = useMemo(
    () =>
      feedFormData.branch
        ? houses.filter((house) => house.branch === feedFormData.branch)
        : [],
    [feedFormData.branch, houses]
  );

  const feedFormBatches = useMemo(
    () =>
      feedFormData.branch && feedFormData.house
        ? batches.filter(
            (batch) =>
              batch.branch === feedFormData.branch &&
              batch.house === feedFormData.house
          )
        : [],
    [batches, feedFormData.branch, feedFormData.house]
  );

  const vaccinationFormHouses = useMemo(
    () =>
      vaccinationFormData.branch
        ? houses.filter(
            (house) => house.branch === vaccinationFormData.branch
          )
        : [],
    [houses, vaccinationFormData.branch]
  );

  const vaccinationFormBatches = useMemo(
    () =>
      vaccinationFormData.branch && vaccinationFormData.house
        ? batches.filter(
            (batch) =>
              batch.branch === vaccinationFormData.branch &&
              batch.house === vaccinationFormData.house
          )
        : [],
    [batches, vaccinationFormData.branch, vaccinationFormData.house]
  );

  const openDetails = (activity: ActivityItem) => {
    setSelectedActivity(activity);
    setDetailsDialogOpen(true);
  };

  const closeAllForms = () => {
    setEggDialogOpen(false);
    setFeedDialogOpen(false);
    setMortalityDialogOpen(false);
    setVaccinationDialogOpen(false);
    setEggFormData(buildEmptyEggForm());
    setFeedFormData(buildEmptyFeedForm());
    setMortalityFormData(buildEmptyMortalityForm());
    setVaccinationFormData(buildEmptyVaccinationForm());
    setFormError(null);
  };

  const saveEggCollection = async () => {
    if (
      !eggFormData.branch ||
      !eggFormData.house ||
      !eggFormData.batch ||
      !eggFormData.production_date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const total =
      eggFormData.large_eggs +
      eggFormData.medium_eggs +
      eggFormData.small_eggs +
      eggFormData.pullet_eggs +
      eggFormData.unsorted_eggs;

    if (total <= 0) {
      setFormError("At least one egg quantity must be greater than zero.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const created = await createEggProduction(eggFormData);
      setEggCollections((prev) => [created, ...prev]);
      closeAllForms();
      setRecordDialogOpen(false);
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(saveError, "Failed to save egg collection.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveFeedConsumption = async () => {
    if (
      !feedFormData.batch ||
      !feedFormData.consumption_date ||
      !feedFormData.quantity
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (feedFormData.quantity <= 0) {
      setFormError("Feed quantity must be greater than zero.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload: CreateFeedConsumptionInput = {
        branch: feedFormData.branch,
        house: feedFormData.house,
        batch: feedFormData.batch,
        feed_type: feedFormData.feed_type || "",
        quantity: feedFormData.quantity,
        consumption_date: feedFormData.consumption_date,
      };

      const created = await createFeedConsumption(payload);
      setFeedConsumptions((prev) => [created, ...prev]);
      closeAllForms();
      setRecordDialogOpen(false);
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(saveError, "Failed to save feed consumption.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveMortality = async () => {
    if (
      !mortalityFormData.branch ||
      !mortalityFormData.house ||
      !mortalityFormData.batch ||
      !mortalityFormData.date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (mortalityFormData.quantity <= 0) {
      setFormError("Mortality quantity must be greater than zero.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const created = await createMortality(mortalityFormData);
      setMortalities((prev) => [created, ...prev]);
      closeAllForms();
      setRecordDialogOpen(false);
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(saveError, "Failed to save mortality.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saveVaccination = async () => {
    if (
      !vaccinationFormData.batch ||
      !vaccinationFormData.vaccine ||
      !vaccinationFormData.date_administered
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload: CreateVaccinationRecordInput = {
        batch: vaccinationFormData.batch,
        vaccine: vaccinationFormData.vaccine,
        date_administered: vaccinationFormData.date_administered,
        quantity_used:
          vaccinationFormData.quantity_used === null
            ? null
            : Number(vaccinationFormData.quantity_used),
        route: vaccinationFormData.route,
        notes: vaccinationFormData.notes,
      };

      const created = await createVaccinationRecord(payload);
      setVaccinations((prev) => [created, ...prev]);
      closeAllForms();
      setRecordDialogOpen(false);
    } catch (saveError) {
      setFormError(
        getApiErrorMessage(saveError, "Failed to save vaccination.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFilterBatch = useMemo(
    () =>
      batches.find((batch) => batch.id === filters.batch) || null,
    [batches, filters.batch]
  );

  return (
    <Stack sx={{ spacing: 3 }}>
      <PageHeader
        title="Daily Activities"
        subtitle="View and record daily farm operations by date and location."
        action={{
          label: "Record Activity",
          onClick: () => {
            setRecordDialogOpen(true);
            setFormError(null);
          },
          disabled:
            !activeTenantId ||
            (!canCreateEggCollection &&
              !canCreateFeedConsumption &&
              !canCreateMortality &&
              !canCreateVaccination),
        }}
      >
        <Paper sx={{ p: 2, border: "1px solid #E5EAF2" }}>
          <Stack sx={{ gap: 2 }}>
            <Stack
              sx={{
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "center" },
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Filters
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Filter daily activities by date, branch, house, and
                  batch.
                </Typography>
              </Box>
              <Button
                variant="text"
                onClick={() =>
                  setFilters({
                    date: getToday(),
                    branch: "",
                    house: "",
                    batch: "",
                  })
                }
              >
                Reset filters
              </Button>
            </Stack>

            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(4, minmax(0, 1fr))",
                },
              }}
            >
              <TextField
                label="Date"
                type="date"
                value={filters.date}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
                fullWidth
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Branch"
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
                label="House"
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
                {filterHouses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Batch"
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
                {filterBatches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.batch_number}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {selectedFilterBatch ? (
              <Alert severity="info" sx={{ py: 0 }}>
                Showing activities for batch{" "}
                <strong>{selectedFilterBatch.batch_number}</strong>
                {selectedFilterBatch.house_name
                  ? ` in ${selectedFilterBatch.house_name}`
                  : ""}
                .
              </Alert>
            ) : null}
          </Stack>
        </Paper>
      </PageHeader>

      {!activeTenantId ? (
        <Alert severity="info">
          Select an organization from the header to load
          tenant-specific daily activities.
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

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
          label="Eggs Collected"
          value={formatNumber(eggsCollectedToday)}
        />
        <MetricCard
          label="Feed Used (kg)"
          value={formatNumber(feedUsedToday)}
        />
        <MetricCard
          label="Mortality"
          value={formatNumber(mortalityToday)}
        />
        <MetricCard
          label="Vaccination Records"
          value={formatNumber(vaccinationsToday)}
        />
      </Box>

      <TableContainer component={Paper} sx={{ border: "1px solid #E5EAF2" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F5F7FA" }}>
              <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Activity</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>House</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Summary</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Recorded By</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableSkeletonLoader columns={8} rows={8} />
            ) : filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 0 }}>
                  <EmptyState
                    title="No activities recorded"
                    message="There are no farm activities for the selected date and location."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((activity) => (
                <TableRow key={activity.key} hover>
                  <TableCell>{formatTime(activity.timestamp)}</TableCell>
                  <TableCell>
                    {activity.type === "egg_collection"
                      ? "Egg Collection"
                      : activity.type === "feed_consumption"
                        ? "Feed Consumption"
                        : activity.type === "mortality"
                          ? "Mortality"
                          : "Vaccination"}
                  </TableCell>
                  <TableCell>{activity.branchName}</TableCell>
                  <TableCell>{activity.houseName}</TableCell>
                  <TableCell>{activity.batchNumber}</TableCell>
                  <TableCell>{activity.summary}</TableCell>
                  <TableCell>{activity.recordedBy}</TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => openDetails(activity)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={recordDialogOpen}
        onClose={() => setRecordDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Activity</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 1.5, pt: 1 }}>
            {canCreateEggCollection ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setEggDialogOpen(true);
                  setRecordDialogOpen(false);
                }}
              >
                Egg Collection
              </Button>
            ) : null}
            {canCreateFeedConsumption ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setFeedDialogOpen(true);
                  setRecordDialogOpen(false);
                }}
              >
                Feed Consumption
              </Button>
            ) : null}
            {canCreateMortality ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setMortalityDialogOpen(true);
                  setRecordDialogOpen(false);
                }}
              >
                Mortality
              </Button>
            ) : null}
            {canCreateVaccination ? (
              <Button
                variant="outlined"
                onClick={() => {
                  setVaccinationDialogOpen(true);
                  setRecordDialogOpen(false);
                }}
              >
                Vaccination
              </Button>
            ) : null}
            {!canCreateEggCollection &&
            !canCreateFeedConsumption &&
            !canCreateMortality &&
            !canCreateVaccination ? (
              <Alert severity="info">
                You do not have permission to record farm activities.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={eggDialogOpen}
        onClose={closeAllForms}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Record Egg Collection</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              <TextField
                label="Branch"
                select
                value={eggFormData.branch}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    branch: event.target.value,
                    house: "",
                    batch: "",
                  }))
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Select branch</MenuItem>
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="House"
                select
                value={eggFormData.house}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    house: event.target.value,
                    batch: "",
                  }))
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Select house</MenuItem>
                {eggFormHouses.map((house) => (
                  <MenuItem key={house.id} value={house.id}>
                    {house.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Batch"
                select
                value={eggFormData.batch}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    batch: event.target.value,
                  }))
                }
                size="small"
                fullWidth
              >
                <MenuItem value="">Select batch</MenuItem>
                {eggFormBatches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.batch_number}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Collection Date"
                type="date"
                value={eggFormData.production_date}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    production_date: event.target.value,
                  }))
                }
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Large Eggs"
                type="number"
                value={eggFormData.large_eggs}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    large_eggs: Number(event.target.value),
                  }))
                }
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label="Medium Eggs"
                type="number"
                value={eggFormData.medium_eggs}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    medium_eggs: Number(event.target.value),
                  }))
                }
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label="Small Eggs"
                type="number"
                value={eggFormData.small_eggs}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    small_eggs: Number(event.target.value),
                  }))
                }
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label="Pullet Eggs"
                type="number"
                value={eggFormData.pullet_eggs}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    pullet_eggs: Number(event.target.value),
                  }))
                }
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label="Unsorted Eggs"
                type="number"
                value={eggFormData.unsorted_eggs}
                onChange={(event) =>
                  setEggFormData((prev) => ({
                    ...prev,
                    unsorted_eggs: Number(event.target.value),
                  }))
                }
                size="small"
                fullWidth
                slotProps={{ htmlInput: { min: 0 } }}
              />
            </Box>
            <TextField
              label="Notes"
              value={eggFormData.notes || ""}
              onChange={(event) =>
                setEggFormData((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAllForms} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveEggCollection} disabled={isSaving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={feedDialogOpen}
        onClose={closeAllForms}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Feed Consumption</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label="Branch"
              select
              value={feedFormData.branch}
              onChange={(event) =>
                setFeedFormData((prev) => ({
                  ...prev,
                  branch: event.target.value,
                  house: "",
                  batch: "",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select branch</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="House"
              select
              value={feedFormData.house}
              onChange={(event) =>
                setFeedFormData((prev) => ({
                  ...prev,
                  house: event.target.value,
                  batch: "",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select house</MenuItem>
              {feedFormHouses.map((house) => (
                <MenuItem key={house.id} value={house.id}>
                  {house.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Batch"
              select
              value={feedFormData.batch}
              onChange={(event) =>
                setFeedFormData((prev) => ({
                  ...prev,
                  batch: event.target.value,
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select batch</MenuItem>
              {feedFormBatches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Feed Type"
              select
              value={feedFormData.feed_type || ""}
              onChange={(event) =>
                setFeedFormData((prev) => ({
                  ...prev,
                  feed_type: event.target.value,
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select feed type</MenuItem>
              {feedTypes.map((feedType) => (
                <MenuItem key={feedType.id} value={feedType.id}>
                  {feedType.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Quantity (kg)"
              type="number"
              value={feedFormData.quantity}
              onChange={(event) =>
                setFeedFormData((prev) => ({
                  ...prev,
                  quantity: Number(event.target.value),
                }))
              }
              size="small"
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Date"
              type="date"
              value={feedFormData.consumption_date}
              onChange={(event) =>
                setFeedFormData((prev) => ({
                  ...prev,
                  consumption_date: event.target.value,
                }))
              }
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAllForms} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveFeedConsumption} disabled={isSaving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={mortalityDialogOpen}
        onClose={closeAllForms}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Mortality</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label="Branch"
              select
              value={mortalityFormData.branch}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  branch: event.target.value,
                  house: "",
                  batch: "",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select branch</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="House"
              select
              value={mortalityFormData.house}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  house: event.target.value,
                  batch: "",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select house</MenuItem>
              {mortalityFormHouses.map((house) => (
                <MenuItem key={house.id} value={house.id}>
                  {house.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Batch"
              select
              value={mortalityFormData.batch}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  batch: event.target.value,
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select batch</MenuItem>
              {mortalityFormBatches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Date"
              type="date"
              value={mortalityFormData.date}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  date: event.target.value,
                }))
              }
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Quantity"
              type="number"
              value={mortalityFormData.quantity}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  quantity: Number(event.target.value),
                }))
              }
              size="small"
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Cause"
              select
              value={mortalityFormData.cause}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  cause: event.target.value as MortalityCause,
                }))
              }
              size="small"
              fullWidth
            >
              {MORTALITY_CAUSES.map((cause) => (
                <MenuItem key={cause.value} value={cause.value}>
                  {cause.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              value={mortalityFormData.notes || ""}
              onChange={(event) =>
                setMortalityFormData((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAllForms} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveMortality} disabled={isSaving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={vaccinationDialogOpen}
        onClose={closeAllForms}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Record Vaccination</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField
              label="Branch"
              select
              value={vaccinationFormData.branch}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  branch: event.target.value,
                  house: "",
                  batch: "",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select branch</MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="House"
              select
              value={vaccinationFormData.house}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  house: event.target.value,
                  batch: "",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select house</MenuItem>
              {vaccinationFormHouses.map((house) => (
                <MenuItem key={house.id} value={house.id}>
                  {house.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Batch"
              select
              value={vaccinationFormData.batch}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  batch: event.target.value,
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select batch</MenuItem>
              {vaccinationFormBatches.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.batch_number}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Vaccine"
              select
              value={vaccinationFormData.vaccine}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  vaccine: event.target.value,
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="">Select vaccine</MenuItem>
              {vaccines.map((vaccine) => (
                <MenuItem key={vaccine.id} value={vaccine.id}>
                  {vaccine.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Date Administered"
              type="date"
              value={vaccinationFormData.date_administered}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  date_administered: event.target.value,
                }))
              }
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Quantity Used (optional)"
              type="number"
              value={vaccinationFormData.quantity_used ?? ""}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  quantity_used: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
              size="small"
              fullWidth
              slotProps={{ htmlInput: { min: 0 } }}
            />
            <TextField
              label="Route"
              select
              value={vaccinationFormData.route || "water"}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  route: event.target.value as VaccinationRoute,
                }))
              }
              size="small"
              fullWidth
            >
              {VACCINATION_ROUTES.map((route) => (
                <MenuItem key={route.value} value={route.value}>
                  {route.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              value={vaccinationFormData.notes || ""}
              onChange={(event) =>
                setVaccinationFormData((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAllForms} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveVaccination} disabled={isSaving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Activity Details</DialogTitle>
        <DialogContent>
          {selectedActivity ? (
            <Stack sx={{ gap: 1.25, pt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {selectedActivity.type === "egg_collection"
                  ? "Egg Collection"
                  : selectedActivity.type === "feed_consumption"
                    ? "Feed Consumption"
                    : selectedActivity.type === "mortality"
                      ? "Mortality"
                      : "Vaccination"}
              </Typography>

              <Typography>
                <strong>Date:</strong> {formatDate(selectedActivity.date)}
              </Typography>
              <Typography>
                <strong>Branch:</strong> {selectedActivity.branchName}
              </Typography>
              <Typography>
                <strong>House:</strong> {selectedActivity.houseName}
              </Typography>
              <Typography>
                <strong>Batch:</strong> {selectedActivity.batchNumber}
              </Typography>

              {selectedActivity.type === "egg_collection" ? (
                <>
                  <Typography>
                    <strong>Large Eggs:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as EggProduction).large_eggs
                    )}
                  </Typography>
                  <Typography>
                    <strong>Medium Eggs:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as EggProduction).medium_eggs
                    )}
                  </Typography>
                  <Typography>
                    <strong>Small Eggs:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as EggProduction).small_eggs
                    )}
                  </Typography>
                  <Typography>
                    <strong>Pullet Eggs:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as EggProduction).pullet_eggs
                    )}
                  </Typography>
                  <Typography>
                    <strong>Unsorted Eggs:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as EggProduction)
                        .unsorted_eggs
                    )}
                  </Typography>
                  <Typography>
                    <strong>Total Eggs:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as EggProduction).total_eggs
                    )}
                  </Typography>
                </>
              ) : null}

              {selectedActivity.type === "feed_consumption" ? (
                <>
                  <Typography>
                    <strong>Feed Type:</strong>{" "}
                    {(selectedActivity.raw as FeedConsumption)
                      .feed_type_name || "—"}
                  </Typography>
                  <Typography>
                    <strong>Quantity:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as FeedConsumption).quantity
                    )}{" "}
                    kg
                  </Typography>
                </>
              ) : null}

              {selectedActivity.type === "mortality" ? (
                <>
                  <Typography>
                    <strong>Quantity:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as MortalityRecord).quantity
                    )}
                  </Typography>
                  <Typography>
                    <strong>Cause:</strong>{" "}
                    {(selectedActivity.raw as MortalityRecord).cause}
                  </Typography>
                  <Typography>
                    <strong>Notes:</strong>{" "}
                    {(selectedActivity.raw as MortalityRecord).notes ||
                      "—"}
                  </Typography>
                </>
              ) : null}

              {selectedActivity.type === "vaccination" ? (
                <>
                  <Typography>
                    <strong>Vaccine:</strong>{" "}
                    {(selectedActivity.raw as VaccinationRecord)
                      .vaccine_name || "—"}
                  </Typography>
                  <Typography>
                    <strong>Route:</strong>{" "}
                    {(selectedActivity.raw as VaccinationRecord).route}
                  </Typography>
                  <Typography>
                    <strong>Quantity Used:</strong>{" "}
                    {formatNumber(
                      (selectedActivity.raw as VaccinationRecord)
                        .quantity_used
                    )}
                  </Typography>
                  <Typography>
                    <strong>Notes:</strong>{" "}
                    {(selectedActivity.raw as VaccinationRecord).notes ||
                      "—"}
                  </Typography>
                </>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
