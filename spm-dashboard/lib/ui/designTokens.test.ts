import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { STATUS_COLOURS, SURFACE_COLOURS, TEXT_COLOURS } from './designTokens'

const WORKSPACE_ROOT = join(__dirname, '../..')
const GLOBAL_STYLESHEET = join(WORKSPACE_ROOT, 'styles/globals.scss')

const STYLE_MODULES = [
  'components/DashboardCard/index.module.scss',
  'components/DashboardHeader/index.module.scss',
  'components/DashboardLayout/index.module.scss',
  'components/LaunchFilterChips/index.module.scss',
  'components/ProgrammeSubscriptionsCard/index.module.scss',
  'components/ReadingPlaceCard/index.module.scss',
  'components/SchoolsTable/index.module.scss',
  'components/SpmDashboard/index.module.scss',
  'components/SummaryMetricCards/index.module.scss',
  'styles/Home.module.scss',
]

const readWorkspaceFile = (relativePath: string): string =>
  readFileSync(join(WORKSPACE_ROOT, relativePath), 'utf8')

const toKebabCase = (value: string): string =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

type TokenGroup = {
  prefix: string
  colours: Record<string, string>
}

const TOKEN_GROUPS: TokenGroup[] = [
  { prefix: 'surface', colours: SURFACE_COLOURS },
  { prefix: 'text', colours: TEXT_COLOURS },
  { prefix: 'status', colours: STATUS_COLOURS },
]

const toExpectedDeclarations = (): string[] =>
  TOKEN_GROUPS.flatMap(({ prefix, colours }) =>
    Object.entries(colours).map(
      ([key, hex]) => `--${prefix}-${toKebabCase(key)}: ${hex.toLowerCase()};`
    )
  )

const findDeclaredVariables = (stylesheet: string): Set<string> =>
  new Set(Array.from(stylesheet.matchAll(/^\s*(--[a-z0-9-]+):/gm), (match) => match[1]))

const findReferencedVariables = (stylesheet: string): string[] =>
  Array.from(stylesheet.matchAll(/var\((--[a-z0-9-]+)\)/g), (match) => match[1])

describe('design tokens', () => {
  it('shouldDeclareEveryColourTokenAsACssVariable', () => {
    const stylesheet = readFileSync(GLOBAL_STYLESHEET, 'utf8')
    const missingDeclarations = toExpectedDeclarations().filter(
      (declaration) => !stylesheet.includes(declaration)
    )

    expect(
      missingDeclarations,
      'styles/globals.scss has drifted from lib/ui/designTokens.ts'
    ).toEqual([])
  })
})

describe('css variable references', () => {
  const declaredVariables = findDeclaredVariables(readFileSync(GLOBAL_STYLESHEET, 'utf8'))

  it.each(STYLE_MODULES)('shouldOnlyReferenceDeclaredVariablesIn %s', (modulePath) => {
    const undeclaredVariables = findReferencedVariables(readWorkspaceFile(modulePath)).filter(
      (variable) => !declaredVariables.has(variable)
    )

    expect(
      undeclaredVariables,
      `${modulePath} uses variables that :root never declares, so they resolve to nothing`
    ).toEqual([])
  })
})
