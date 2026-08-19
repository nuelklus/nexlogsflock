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
  { label: "Staff", href: "/staff" },
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

const financeParentItem: NavigationItem = { label: "Finance", href: "/finance" };

const financeItems: NavigationItem[] = [
  { label: "Customers", href: "/customers" },
  { label: "Invoices", href: "/invoices" },
  { label: "Expenses", href: "/expenses" },
  { label: "Suppliers", href: "/suppliers" },
];

const ownerRoleName = "Owner";

const hasPermission = (permissions: string[] = [], module: string, action: string) =>
  permissions.some((entry) => entry === `${module}.${action}` || entry === `${module}.all`);

const routeLabelMap = new Map(
  [
    ...primaryNavigationItems,
    ...farmManagementItems,
    ...livestockItems,
    ...productionItems,
    financeParentItem,
    ...financeItems,
  ].map((item) => [item.href, item.label] as const)
);

const isFarmManagementPath = (pathname: string) =>
  farmManagementItems.some((item) => item.href === pathname);
const isLivestockPath = (pathname: string) =>
  livestockItems.some((item) => item.href === pathname);
const isProductionPath = (pathname: string) =>
  productionItems.some((item) => item.href === pathname);
const isFinancePath = (pathname: string) =>
  pathname === financeParentItem.href || financeItems.some((item) => item.href === pathname);

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
  livestockItems: NavigationItem[];
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
  livestockItems,
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
          fontWeight: 800,
          letterSpacing: "0.12em",
          fontSize: "0.68rem",
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
            py: 0.9,
            borderRadius: 2,
            color: pathname === item.href ? "primary.main" : "text.primary",
            "&.Mui-selected": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
              color: "primary.main",
              boxShadow: "inset 0 0 0 1px rgba(30,136,229,0.08)",
            },
            "&:hover": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          <ListItemText primary={item.label} sx={{ ml: 1, '& .MuiTypography-root': { fontWeight: pathname === item.href ? 700 : 500 } }} />
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
              fontWeight: 800,
              letterSpacing: "0.12em",
              fontSize: "0.68rem",
            }}
          >
            Farm Management
          </Typography>
          <ListItemButton
            onClick={onToggleFarmManagement}
            selected={farmManagementActive}
            sx={{
              px: 1.5,
              py: 0.9,
              borderRadius: 2,
              color: farmManagementActive ? "primary.main" : "text.primary",
              "&.Mui-selected": {
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
              },
              "&:hover": {
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
              <AgricultureIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Farm Management" sx={{ '& .MuiTypography-root': { fontWeight: farmManagementActive ? 700 : 500 } }} />
            {isFarmManagementExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>

          <Collapse in={isFarmManagementExpanded} timeout="auto" unmountOnExit>
            <List disablePadding sx={{ pl: 2 }}>
              {farmManagementItems.map((item) => (
                <ListItemButton
                  key={item.href}
                  selected={pathname === item.href}
                  onClick={() => onNavigate(item.href)}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    "&.Mui-selected": {
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                      color: "primary.main",
                    },
                  }}
                >
                  <ListItemText primary={item.label} sx={{ ml: 0.5, '& .MuiTypography-root': { fontWeight: pathname === item.href ? 700 : 500 } }} />
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
          fontWeight: 800,
          letterSpacing: "0.12em",
          fontSize: "0.68rem",
        }}
      >
        Production
      </Typography>

      <ListItemButton
        onClick={onToggleLivestock}
        selected={livestockActive}
        sx={{
          px: 1.5,
          py: 0.9,
          borderRadius: 2,
          color: livestockActive ? "primary.main" : "text.primary",
          "&.Mui-selected": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            color: "primary.main",
          },
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <PetsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Livestock" sx={{ '& .MuiTypography-root': { fontWeight: livestockActive ? 700 : 500 } }} />
        {isLivestockExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={isLivestockExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {livestockItems.map((item) => (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => onNavigate(item.href)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                "&.Mui-selected": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                },
              }}
            >
              <ListItemText primary={item.label} sx={{ ml: 0.5, '& .MuiTypography-root': { fontWeight: pathname === item.href ? 700 : 500 } }} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>

      <ListItemButton
        onClick={onToggleProduction}
        selected={productionActive}
        sx={{
          px: 1.5,
          py: 0.9,
          borderRadius: 2,
          color: productionActive ? "primary.main" : "text.primary",
          "&.Mui-selected": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            color: "primary.main",
          },
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <EggAltIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Production" sx={{ '& .MuiTypography-root': { fontWeight: productionActive ? 700 : 500 } }} />
        {isProductionExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>
      <Collapse in={isProductionExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {productionItems.map((item) => (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => onNavigate(item.href)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                "&.Mui-selected": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                },
              }}
            >
              <ListItemText primary={item.label} sx={{ ml: 0.5, '& .MuiTypography-root': { fontWeight: pathname === item.href ? 700 : 500 } }} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>

      <ListItemButton
        onClick={() => {
          onNavigate(financeParentItem.href);
          onToggleFinance();
        }}
        selected={isFinancePath(pathname)}
        sx={{
          px: 1.5,
          py: 0.9,
          borderRadius: 2,
          color: isFinancePath(pathname) ? "primary.main" : "text.primary",
          "&.Mui-selected": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            color: "primary.main",
          },
          "&:hover": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
          <ReceiptLongIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Finance" sx={{ '& .MuiTypography-root': { fontWeight: isFinancePath(pathname) ? 700 : 500 } }} />
        {isFinanceExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </ListItemButton>

      <Collapse in={isFinanceExpanded} timeout="auto" unmountOnExit>
        <List disablePadding sx={{ pl: 2 }}>
          {financeItems.map((item) => (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => onNavigate(item.href)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                "&.Mui-selected": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                },
              }}
            >
              <ListItemText primary={item.label} sx={{ ml: 0.5, '& .MuiTypography-root': { fontWeight: pathname === item.href ? 700 : 500 } }} />
            </ListItemButton>
          ))}
        </List>
      </Collapse>

      <Divider sx={{ my: 1.5 }} />

      <ListItemButton
        onClick={onLogout}
        sx={{
          px: 1.5,
          py: 0.9,
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
        <ListItemText primary="Logout" sx={{ '& .MuiTypography-root': { fontWeight: 600 } }} />
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

  const visibleLivestockItems = useMemo(() => {
    const permissions = activeTenant?.permissions ?? [];
    const canViewPurchases = hasPermission(permissions, "purchases", "view") || hasPermission(permissions, "purchases", "create");

    return livestockItems.filter((item) => {
      if (item.href === "/purchases" || item.href === "/feed-purchases") {
        return canViewPurchases;
      }

      return true;
    });
  }, [activeTenant?.permissions]);

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
  const currentUserName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "User";
  const currentUserRole = activeTenant?.role?.name || "Account";

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const drawerContent = (
    <Stack sx={{ px: 1.5, py: 1.5, gap: 1.5 }}>
      <Stack direction="row" spacing={1.5} sx={{ px: 1.5, py: 0.75, alignItems: "center" }}>
        {activeTenant?.logo ? (
          <Box
            component="img"
            src={activeTenant.logo}
            alt={activeTenantName}
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              objectFit: "cover",
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              boxShadow: "0 10px 20px rgba(30, 136, 229, 0.12)",
            }}
          />
        ) : (
          <Box
            sx={{
              width: 38,
              height: 38,
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
            {activeTenantName.charAt(0)?.toUpperCase() || "N"}
          </Box>
        )}
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            NexlogsFlock
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeTenantName}
          </Typography>
        </Stack>
      </Stack>

      <Divider />

      <NavigationList
        pathname={pathname}
        livestockItems={visibleLivestockItems}
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

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              component="span"
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #1E88E5 0%, #BA68C8 100%)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              {activeTenantName.charAt(0)?.toUpperCase() || "N"}
            </Box>
            <Select
              size="small"
              displayEmpty
              value={activeTenantId || ""}
              sx={{
                minWidth: { xs: 120, md: 200 },
                maxWidth: { xs: 170, md: 220 },
                backgroundColor: "transparent",
                borderRadius: 1.5,
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                "& .MuiSelect-select": { py: 1, fontSize: { xs: "0.75rem", md: "0.875rem" }, fontWeight: 600 },
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
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ ml: 0.5, alignItems: "center", px: 0.5, py: 0.25, borderRadius: 2, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider" }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                background: "linear-gradient(135deg, #1E88E5 0%, #BA68C8 100%)",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: 12,
                boxShadow: "0 10px 20px rgba(30, 136, 229, 0.18)",
              }}
            >
              {initials}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                {currentUserName}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                {currentUserRole}
              </Typography>
            </Stack>
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
