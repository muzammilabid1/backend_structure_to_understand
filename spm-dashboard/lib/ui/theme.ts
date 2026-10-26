import { createTheme } from '@mui/material/styles'

import {
  CARD_BORDER_RADIUS,
  STATUS_COLOURS,
  SURFACE_COLOURS,
  TEXT_COLOURS,
} from '@/lib/ui/designTokens'

// Minimal standalone theme. The SPM dashboard does not depend on the main
// platform theme, keeping this workspace self-contained.
//
// Scope is deliberately narrow: this configures the MUI widgets only (Chip, Alert, Button,
// Tooltip, CircularProgress). Layout and typography live in SCSS modules.
export const theme = createTheme({
  palette: {
    primary: { main: STATUS_COLOURS.warningValue },
    secondary: { main: STATUS_COLOURS.success },
    success: { main: STATUS_COLOURS.success },
    warning: { main: STATUS_COLOURS.warning, dark: STATUS_COLOURS.warningText },
    error: { main: STATUS_COLOURS.error, dark: STATUS_COLOURS.errorText },
    background: { default: SURFACE_COLOURS.page, paper: SURFACE_COLOURS.card },
    divider: SURFACE_COLOURS.border,
    text: { primary: TEXT_COLOURS.primary, secondary: TEXT_COLOURS.secondary },
  },
  shape: { borderRadius: CARD_BORDER_RADIUS },
  typography: {
    body1: { fontSize: 12 },
    body2: { fontSize: 11 },
    caption: { fontSize: 10 },
  },
})
