#!/usr/bin/env node

/**
 * ETL Script for School Impact Summary
 * 
 * This script runs the refresh_school_impact_summary() stored procedure
 * and can be called manually or via cron job.
 * 
 * Usage:
 *   node scripts/refresh-impact-summary.js
 *   # or via cron:
 *   0 2 * * 0 cd /path/to/data-analytics-platform && yarn etl:refresh
 */

const { sql } = require('kysely');
const { createDatabaseConnection } = require('../lib/database');

async function refreshImpactSummary() {
    const db = createDatabaseConnection();
    
    try {
        console.log(`[${new Date().toISOString()}] Starting impact summary refresh...`);
        
        // Call the stored procedure
        const result = await sql`
            SELECT * FROM refresh_school_impact_summary()
        `.execute(db);
        
        const summary = result.rows[0];
        console.log(`[${new Date().toISOString()}] Refresh completed:`, {
            status: summary.status,
            recordsProcessed: summary.records_processed,
            durationSeconds: summary.duration_seconds
        });
        
        // Verify data freshness
        const metadata = await sql`
            SELECT 
                last_refresh_completed_at,
                last_refresh_success,
                records_processed,
                refresh_duration_seconds,
                data_version
            FROM analytics_summary_metadata 
            WHERE table_name = 'analytics_school_impact_summary'
        `.execute(db);
        
        console.log(`[${new Date().toISOString()}] Metadata:`, metadata.rows[0]);
        
        // Exit with appropriate code
        process.exit(summary.status === 'SUCCESS' ? 0 : 1);
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ETL failed:`, error);
        
        // Try to log error to metadata table
        try {
            await sql`
                UPDATE analytics_summary_metadata 
                SET 
                    last_refresh_completed_at = NOW(),
                    last_refresh_success = false,
                    error_message = ${error.message},
                    updated_at = NOW()
                WHERE table_name = 'analytics_school_impact_summary'
            `.execute(db);
        } catch (metaError) {
            console.error(`[${new Date().toISOString()}] Failed to update metadata:`, metaError);
        }
        
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(`[${new Date().toISOString()}] Received SIGINT, shutting down gracefully...`);
    process.exit(1);
});

process.on('SIGTERM', async () => {
    console.log(`[${new Date().toISOString()}] Received SIGTERM, shutting down gracefully...`);
    process.exit(1);
});

// Run the refresh
if (require.main === module) {
    refreshImpactSummary();
}

module.exports = { refreshImpactSummary }; 