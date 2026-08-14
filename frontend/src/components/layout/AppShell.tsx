"use client";

import AgricultureIcon from "@mui/icons-material/Agriculture";
import EggAltIcon from "@mui/icons-material/EggAlt";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import PetsIcon from "@mui/icons-material/Pets";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/auth/context/AuthContext";

const drawerWidth = 260;

interface NavigationItem {
  label: string;
  href: string;
}

const primaryNavigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Daily Activities", href: "/daily-activities" },
];

const farmManagementItems: NavigationItem[] = [
  { label: "Branches", href: "/branches" },
  { label: "Houses", href: "/houses" },
  { label: "Batches", href: "/batches" },
  { label: "Breeds", href: "/breeds" },
];

const livestockItems: NavigationItem[] = [
  { label: "Mortalities", href: "/mortalities" },
  { label: "Bird Purchases", href: "/purchases" },
  { label: "Feed Purchases", href: "/feed-purchases" },
  { label: "Feed Inventory", href: "/feed-inventory" },
  { label: "Feed Consumption", href: "/feed-consumption" },
];

const productionItems: NavigationItem[] = [
  { label: "Egg Collection", href: "/egg-collection" },
  { label: "Egg Inventory", href: "/egg-inventory" },
];

const financeItems: NavigationItem[] = [
  { label: "Customers", href: "/customers" },
  { label: "Invoices", href: "/invoices" },
];

const ownerRoleName = "Owner";

const routeLabelMap = new Map(
  [...primaryNavigationItems, ...farmManagementItems, ...livestockItems, ...productionItems, ...financeItems].map(
    (item) => [item.href, item.label] as const
  )
);

const isFarmManagementPath = (pathname: string) =>
  farmManagementItems.some((item) => item.href === pathname);
const isLivestockPath = (pathname: string) =>
  livestockItems.some((item) => item.href === pathname);
const isProductionPath = (pathname: string) =>
  productionItems.some((item) => item.href === pathname);
const isFinancePath = (pathname: string) =>
  financeItems.some((item) => item.href === pathname);

const navigateToItem = (
  href: string,
  router: ReturnType<typeof useRouter>,
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  router.push(href);
  setMobileOpen(false);
};

interface NavigationListProps {
  pathname: string;
  isFarmManagementVisible: boolean;
  isFarmManagementExpanded: boolean;
  isLivestockExpanded: boolean;
  isProductionExpanded: boolean;
  isFinanceExpanded: boolean;
  onToggleFarmManagement: () => void;
  onToggleLivestock: () => void;
  onToggleProduction: () => void;
  onToggleFinance: () => void;
  onNavigate: (href: string) => void;
  onLogout: () => Promise<void>;
}

