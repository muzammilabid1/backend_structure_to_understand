import { describe, expect, it, vi } from 'vitest'

import { resolveConnectionSettings, resolveSslConfig } from './connectionSettings'

const CA = 'test-ca-certificate'
const REMOTE_HOST = 'db.example.com'
const VERIFIED_SSL = { ca: CA, rejectUnauthorized: true }

const resolveSsl = (options: { host: string | undefined; lwpEnv: string | undefined }) =>
  resolveSslConfig({ ...options, readCertificateAuthority: () => CA })

const resolveSslFromEnv = (env: Record<string, string | undefined>) =>
  resolveSsl({ host: resolveConnectionSettings(env).host, lwpEnv: 'local' })

describe('resolveSsl', () => {
  it('disables SSL when the host is localhost and LWP_ENV is local', () => {
    expect(resolveSsl({ host: 'localhost', lwpEnv: 'local' })).toBe(false)
  })

  it('disables SSL when the host is localhost and LWP_ENV is dev', () => {
    expect(resolveSsl({ host: 'localhost', lwpEnv: 'dev' })).toBe(false)
  })

  it('enables SSL with certificate verification when the host is localhost and LWP_ENV is production', () => {
    expect(resolveSsl({ host: 'localhost', lwpEnv: 'production' })).toEqual(VERIFIED_SSL)
  })

  it('enables SSL with certificate verification when the host is localhost and LWP_ENV is stage', () => {
    expect(resolveSsl({ host: 'localhost', lwpEnv: 'stage' })).toEqual(VERIFIED_SSL)
  })

  it('enables SSL with certificate verification when the host is localhost and LWP_ENV is undefined', () => {
    expect(resolveSsl({ host: 'localhost', lwpEnv: undefined })).toEqual(VERIFIED_SSL)
  })

  it('enables SSL with certificate verification when the host is remote and LWP_ENV is local', () => {
    expect(resolveSsl({ host: REMOTE_HOST, lwpEnv: 'local' })).toEqual(VERIFIED_SSL)
  })

  it('enables SSL with certificate verification when the host is remote and LWP_ENV is dev', () => {
    expect(resolveSsl({ host: REMOTE_HOST, lwpEnv: 'dev' })).toEqual(VERIFIED_SSL)
  })
})

describe('SSL config resolved from environment', () => {
  it('disables SSL when PGHOST_SNAPSHOT is localhost and PGHOST is remote', () => {
    expect(resolveSslFromEnv({ PGHOST_SNAPSHOT: 'localhost', PGHOST: REMOTE_HOST })).toBe(false)
  })

  it('enables SSL when PGHOST_SNAPSHOT is remote and PGHOST is localhost', () => {
    expect(resolveSslFromEnv({ PGHOST_SNAPSHOT: REMOTE_HOST, PGHOST: 'localhost' })).toEqual(
      VERIFIED_SSL
    )
  })
})

describe('resolveConnectionSettings', () => {
  it('prefers the snapshot host over the plain host', () => {
    expect(
      resolveConnectionSettings({ PGHOST_SNAPSHOT: 'snapshot-host', PGHOST: 'plain-host' }).host
    ).toBe('snapshot-host')
  })

  it('parses the snapshot port as a number', () => {
    expect(resolveConnectionSettings({ PGPORT_SNAPSHOT: '6543', PGPORT: '5432' }).port).toBe(6543)
  })
})

describe('resolveSslConfig', () => {
  it('does not read the certificate authority when SSL is skipped', () => {
    const readCertificateAuthority = vi.fn(() => CA)

    resolveSslConfig({ host: 'localhost', lwpEnv: 'local', readCertificateAuthority })

    expect(readCertificateAuthority).not.toHaveBeenCalled()
  })

  it('reads the certificate authority once when the host is remote', () => {
    const readCertificateAuthority = vi.fn(() => CA)

    resolveSslConfig({ host: REMOTE_HOST, lwpEnv: 'local', readCertificateAuthority })

    expect(readCertificateAuthority).toHaveBeenCalledTimes(1)
  })
})
