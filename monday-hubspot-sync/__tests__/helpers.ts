import * as hubspot from '@hubspot/api-client';

let hubspotClient: hubspot.Client | null = null;

export function resetHubspotClient(): void {
    hubspotClient = null;
}
