const GRAPHQL_AUTH_ENDPOINT =
  process.env.GRAPHQL_PROVIDER_ENDPOINT ?? 'http://localhost:3007/graphql'

type GraphqlResponse<T> = {
  data?: T
  errors?: Array<{ message?: string }>
}

async function postGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_AUTH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  const payload = (await response.json()) as GraphqlResponse<T>

  if (!response.ok || payload.errors?.length) {
    const errorMessage = payload.errors?.[0]?.message ?? 'Authentication request failed'
    throw new Error(errorMessage)
  }

  if (!payload.data) {
    throw new Error('Authentication request returned no data')
  }

  return payload.data
}

type RefreshSessionData = {
  refreshSession: {
    accessToken: string
    refreshToken?: string
  }
}

export async function refreshSessionWithGraphqlProvider(
  refreshToken: string
): Promise<RefreshSessionData['refreshSession']> {
  const mutation = `
    mutation refreshSession($refreshToken: String!) {
      refreshSession(refreshToken: $refreshToken) {
        accessToken
        refreshToken
      }
    }
  `

  const result = await postGraphql<RefreshSessionData>(mutation, { refreshToken })

  return result.refreshSession
}
