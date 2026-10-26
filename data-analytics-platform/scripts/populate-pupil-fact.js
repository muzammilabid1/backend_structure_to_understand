#!/usr/bin/env node

/**
 * Pupil Fact Population Script
 * 
 * This script populates the analytics_pupil_fact table using the optimized SQL query
 * from pupil_fact_population.sql
 * 
 * Usage:
 *   node scripts/populate-pupil-fact.js [year]
 *   
 * Examples:
 *   node scripts/populate-pupil-fact.js        # Populate for 2024 (default)
 *   node scripts/populate-pupil-fact.js 2023   # Populate for 2023
 */

const fs = require('fs').promises
const path = require('path')
const { sql } = require('kysely')
const { createDatabaseConnection } = require('../lib/database')

async function populatePupilFact(academicYear = 2024) {
    const db = createDatabaseConnection()
    
    try {
        console.log(`[${new Date().toISOString()}] Starting pupil fact population for academic year ${academicYear}...`)
        
        // Read the SQL script
        const sqlScript = await fs.readFile(
            path.join(__dirname, '..', '..', 'graphql-provider', 'scripts', 'pupil_fact_population.sql'),
            'utf8'
        )
        
        // Update the script for the specified academic year if not 2024
        let finalScript = sqlScript
        if (academicYear !== 2024) {
            // Replace year references
            const previousYear = academicYear - 1
            const yearStart = `${previousYear}-09-01`
            const yearEnd = `${academicYear}-08-31`
            const periodDescription = `${previousYear}-${academicYear} Academic Year`
            
            finalScript = finalScript
                .replace(/2024/g, academicYear)
                .replace(/2023/g, previousYear)
                .replace(/'2023-09-01'/g, `'${yearStart}'`)
                .replace(/'2024-08-31'/g, `'${yearEnd}'`)
                .replace(/'2023-2024 Academic Year'/g, `'${periodDescription}'`)
        }
        
        // Execute the script
        console.log(`[${new Date().toISOString()}] Executing pupil fact population query...`)
        await sql`${sql.raw(finalScript)}`.execute(db)
        
        // Verify the results
        console.log(`[${new Date().toISOString()}] Verifying results...`)
        const verificationResults = await sql`
            SELECT 
                "timeKey",
                "timeGrain",
                COUNT(*) as record_count,
                COUNT(DISTINCT "pupilId") as unique_pupils,
                COUNT(DISTINCT "schoolId") as unique_schools,
                COUNT(DISTINCT "subjectId") as unique_subjects,
                SUM(CASE WHEN "isActive" THEN 1 ELSE 0 END) as active_records,
                SUM(CASE WHEN "isPupilPremium" THEN 1 ELSE 0 END) as pp_records
            FROM analytics_pupil_fact 
            WHERE "timeKey" = ${academicYear}
            GROUP BY "timeKey", "timeGrain"
            ORDER BY "timeKey", "timeGrain"
        `.execute(db)
        
        console.log(`[${new Date().toISOString()}] Population completed successfully!`)
        console.log('Results:')
        console.table(verificationResults.rows.map(row => ({
            Year: row.timeKey,
            Grain: row.timeGrain,
            Records: Number(row.record_count),
            Pupils: Number(row.unique_pupils),
            Schools: Number(row.unique_schools),
            Subjects: Number(row.unique_subjects),
            Active: Number(row.active_records),
            'PP Records': Number(row.pp_records)
        })))
        
        // Additional verification: Check for data integrity
        const integrityCheck = await sql`
            SELECT 
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE "parentFeedbackEntries" < 0) as negative_feedback,
                COUNT(*) FILTER (WHERE "activitiesCompletedCount" < 0) as negative_activities,
                COUNT(*) FILTER (WHERE "pupilId" IS NULL) as null_pupils,
                COUNT(*) FILTER (WHERE "schoolId" IS NULL) as null_schools
            FROM analytics_pupil_fact 
            WHERE "timeKey" = ${academicYear}
        `.execute(db)
        
        const integrity = integrityCheck.rows[0]
        console.log(`\n[${new Date().toISOString()}] Data integrity check:`)
        console.log(`- Total records: ${Number(integrity.total_records)}`)
        console.log(`- Records with negative feedback: ${Number(integrity.negative_feedback)}`)
        console.log(`- Records with negative activities: ${Number(integrity.negative_activities)}`)
        console.log(`- Records with null pupils: ${Number(integrity.null_pupils)}`)
        console.log(`- Records with null schools: ${Number(integrity.null_schools)}`)
        
        if (Number(integrity.negative_feedback) > 0 || Number(integrity.negative_activities) > 0) {
            console.warn('⚠️  Warning: Found records with negative values - this may indicate data issues')
        }
        
        console.log(`\n✅ Pupil fact population completed successfully for academic year ${academicYear}`)
        
    } catch (error) {
        console.error(`❌ Error during pupil fact population:`, error)
        
        // Try to provide more context about the error
        if (error.message.includes('does not exist')) {
            console.error('\n💡 Hint: Make sure the analytics tables have been created by running:')
            console.error('   npm run setup:analytics')
        }
        
        if (error.message.includes('permission denied')) {
            console.error('\n💡 Hint: Check database permissions for the analytics tables')
        }
        
        process.exit(1)
    } finally {
        await db.destroy()
    }
}

// Parse command line arguments
const academicYear = process.argv[2] ? parseInt(process.argv[2], 10) : 2024

if (isNaN(academicYear) || academicYear < 2020 || academicYear > 2030) {
    console.error('❌ Invalid academic year. Please provide a year between 2020 and 2030.')
    process.exit(1)
}

// Run the population
populatePupilFact(academicYear).catch(error => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
})







