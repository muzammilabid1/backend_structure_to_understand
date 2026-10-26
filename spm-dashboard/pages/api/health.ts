import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Liveness only, deliberately: it answers for the Next server and nothing behind it.
 *
 * A health check that queried Postgres would take every instance out of the load balancer during a
 * database blip, turning a page that shows an error into a host that cannot be reached at all. The
 * database is checked where it is used, in the routes that read it.
 *
 * Reachable without a session — see the exemption in `middleware.ts`.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).json({ status: 'ok' })
}
