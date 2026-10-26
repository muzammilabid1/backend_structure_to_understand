export type ConnectionSettings = {
  host: string | undefined
  port: number
  user: string | undefined
  password: string | undefined
  database: string | undefined
}

export type SslConfig = false | { ca: string; rejectUnauthorized: true }

const DEFAULT_PORT = '5432'

export const resolveConnectionSettings = (
  env: Record<string, string | undefined>
): ConnectionSettings => ({
  host: env.PGHOST_SNAPSHOT || env.PGHOST,
  port: parseInt(env.PGPORT_SNAPSHOT || env.PGPORT || DEFAULT_PORT, 10),
  user: env.PGAPPUSER_SNAPSHOT || env.PGAPPUSER,
  password: env.PGAPPPASSWORD_SNAPSHOT || env.PGAPPPASSWORD,
  database: env.PGDATABASE_SNAPSHOT || env.PGDATABASE,
})

const SSL_OPTIONAL_ENVIRONMENTS = ['local', 'dev']

type SslEnvironmentOptions = {
  host: string | undefined
  lwpEnv: string | undefined
}

// An unknown or missing environment must fail closed, so SSL stays on.
const canSkipSsl = ({ host, lwpEnv }: SslEnvironmentOptions): boolean =>
  host === 'localhost' && lwpEnv !== undefined && SSL_OPTIONAL_ENVIRONMENTS.includes(lwpEnv)

type ResolveSslConfigOptions = SslEnvironmentOptions & {
  readCertificateAuthority: () => string
}

// The CA is supplied lazily so that localhost works without the CA file on disk.
export const resolveSslConfig = ({
  host,
  lwpEnv,
  readCertificateAuthority,
}: ResolveSslConfigOptions): SslConfig => {
  if (canSkipSsl({ host, lwpEnv })) {
    return false
  }

  return { ca: readCertificateAuthority(), rejectUnauthorized: true }
}