function NavigationList({
  pathname,
  isFarmManagementVisible,
  isFarmManagementExpanded,
  isLivestockExpanded,
  isProductionExpanded,
  isFinanceExpanded,
  onToggleFarmManagement,
  onToggleLivestock,
  onToggleProduction,
  onToggleFinance,
  onNavigate,
  onLogout,
}: NavigationListProps) {
  const farmManagementActive = isFarmManagementPath(pathname);
  const livestockActive = isLivestockPath(pathname);
  const productionActive = isProductionPath(pathname);

  return (
    <List disablePadding sx={{ px: 1, pb: 1 }}>
      <Typography
        variant="overline"
        sx={{
          display: "block",
          px: 2,
          py: 1.25,
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: "0.12em",
        }}
      >
        Overview
      </Typography>

      {primaryNavigationItems.map((item) => (
        <ListItemButton
          key={item.href}
          selected={pathname === item.href}
          onClick={() => onNavigate(item.href)}
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            "&.Mui-selected": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
              color: "primary.main",
            },
          }}
        >
          <ListItemText primary={item.label} sx={{ ml: 1 }} />
        </ListItemButton>
      ))}

      {isFarmManagementVisible ? (
        <>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              px: 2,
              py: 1.25,
              color: "text.secondary",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            Farm Management
          </Typography>
          <ListItemButton
            onClick={onToggleFarmManagement}
            selected={farmManagementActive}
            sx={{ px: 1.5, py: 1, borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
              <AgricultureIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Farm Management" />
            {isFarmManagementExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={isFarmManagementExpanded} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ pl: 2 }}>
              {farmManagementItems.map((item) => (
                <ListItemButton
                  key={item.href}
                  selected={pathname === item.href}
                  onClick={() => onNavigate(item.href)}
                  sx={{ px: 1.5, py: 0.8, borderRadius: 2 }}
                >
                  <ListItemText primary={item.label} sx={{ ml: 0.5 }} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </>
      ) : null}

      <Typography
        variant="overline"
        sx={{
          display: "block",
          px: 2,
          py: 1.25,
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: "0.12em",
        }}
      >
        Production
      </Typography>

      <ListItemButton
        onClick={onToggleLivestock}
        selected={livestockActive}
        sx={{ px: 1.5, py: 1, borderRadius: 2 }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <PetsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Livestock" />
        {isLivestockExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={isLivestockExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {livestockItems.map((item) => (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => onNavigate(item.href)}
              sx={{ px: 1.5, py: 0.8, borderRadius: 2 }}
            >
              <ListItemText primary={item.label} sx={{ ml: 0.5 }} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>

      <ListItemButton
        onClick={onToggleProduction}
        selected={productionActive}
        sx={{ px: 1.5, py: 1, borderRadius: 2 }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <EggAltIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Production" />
        {isProductionExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={isProductionExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {productionItems.map((item) => (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => onNavigate(item.href)}
              sx={{ px: 1.5, py: 0.8, borderRadius: 2 }}
            >
              <ListItemText primary={item.label} sx={{ ml: 0.5 }} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>

      <ListItemButton
        onClick={onToggleFinance}
        selected={isFinancePath(pathname)}
        sx={{ px: 1.5, py: 1, borderRadius: 2 }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <ReceiptLongIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Finance" />
        {isFinanceExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>

      <Collapse in={isFinanceExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {financeItems.map((item) => (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => onNavigate(item.href)}
              sx={{ px: 1.5, py: 0.8, borderRadius: 2 }}
            >
              <ListItemText primary={item.label} sx={{ ml: 0.5 }} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>

      <Divider sx={{ my: 1.5 }} />

      <ListItemButton
        onClick={onLogout}
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          color: "error.main",
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <LogoutOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>
    </List>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isFarmManagementRoute = isFarmManagementPath(pathname);
  const isLivestockRoute = isLivestockPath(pathname);
  const isProductionRoute = isProductionPath(pathname);
  const isFinanceRoute = isFinancePath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [farmManagementExpandedOverride, setFarmManagementExpandedOverride] = useState<boolean | null>(null);
  const [livestockExpandedOverride, setLivestockExpandedOverride] = useState<boolean | null>(null);
  const [productionExpandedOverride, setProductionExpandedOverride] = useState<boolean | null>(null);
  const [financeExpandedOverride, setFinanceExpandedOverride] = useState<boolean | null>(null);

  const { user, tenants, activeTenantId, setActiveTenantId, logoutUser } = useAuth();

  const activeTenant = useMemo(
    () => tenants.find((organization) => organization.id === activeTenantId) ?? null,
    [activeTenantId, tenants]
  );

  const isFarmManagementVisible = activeTenant?.role.name === ownerRoleName;
  const farmManagementExpanded = isFarmManagementVisible && (farmManagementExpandedOverride ?? isFarmManagementRoute);
  const livestockExpanded = livestockExpandedOverride ?? isLivestockRoute;
  const productionExpanded = productionExpandedOverride ?? isProductionRoute;
  const financeExpanded = financeExpandedOverride ?? isFinanceRoute;

  const activeTenantName = useMemo(
    () => activeTenant?.name || "No organization selected",
    [activeTenant]
  );

  const currentPageTitle = routeLabelMap.get(pathname) || "NexlogsFlock";
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "NF";

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const drawerContent = (
    <Stack sx={{ px: 1.5, py: 1.5, gap: 1.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ px: 1.5, py: 0.75, alignItems: "center" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            background: "linear-gradient(135deg, #1E88E5 0%, #BA68C8 100%)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 18,
            boxShadow: "0 10px 20px rgba(30, 136, 229, 0.18)",
          }}
        >
          N
        </Box>
        <Stack>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            NexlogsFlock
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {activeTenantName}
          </Typography>
        </Stack>
      </Stack>

      <Divider />

      <NavigationList
        pathname={pathname}
        isFarmManagementVisible={isFarmManagementVisible}
        isFarmManagementExpanded={farmManagementExpanded}
        isLivestockExpanded={livestockExpanded}
        isProductionExpanded={productionExpanded}
        isFinanceExpanded={financeExpanded}
        onToggleFarmManagement={() =>
          setFarmManagementExpandedOverride((prev) => {
            const currentExpanded = isFarmManagementVisible && (prev ?? isFarmManagementRoute);
            return !currentExpanded;
          })
        }
        onToggleLivestock={() => setLivestockExpandedOverride((prev) => !(prev ?? isLivestockRoute))}
        onToggleProduction={() => setProductionExpandedOverride((prev) => !(prev ?? isProductionRoute))}
        onToggleFinance={() => setFinanceExpandedOverride((prev) => !(prev ?? isFinanceRoute))}
        onNavigate={(href) => navigateToItem(href, router, setMobileOpen)}
        onLogout={handleLogout}
      />
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 62, md: 72 }, px: { xs: 2, md: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((prev) => !prev)}
            sx={{ display: { md: "none" }, color: "primary.main", p: 0.75 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.2,
                fontSize: { xs: "1rem", md: "1.25rem" },
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentPageTitle}
            </Typography>
          </Box>

          <Select
            size="small"
            displayEmpty
            value={activeTenantId || ""}
            sx={{
              minWidth: { xs: 120, md: 220 },
              maxWidth: { xs: 170, md: 240 },
              backgroundColor: "background.paper",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              "& .MuiSelect-select": { py: 1.15, fontSize: { xs: "0.75rem", md: "0.875rem" } },
            }}
            onChange={(event) => {
              const tenantId = event.target.value;
              if (tenantId) {
                setActiveTenantId(tenantId);
              }
            }}
          >
            {tenants.map((organization) => (
              <MenuItem key={organization.id} value={organization.id}>
                {organization.name}
              </MenuItem>
            ))}
          </Select>

          <Stack direction="row" spacing={1.25} sx={{ ml: 0.5, alignItems: "center" }}>
            <Chip
              label={user?.email || "Account"}
              variant="outlined"
              sx={{
                backgroundColor: "background.paper",
                borderColor: "divider",
                color: "text.primary",
                fontWeight: 600,
                maxWidth: { xs: 0, md: 220 },
                overflow: "hidden",
                display: { xs: "none", md: "inline-flex" },
                px: 0.5,
              }}
            />
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #1E88E5 0%, #BA68C8 100%)",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: 13,
                boxShadow: "0 10px 20px rgba(30, 136, 229, 0.18)",
              }}
            >
              {initials}
            </Avatar>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          mt: { xs: 8, md: 8 },
          pb: { xs: 4, md: 5 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
