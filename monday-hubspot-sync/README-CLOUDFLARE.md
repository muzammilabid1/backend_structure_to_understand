# Monday-HubSpot Sync Worker

Cloudflare Worker that runs bidirectional sync between Monday.com and HubSpot every 6 hours.

## Prerequisites

-   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
-   Cloudflare account with Workers enabled
-   Monday.com API key
-   HubSpot access token

## Setup

1. **Install dependencies:**

    ```bash
    yarn install
    ```

2. **Configure (non-sensitive) environment variables** in `wrangler.toml`:

    ```toml
    [vars]
    MONDAY_API_URL = "https://api.monday.com/v2"
    MONDAY_BOARD_ID = "your-board-id"
    HUBSPOT_BASE_URL = "https://app.hubspot.com"
    HUBSPOT_ACCOUNT_ID = "your-account-id"
    MONDAY_BOARD_BASE_URL = "https://your-domain.monday.com"
    ```

3. **Deploy the Worker:**

    ```bash
    npx wrangler deploy
    ```

4. **Set secrets** (after first deploy):
    ```bash
    npx wrangler secret put MONDAY_API_KEY
    npx wrangler secret put HUBSPOT_ACCESS_TOKEN
    ```

## Generate Types

After modifying `wrangler.toml`, regenerate the Worker types:

```bash
npx wrangler types
```

This updates `worker-configuration.d.ts` with runtime types based on your compatibility date, flags, and bindings.

## Endpoints

| Endpoint                                | Description                               |
| --------------------------------------- | ----------------------------------------- |
| `GET /health`                           | Health check - returns `{"status": "ok"}` |
| `GET /sync`                             | Trigger manual sync                       |
| `GET /sync?dry-run=true`                | Preview sync without making changes       |
| `GET /sync?direction=monday-to-hubspot` | Sync only Monday → HubSpot                |
| `GET /sync?direction=hubspot-to-monday` | Sync only HubSpot → Monday                |

## Manual Sync

```bash
# Full sync
curl https://monday-hubspot-sync.<your-subdomain>/sync

# Dry run (preview only)
curl https://monday-hubspot-sync.<your-subdomain>/sync?dry-run=true

# One direction only
curl https://monday-hubspot-sync.<your-subdomain>/sync?direction=monday-to-hubspot
```

## Scheduled Sync

The Worker runs automatically every 6 hours via cron trigger (configured in `wrangler.toml`).

## Local Development

```bash
npx wrangler dev
```

Then visit `http://localhost:8787/sync?dry-run=true` to test.

## Logs

View real-time logs:

```bash
npx wrangler tail
```

Or check the [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → monday-hubspot-sync → Logs.
