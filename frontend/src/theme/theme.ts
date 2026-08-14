import { alpha, createTheme } from "@mui/material/styles";

const brandPrimary = "#1E88E5";
const brandSecondary = "#BA68C8";
const brandSlate = "#475569";
const brandMist = "#F4F7FB";
const brandBorder = "#E2E8F0";
const brandInk = "#102A43";

export const appTheme = createTheme({
  palette: {
    primary: {
      main: brandPrimary,
      dark: "#1565C0",
      light: "#E3F2FD",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: brandSecondary,
      light: "#F3E5F5",
      contrastText: "#FFFFFF",
    },
    success: {
      main: "#16A34A",
      light: "#E7F9EE",
    },
    warning: {
      main: "#F59E0B",
      light: "#FFF7E8",
    },
    error: {
      main: "#DC2626",
      light: "#FEECEC",
    },
    info: {
      main: brandPrimary,
      light: "#E8F1FF",
    },
    background: {
      default: brandMist,
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F172A",
      secondary: brandSlate,
      disabled: "#94A3B8",
    },
    divider: brandBorder,
    action: {
      hover: alpha(brandPrimary, 0.04),
      selected: alpha(brandPrimary, 0.08),
    },
  },
  shape: {
    borderRadius: 16,
  },
  spacing: 8,
  typography: {
    fontFamily: 'var(--font-geist-sans), "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.04em" },
    h2: { fontWeight: 700, letterSpacing: "-0.04em" },
    h3: { fontWeight: 700, letterSpacing: "-0.03em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0",
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.6,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: "linear-gradient(180deg, #F5F9FF 0%, #F3F5FB 100%)",
          color: "#0F172A",
        },
        "*::selection": {
          background: alpha(brandSecondary, 0.18),
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          minHeight: 42,
          paddingInline: "1.1rem",
          textTransform: "none",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: `1px solid ${brandBorder}`,
          backgroundImage: "none",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${brandBorder}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${brandBorder}`,
          backgroundColor: "#F8FAFC",
          boxShadow: "none",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: "2px 0",
          minHeight: 42,
          "&.Mui-selected": {
            backgroundColor: alpha(brandPrimary, 0.08),
            color: brandInk,
            "& .MuiListItemText-primary": {
              fontWeight: 700,
            },
            "& .MuiListItemIcon-root": {
              color: brandPrimary,
            },
          },
          "&:hover": {
            backgroundColor: alpha(brandPrimary, 0.04),
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
  },
});
