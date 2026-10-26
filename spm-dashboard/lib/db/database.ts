import { createPostgresClient } from '@lwp/postgres-client'
import fs from 'fs'
import path from 'path'

import { resolveConnectionSettings, resolveSslConfig } from './connectionSettings'

const readCertificateAuthority = (): string =>
  fs
    .readFileSync(
      path.resolve(process.cwd(), '..', 'graphql-provider', 'lib', 'eu-west-2-bundle.pem')
    )
    .toString()

const settings = resolveConnectionSettings(process.env)

const ssl = resolveSslConfig({
  host: settings.host,
  lwpEnv: process.env.LWP_ENV,
  readCertificateAuthority,
})

// Single shared Kysely connection pool, reused across API route invocations.
export const db = createPostgresClient({ ...settings, ssl })
