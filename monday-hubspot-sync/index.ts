import type { ScheduledEvent } from '@cloudflare/workers-types';

import { createHmac, timingSafeEqual } from 'crypto';

import { createAppConfig } from './config';
import { orchestrateSync } from './syncOrchestrator';
import type { OrchestrationResult } from './types';

/**
 * Verifies the webhook signature using HMAC-SHA256.
 * Uses Node.js crypto.timingSafeEqual for constant-time comparison.
 */
async function verifyWebhookSignature(request: Request, secret: string): Promise<{ valid: boolean; body: string }> {
    const signature = request.headers.get('X-Webhook-Signature');

    if (!signature) {
        return { valid: false, body: '' };
    }

    const body = await request.text();

    // Compute expected signature using HMAC-SHA256
    const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');

    // Convert to buffers for timing-safe comparison
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    const valid = sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);

    return { valid, body };
}

/**
 * Populates process.env from Worker env bindings.
 * This allows us to use the same config.ts file for both local development and Cloudflare Worker.
 */
function populateProcessEnv(env: Partial<Record<string, string>>): void {
    Object.entries(env).forEach(([key, value]) => {
        process.env[key] = value;
    });
}

export default {
    /**
     * Scheduled handler - runs on cron trigger (every 6 hours)
     * Performs bidirectional sync between Monday.com and HubSpot
     */
    async scheduled(event: ScheduledEvent, env: Partial<Record<string, string>>): Promise<void> {
        console.log(`Cron scheduled for: ${new Date(event.scheduledTime).toISOString()}`);
        console.log(`Executed at: ${new Date().toISOString()}`);

        try {
            const appConfig = createAppConfig(env);

            const result: OrchestrationResult = await orchestrateSync(
                appConfig,
                {
                    direction: 'both'
                }
            );

            console.log({
                message: 'Sync completed successfully',
                mondayToHubspot: result.mondayToHubspot?.summary,
                hubspotToMonday: result.hubspotToMonday?.summary,
                orphanedLinks: result.orphanedLinks.length,
                potentialDuplicates: result.potentialDuplicates.length
            });
        } catch (error) {
            console.error({
                message: 'Sync failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    },

    /**
     * Fetch handler - for manual testing via HTTP requests
     * Allows triggering sync manually during development
     */
    async fetch(request: Request, env: Partial<Record<string, string>>): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === '/health') {
            return new Response(JSON.stringify({ status: 'ok' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (url.pathname === '/sync') {
            const webhookSecret = env.WEBHOOK_SECRET;
            
            // Verify webhook signature (body should be empty '{}' - options are in query params)
            const result = webhookSecret ? await verifyWebhookSignature(request, webhookSecret) : null;
            if (!result?.valid) {
                console.error({ message: 'Invalid or missing webhook signature' });
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            console.log('Manual sync triggered via HTTP');

            try {
                const appConfig = createAppConfig(env);

                const dryRun = url.searchParams.get('dry-run') === 'true';
                const direction = (url.searchParams.get('direction') as 'both' | 'monday-to-hubspot' | 'hubspot-to-monday') || 'both';

                const result: OrchestrationResult = await orchestrateSync(
                    appConfig,
                    {
                        direction,
                        dryRun
                    }
                );

                return new Response(
                    JSON.stringify({
                        success: true,
                        dryRun,
                        direction,
                        mondayToHubspot: result.mondayToHubspot?.summary,
                        hubspotToMonday: result.hubspotToMonday?.summary,
                        orphanedLinks: result.orphanedLinks.length,
                        potentialDuplicates: result.potentialDuplicates.length
                    }),
                    {
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            } catch (error) {
                console.error({
                    message: 'Manual sync failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Sync operation failed'
                    }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }
        }

        return new Response(
            JSON.stringify({
                error: 'Not found',
                availableEndpoints: ['/health', '/sync']
            }),
            {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
};
