#!/usr/bin/env node

/**
 * Setup Script for Analytics Tables
 * 
 * This script:
 * 1. Creates the analytics tables and stored procedure
 * 2. Runs the initial data population
 * 3. Validates the data
 * 
 * Usage:
 *   node scripts/setup-analytics-tables.js
 */

const fs = require('fs').promises;
const path = require('path');
const { sql } = require('kysely');
const { createDatabaseConnection } = require('../lib/database');
const { refreshImpactSummary } = require('./refresh-impact-summary');

async function setupAnalyticsTables() {
    const db = createDatabaseConnection();
    
    try {
        console.log(`[${new Date().toISOString()}] Setting up analytics tables...`);
        
        // 1. Read and execute table creation script
        console.log(`[${new Date().toISOString()}] Creating tables and indexes...`);
        const createTablesSQL = await fs.readFile(
            path.join(__dirname, '..', 'sql', 'create-analytics-tables.sql'),
            'utf8'
        );
        
        // Split by semicolons and execute each statement
        const statements = createTablesSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        
        for (const statement of statements) {
            await sql`${sql.raw(statement)}`.execute(db);
        }
        
        console.log(`[${new Date().toISOString()}] ✓ Tables created successfully`);
        
        // 2. Read and create stored procedure
        console.log(`[${new Date().toISOString()}] Creating stored procedure...`);
        const createProcedureSQL = await fs.readFile(
            path.join(__dirname, '..', 'sql', 'refresh-school-impact-summary.sql'),
            'utf8'
        );
        
        await sql`${sql.raw(createProcedureSQL)}`.execute(db);
        console.log(`[${new Date().toISOString()}] ✓ Stored procedure created successfully`);
        
        // 3. Run initial data population
        console.log(`[${new Date().toISOString()}] Running initial data population...`);
        await refreshImpactSummary();
        
        // 4. Validate data
        console.log(`[${new Date().toISOString()}] Validating data...`);
        
        const totalRecords = await sql`
            SELECT COUNT(id) as count FROM analytics_school_impact_summary
        `.execute(db);
        
        const schoolCount = await sql`
            SELECT COUNT(DISTINCT school_id) as count 
            FROM analytics_school_impact_summary 
            WHERE school_id IS NOT NULL
        `.execute(db);
        
        const allSchoolsCount = await sql`
            SELECT COUNT(id) as count 
            FROM analytics_school_impact_summary 
            WHERE school_id IS NULL
        `.execute(db);
        
        console.log(`[${new Date().toISOString()}] ✓ Data validation:`, {
            totalRecords: totalRecords.rows[0]?.count,
            individualSchools: schoolCount.rows[0]?.count,
            allSchoolsRecords: allSchoolsCount.rows[0]?.count,
            expectedYears: 3 // 2022, 2023, 2024
        });
        
        // 5. Show sample data
        const sampleData = await sql`
            SELECT period_index, pupils_with_feedback, total_active_pupils, feedback_percentage
            FROM analytics_school_impact_summary 
            WHERE school_id IS NULL 
            ORDER BY period_index
        `.execute(db);
        
        console.log(`[${new Date().toISOString()}] Sample "All Schools" data:`);
        sampleData.rows.forEach(row => {
            console.log(`  Year ${row.period_index}: ${row.pupils_with_feedback}/${row.total_active_pupils} pupils (${row.feedback_percentage}%)`);
        });
        
        console.log(`[${new Date().toISOString()}] ✓ Setup completed successfully!`);
        console.log(`[${new Date().toISOString()}] Next steps:`);
        console.log('  1. Set up weekly cron: yarn etl:setup');
        console.log('  2. Migrate API endpoints to use summary tables');
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Setup failed:`, error);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Run setup if called directly
if (require.main === module) {
    setupAnalyticsTables();
}

module.exports = { setupAnalyticsTables }; 