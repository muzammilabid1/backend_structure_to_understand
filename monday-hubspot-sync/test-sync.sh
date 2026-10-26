#!/bin/bash

# Test script for the monday-hubspot-sync Cloudflare Worker
# Generates HMAC-SHA256 signature and sends authenticated request to /sync endpoint
#
# Usage:
#   ./test-sync.sh <worker-url> <webhook-secret> [options]
#   
#   Or with environment variables:
#   WORKER_URL=https://... WEBHOOK_SECRET=... ./test-sync.sh [options]
#
# Options:
#   --dry-run         Run sync in dry-run mode (no actual changes)
#   --direction=X     Sync direction: both, monday-to-hubspot, hubspot-to-monday (default: both)
#
# Examples:
#   ./test-sync.sh https://monday-hubspot-sync.your-subdomain.workers.dev my-secret
#   ./test-sync.sh https://monday-hubspot-sync.your-subdomain.workers.dev my-secret --dry-run
#   WORKER_URL=https://... WEBHOOK_SECRET=... ./test-sync.sh --dry-run --direction=monday-to-hubspot

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORKER_URL="${WORKER_URL:-}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-}"
DRY_RUN=false
DIRECTION="both"

# Parse positional and flag arguments
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --direction=*)
            DIRECTION="${arg#*=}"
            shift
            ;;
        *)
            if [ -z "$WORKER_URL" ]; then
                WORKER_URL="$arg"

            elif [ -z "$WEBHOOK_SECRET" ]; then
                WEBHOOK_SECRET="$arg"
            fi
            ;;
    esac
done

# Validate required parameters
if [[ -z "$WORKER_URL" || -z "$WEBHOOK_SECRET" ]]; then
    echo -e "${RED}Error: WORKER_URL and WEBHOOK_SECRET are required${NC}"
    echo "Usage: ./test-sync.sh <worker-url> <webhook-secret> [--dry-run] [--direction=X]"
    echo "   Or: WORKER_URL=... WEBHOOK_SECRET=... ./test-sync.sh [--dry-run] [--direction=X]"
    exit 1
fi

if [[ ! "$DIRECTION" =~ ^(both|monday-to-hubspot|hubspot-to-monday)$ ]]; then
    echo -e "${RED}Error: Invalid direction '$DIRECTION'${NC}"
    echo "Valid options: both, monday-to-hubspot, hubspot-to-monday"
    exit 1
fi

BODY='{}'

# Generate HMAC-SHA256 signature over the empty body
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')

# Build URL with query params
FULL_URL="$WORKER_URL/sync?direction=$DIRECTION&dry-run=$DRY_RUN"

# Display request info
echo -e "${YELLOW}=== Monday-HubSpot Sync Test ===${NC}"
echo -e "URL:       ${GREEN}$FULL_URL${NC}"
echo -e "Direction: ${GREEN}$DIRECTION${NC}"
echo -e "Dry Run:   ${GREEN}$DRY_RUN${NC}"
echo -e "Signature: ${GREEN}${SIGNATURE:0:5}...${SIGNATURE: -5}${NC}"
echo ""
echo -e "${YELLOW}Sending request...${NC}"
echo ""

# Send the request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FULL_URL" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Signature: $SIGNATURE" \
    -d "$BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')


if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo -e "${GREEN}Success (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}Failed (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo -e "${YELLOW}Response:${NC}"


if command -v jq &> /dev/null; then
    echo "$RESPONSE_BODY" | jq .
else
    echo "$RESPONSE_BODY"
fi
