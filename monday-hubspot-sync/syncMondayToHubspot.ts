/**
 * Monday.com → HubSpot sync
 *
 * This module exports the sync function. Use syncOrchestrator.ts to run syncs:
 *   npx tsx syncOrchestrator.ts --direction monday-to-hubspot
 */
export { syncMondayToHubSpot } from './hubspotService';

