import type { ProgrammeKey } from '@/types/spm'

// Hex lives here because MUI's palette rejects CSS variables: createTheme runs augmentColor,
// and Chip's outlined variant calls alpha() on palette.main. styles/globals.scss mirrors these
// for the SCSS modules; designTokens.test.ts fails if the two drift.
export const SURFACE_COLOURS = {
  page: '#f0f2e8',
  card: '#ffffff',
  border: '#D3D1C7',
  rowRule: '#E5E5E5',
  statTile: '#FFF9F2',
  accentTint: '#FAEEDA',
} as const

export const TEXT_COLOURS = {
  primary: '#222222',
  secondary: '#666666',
  muted: '#888780',
} as const

export const STATUS_COLOURS = {
  success: '#5BA832',
  warning: '#E59837',
  warningText: '#854F0B',
  warningValue: '#BA7517',
  error: '#D9383A',
  errorText: '#791F1F',
  errorValue: '#A32D2D',
} as const

export type BadgeColour = {
  background: string
  text: string
}

// The design system names badges by preset, not by role, because roles share them:
// Maths & English and a launched programme are both the green badge.
const BADGE_PRESETS = {
  purple: { background: '#EBEAFB', text: '#5A52BD' },
  green: { background: '#E4F4E4', text: '#2E7D32' },
  teal: { background: '#DFF5EF', text: '#00897B' },
  pink: { background: '#FCE4EC', text: '#C2185B' },
  amber: { background: '#FFF3E0', text: '#E65100' },
  yellow: { background: '#FFF6D9', text: STATUS_COLOURS.warningText },
  neutral: { background: '#F5F5F5', text: '#616161' },
  rose: { background: '#F4E6E6', text: STATUS_COLOURS.errorValue },
  sand: { background: '#F7EEE3', text: STATUS_COLOURS.warningText },
  stone: { background: '#F0EFEA', text: TEXT_COLOURS.muted },
} as const satisfies Record<string, BadgeColour>

type ProgrammeColour = {
  line: string
  badge: BadgeColour
}

export const PROGRAMME_COLOURS: Record<ProgrammeKey, ProgrammeColour> = {
  digitalReadingLog: { line: '#7F77DD', badge: BADGE_PRESETS.purple },
  mathsEnglish: { line: '#639922', badge: BADGE_PRESETS.green },
  moneySkills: { line: '#1D9E75', badge: BADGE_PRESETS.teal },
  readyTeddy: { line: '#D4537E', badge: BADGE_PRESETS.pink },
}

export const LAUNCH_BADGE_COLOURS = {
  launched: BADGE_PRESETS.green,
  notLaunched: BADGE_PRESETS.yellow,
  notSubscribed: BADGE_PRESETS.neutral,
} as const satisfies Record<string, BadgeColour>

// Keyed by SchoolIssue['severity']; typed loosely to keep lib/ui free of a dependency on lib/spm.
export const ISSUE_BADGE_COLOURS = {
  error: BADGE_PRESETS.rose,
  warning: BADGE_PRESETS.sand,
  muted: BADGE_PRESETS.stone,
} as const satisfies Record<string, BadgeColour>

export const CARD_BORDER_RADIUS = 10
