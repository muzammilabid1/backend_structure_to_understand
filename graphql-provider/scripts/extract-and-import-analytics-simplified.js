#!/usr/bin/env node

/**
 * Simplified Analytics Data Extraction and Import
 *
 * Processes 2024-2025 analytics data with single query approach:
 * - Academic year: 2024-2025 only
 * - No batching: Process all students at once
 * - Clean deletion: Remove all existing 2024-2025 data upfront
 * - Single transaction: All-or-nothing approach
 * - Source & Target: PGHOST_SNAPSHOT (same database)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createPostgresClient } = require('@lwp/postgres-client');
const { sql } = require('kysely');

// Load environment
require('dotenv').config({ path: '../.env.local' });

// Configuration
const BATCH_INSERT_SIZE = 1000; // Records to insert per batch
const SCHOOL_BATCHES = 20; // Number of school ID range batches

// Academic years to process (test with 2024-2025 only first)
const ACADEMIC_YEARS = [{ key: 2025, start: '2024-09-01', end: '2025-08-31', name: '2024-2025' }];

// School ID range (from your data: min=1, max=2178461983)
const SCHOOL_ID_RANGE = {
    min: 1,
    max: 2178461983
};

// Encryption configuration for student ID anonymization
const ENCRYPTION_CONFIG = {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    tagLength: 16 // 128 bits
};

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey() {
    const key = process.env.STUDENT_ID_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('STUDENT_ID_ENCRYPTION_KEY environment variable is required for student ID anonymization');
    }

    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== ENCRYPTION_CONFIG.keyLength) {
        throw new Error(
            `Encryption key must be exactly ${ENCRYPTION_CONFIG.keyLength * 2} hex characters (${ENCRYPTION_CONFIG.keyLength} bytes)`
        );
    }

    return keyBuffer;
}

/**
 * Encrypt student ID for anonymization
 */
function encryptStudentId(studentId) {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

        // Node.js uses createCipheriv for GCM
        const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
        cipher.setAAD(Buffer.from('student_id'));

        const encryptedBuf = Buffer.concat([cipher.update(String(studentId), 'utf8'), cipher.final()]);

        const tag = cipher.getAuthTag();

        // Store as hex: iv + tag + ciphertext
        const combined = Buffer.concat([iv, tag, encryptedBuf]).toString('hex');
        return `anon_${combined}`;
    } catch (error) {
        console.error('Failed to encrypt student ID:', error.message);
        throw new Error(`Student ID encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt student ID (for authorized personnel only)
 */

function decryptStudentId(encryptedStudentId) {
    try {
        if (!encryptedStudentId.startsWith('anon_')) {
            throw new Error('Invalid encrypted student ID format');
        }

        const key = getEncryptionKey();
        const hex = encryptedStudentId.slice(5); // remove 'anon_'
        const combined = Buffer.from(hex, 'hex');

        const iv = combined.subarray(0, ENCRYPTION_CONFIG.ivLength);
        const tag = combined.subarray(ENCRYPTION_CONFIG.ivLength, ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);
        const ciphertext = combined.subarray(ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);

        const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
        decipher.setAAD(Buffer.from('student_id'));
        decipher.setAuthTag(tag);

        const decryptedBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

        return parseInt(decryptedBuf.toString('utf8'), 10);
    } catch (error) {
        console.error('Failed to decrypt student ID:', error.message);
        throw new Error(`Student ID decryption failed: ${error.message}`);
    }
}

/**
 * Get SNAPSHOT database configuration (same for source and target)
 */
function getSnapshotConfig() {
    return {
        host: process.env.PGHOST_SNAPSHOT,
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGAPPUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE_SNAPSHOT,
        ssl:
            process.env.PGHOST_SNAPSHOT && process.env.PGHOST_SNAPSHOT.includes('rds.amazonaws.com')
                ? {
                      ca: fs.readFileSync(path.resolve(__dirname, '..', 'lib', 'eu-west-2-bundle.pem')).toString(),
                      rejectUnauthorized: false
                  }
                : false,
        // Extended timeouts for large operations
        connectionTimeoutMillis: 60000,
        idleTimeoutMillis: 60000,
        query_timeout: 3000000, // 50 minutes for large query
        max: 10 // Connection pool
    };
}

/**
 * Generate school ID ranges for batching
 */
function generateSchoolIdRanges(minSchoolId, maxSchoolId, numBatches) {
    const ranges = [];
    const rangeSize = Math.ceil((maxSchoolId - minSchoolId + 1) / numBatches);

    for (let i = 0; i < numBatches; i++) {
        const startSchoolId = minSchoolId + i * rangeSize;
        const endSchoolId = Math.min(startSchoolId + rangeSize - 1, maxSchoolId);

        ranges.push({
            batchIndex: i,
            startSchoolId,
            endSchoolId,
            description: `School IDs ${startSchoolId.toLocaleString()} → ${endSchoolId.toLocaleString()}`
        });
    }

    return ranges;
}

/**
 * Extract pupil fact data for academic year with school ID range filtering
 */
async function extractPupilFactData(db, academicYear, schoolIdRange = null) {
    const rangeDesc = schoolIdRange ? ` (${schoolIdRange.description})` : '';
    console.log(`     Extracting data for ${academicYear.name}${rangeDesc}...`);
    if (!schoolIdRange) {
        console.log(`   Period: ${academicYear.start} to ${academicYear.end}`);
        console.log(`   Academic year key: ${academicYear.key}`);
    }

    const startTime = Date.now();

    console.log('ACADEMIC YEAR:', academicYear);

    try {
        // Build the comprehensive extraction query (no pupil ID filtering)
        const extractQuery = sql`
            WITH 
            -- Constants for academic year
            constants AS (
                SELECT 
                    ${academicYear.key} as time_key,
                    ${academicYear.start}::date as year_start,
                    ${academicYear.end}::date as year_end
            ),
            
            -- Base student-subject CTE (filtered by pupils with topic activity in the academic year)
            student_subject_base AS (
                SELECT DISTINCT
                    lp.id as student_id,
                    lp."schoolId" as school_id,
                    lp."isPremium" as is_pupil_premium,
                    lp.gender,
                    CASE 
                        WHEN ws.sen_status IS NULL THEN NULL
                        WHEN ws.sen_status IN ('N', 'N,', '') THEN false
                        ELSE true
                    END as has_sen,
                    ws.ethnicity_code,
                    ws.english_as_additional_language_status,
                    COALESCE(sltd."subjectId", 0) as subject_id,
                    COALESCE(sls.name, 
                        CASE 
                            WHEN sltd."subjectId" = 0 THEN 'Reading'
                            WHEN sltd."subjectId" IS NULL THEN 'Other'
                            ELSE 'Unknown'
                        END
                    ) as subject_name,
                    lpt.id as pupil_topic_id,
                    lpt."releaseDate",
                    lpt."readingTarget",
                    lpt."watchedVideo",
                    lpt."logUpdatedAt",
                    slt.id as topic_id,
                    sla.id as static_activity_id
                FROM lwp_pupil lp
                JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
                LEFT JOIN imported_student ws ON ws.id = lp."importedStudentId"
                JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
                JOIN static_lwp_topic slt ON slt.id = lpt."topicId"
                LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = slt.id
                LEFT JOIN static_lwp_topic_domain sltd ON sltd.id = sltdyg."domainId"
                LEFT JOIN static_lwp_subject sls ON sls.id = sltd."subjectId"
                LEFT JOIN static_lwp_activity sla ON sla."topicId" = slt.id
                WHERE lp."deletedAt" IS NULL
                    AND lpt."releaseDate" >= (SELECT year_start FROM constants)
                    AND lpt."releaseDate" <= (SELECT year_end FROM constants)
                    AND lpt."logCreatedAt" >= (SELECT year_start FROM constants)
                    AND lpt."logCreatedAt" <= (SELECT year_end FROM constants)
                    ${schoolIdRange ? sql`AND lp."schoolId" BETWEEN ${schoolIdRange.startSchoolId} AND ${schoolIdRange.endSchoolId}` : sql``}
            ),
            
            -- Completed activities aggregation
            completed_activities_by_subject AS (
                SELECT
                    ssb.student_id,
                    ssb.subject_id,
                    COUNT(DISTINCT lpa.id) as activities_completed_count
                FROM student_subject_base ssb
                JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id 
                    AND lpa."topicId" = ssb.pupil_topic_id
                WHERE EXISTS (
                    SELECT 1 FROM lwp_pupil_feedback lpf
                    WHERE lpf."activityId" = lpa.id
                    AND lpf."userType" = 'PARENT'
                    AND lpf."type" = 'ACTIVITY'
                )
                GROUP BY ssb.student_id, ssb.subject_id
            ),
            
            -- Star ratings aggregation
            star_ratings_by_subject AS (
                SELECT
                    ssb.student_id,
                    ssb.subject_id,
                    COUNT(lpa.rating) FILTER (WHERE lpa.rating IS NOT NULL 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )) as total_star_ratings_given,
                    COALESCE(SUM(lpa.rating) FILTER (WHERE lpa.rating IS NOT NULL 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )), 0) as sum_star_ratings,
                    COUNT(lpa.rating) FILTER (WHERE lpa.rating = 1 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )) as one_star_ratings,
                    COUNT(lpa.rating) FILTER (WHERE lpa.rating = 2 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )) as two_star_ratings,
                    COUNT(lpa.rating) FILTER (WHERE lpa.rating = 3 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )) as three_star_ratings,
                    COUNT(lpa.rating) FILTER (WHERE lpa.rating = 4 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )) as four_star_ratings,
                    COUNT(lpa.rating) FILTER (WHERE lpa.rating = 5 
                        AND EXISTS (
                            SELECT 1 FROM lwp_pupil_feedback lpf 
                            WHERE lpf."activityId" = lpa.id 
                            AND lpf."userType" = 'PARENT'
                        )) as five_star_ratings
                FROM student_subject_base ssb
                JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id 
                    AND lpa."topicId" = ssb.pupil_topic_id
                CROSS JOIN constants c
                WHERE lpa."logCreatedAt" BETWEEN c.year_start AND c.year_end
                    AND lpa.rating IS NOT NULL
                GROUP BY ssb.student_id, ssb.subject_id
            ),
            
            -- Feedback metrics aggregation
            feedback_metrics_by_subject AS (
                SELECT
                    ssb.student_id,
                    ssb.subject_id,
                    COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT' 
                        AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                    ) as comments_left_by_parents_count,
                    COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PUPIL' 
                        AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                    ) as comments_left_by_pupils_count,
                    COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER' 
                        AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                    ) as comments_left_by_teachers_count,
                    COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'PARENT') as photos_uploaded_by_parents_count,
                    COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'TEACHER') as photos_uploaded_by_teachers_count,
                    COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'PARENT') as audio_clips_uploaded_by_parents_count,
                    COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'TEACHER') as audio_clips_uploaded_by_teachers_count,
                    COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT') as parent_feedback_entries,
                    COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER') as teacher_feedback_entries
                FROM student_subject_base ssb
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = ssb.student_id
                LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                LEFT JOIN lwp_pupil_feedback_media lpfm ON lpfm."feedbackId" = lpf.id
                LEFT JOIN lwp_pupil_activity lpa ON lpf."activityId" = lpa.id
                LEFT JOIN lwp_pupil_topic lpt_feedback ON lpa."topicId" = lpt_feedback.id
                LEFT JOIN static_lwp_topic slt_feedback ON slt_feedback.id = lpt_feedback."topicId"
                LEFT JOIN static_lwp_topic_domain_year_group sltdyg_feedback ON sltdyg_feedback."topicId" = slt_feedback.id
                LEFT JOIN static_lwp_topic_domain sltd_feedback ON sltd_feedback.id = sltdyg_feedback."domainId"
                CROSS JOIN constants c
                WHERE lpf."logCreatedAt" BETWEEN c.year_start AND c.year_end
                    AND (sltd_feedback."subjectId" = ssb.subject_id OR sltd_feedback."subjectId" IS NULL)
                GROUP BY ssb.student_id, ssb.subject_id
            ),
            
            -- Active parents aggregation
            active_parents_by_student AS (
                SELECT
                    ssb.student_id,
                    COUNT(DISTINCT lpp."parentId") FILTER (WHERE
                        lpp.status = 'ACTIVE'
                        AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS', 'IMPORTED')
                        AND lu."logCreatedAt" <= (SELECT year_end FROM constants)
                    ) as active_parents_count
                FROM student_subject_base ssb
                LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = ssb.student_id
                LEFT JOIN lwp_user lu ON lu.id = lpp."parentId" AND lu.type = 'PARENT'
                GROUP BY ssb.student_id
            ),
            
            -- Main yearly metrics aggregation
            yearly_metrics AS (
                SELECT
                    c.time_key,
                    ssb.student_id,
                    ssb.school_id,
                    ssb.subject_id,
                    ssb.subject_name,
                    ssb.is_pupil_premium,
                    ssb.gender,
                    ssb.ethnicity_code,
                    ssb.has_sen,
                    ssb.english_as_additional_language_status,

                    -- Direct aggregations from base CTE
                    COUNT(DISTINCT ssb.pupil_topic_id) as activities_set_count,
                    COUNT(DISTINCT ssb.pupil_topic_id) as topics_set_count,
                    COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."watchedVideo" = true) as videos_watched_count,

                    -- Activity access and completion
                    COUNT(DISTINCT lpa.id) FILTER (WHERE lpa."logCreatedAt" BETWEEN c.year_start AND c.year_end) as activities_accessed_count,
                    COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE 
                        EXISTS (
                            SELECT 1 FROM lwp_pupil_activity lpa2 
                            WHERE lpa2."topicId" = ssb.pupil_topic_id AND lpa2."earnedStar" = true
                        ) 
                        AND ssb."logUpdatedAt" BETWEEN c.year_start AND c.year_end
                    ) as topics_completed_count,
                    
                    -- Reading target sum
                    COALESCE(SUM(ssb."readingTarget"), 0) as reading_target_sum

                FROM student_subject_base ssb
                CROSS JOIN constants c
                LEFT JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id 
                    AND lpa."topicId" = ssb.pupil_topic_id
                GROUP BY c.time_key, ssb.student_id, ssb.school_id, ssb.subject_id, ssb.subject_name,
                         ssb.is_pupil_premium, ssb.gender, ssb.ethnicity_code, ssb.has_sen, ssb.english_as_additional_language_status
            )
            
            -- Final SELECT with all analytics metrics
            SELECT 
                ym.time_key as "timeKey",
                ym.student_id as "pupilId",
                ym.school_id as "schoolId", 
                ym.subject_id as "subjectId",
                ym.subject_name as "subject",
                ym.is_pupil_premium as "isPupilPremium",
                ym.gender,
                ym.has_sen as "sen",
                ym.ethnicity_code as "ethnicityCode",
                ym.english_as_additional_language_status as "englishAsAdditionalLanguage",
                
                -- Activity metrics
                (ym.activities_set_count > 0 OR ym.activities_accessed_count > 0) as "isActive",
                ym.activities_set_count as "activitiesSetCount",
                COALESCE(cabs.activities_completed_count, 0) as "activitiesCompletedCount",
                ym.activities_accessed_count as "activitiesAccessedCount",
                ym.topics_set_count as "topicsSetCount",
                ym.topics_completed_count as "topicsCompletedCount",
                ym.reading_target_sum as "readingTarget",
                ym.videos_watched_count as "videosWatchedCount",
                
                -- Feedback metrics
                COALESCE(fmbs.comments_left_by_parents_count, 0) as "parentCommentsLeftCount",
                COALESCE(fmbs.comments_left_by_pupils_count, 0) as "pupilCommentsLeftCount",
                COALESCE(fmbs.comments_left_by_teachers_count, 0) as "teacherCommentsLeftCount",
                COALESCE(fmbs.photos_uploaded_by_parents_count, 0) as "parentPhotosUploadedCount",
                COALESCE(fmbs.photos_uploaded_by_teachers_count, 0) as "teacherPhotosUploadedCount",
                COALESCE(fmbs.audio_clips_uploaded_by_parents_count, 0) as "parentAudioClipsUploadedCount",
                COALESCE(fmbs.audio_clips_uploaded_by_teachers_count, 0) as "teacherAudioClipsUploadedCount",
                
                -- Star ratings
                COALESCE(srbs.total_star_ratings_given, 0) as "starRatingsCount",
                COALESCE(srbs.sum_star_ratings, 0) as "sumStarRatings",
                COALESCE(srbs.one_star_ratings, 0) as "oneStarRatingsCount",
                COALESCE(srbs.two_star_ratings, 0) as "twoStarRatingsCount",
                COALESCE(srbs.three_star_ratings, 0) as "threeStarRatingsCount",
                COALESCE(srbs.four_star_ratings, 0) as "fourStarRatingsCount",
                COALESCE(srbs.five_star_ratings, 0) as "fiveStarRatingsCount",
                
                -- Feedback entries
                COALESCE(fmbs.parent_feedback_entries, 0) as "parentFeedbackEntries",
                COALESCE(fmbs.teacher_feedback_entries, 0) as "teacherFeedbackEntries",

                -- Active parents
                COALESCE(apbs.active_parents_count, 0) as "activeParentsCount",
                
                -- Time grain (always yearly for this extraction)
                'yearly' as "timeGrain"
                
            FROM yearly_metrics ym
            LEFT JOIN completed_activities_by_subject cabs ON cabs.student_id = ym.student_id AND cabs.subject_id = ym.subject_id
            LEFT JOIN star_ratings_by_subject srbs ON srbs.student_id = ym.student_id AND srbs.subject_id = ym.subject_id
            LEFT JOIN feedback_metrics_by_subject fmbs ON fmbs.student_id = ym.student_id AND fmbs.subject_id = ym.subject_id
            LEFT JOIN active_parents_by_student apbs ON apbs.student_id = ym.student_id
            ORDER BY ym.school_id, ym.student_id, ym.subject_id
        `;

        // Execute extraction query
        console.log('    Executing extraction query...');
        const extractResult = await extractQuery.execute(db);
        const rows = extractResult.rows;

        const duration = Date.now() - startTime;
        console.log(`    Extracted ${rows.length.toLocaleString()} records in ${Math.round(duration / 1000)}s`);
        console.log(`    Unique pupils: ${[...new Set(rows.map((r) => r.pupilId))].length.toLocaleString()}`);
        console.log(`    Unique subjects: ${[...new Set(rows.map((r) => r.subjectId))].length}`);

        return {
            rows,
            duration,
            stats: {
                totalRecords: rows.length,
                uniquePupils: [...new Set(rows.map((r) => r.pupilId))].length,
                uniqueSubjects: [...new Set(rows.map((r) => r.subjectId))].length
            }
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`    Extraction failed after ${Math.round(duration / 1000)}s:`, error.message);
        throw error;
    }
}

/**
 * Clear existing data for the academic year
 */
async function clearExistingData(db, academicYear) {
    console.log(`\n  Clearing existing ${academicYear.name} data...`);

    const startTime = Date.now();

    try {
        const deleteResult = await sql`
            DELETE FROM analytics_pupil_fact 
            WHERE "timeKey" = ${academicYear.key}
        `.execute(db);

        const duration = Date.now() - startTime;
        const deletedCount = deleteResult.numDeletedRows || 0;

        console.log(`    Deleted ${deletedCount.toLocaleString()} existing records in ${Math.round(duration / 1000)}s`);

        return { deletedCount, duration };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`    Deletion failed after ${Math.round(duration / 1000)}s:`, error.message);
        throw error;
    }
}

/**
 * Insert data in batches for memory management
 */
async function insertDataInBatches(db, rows, academicYear) {
    console.log(`\n Inserting ${rows.length.toLocaleString()} records in batches...`);
    console.log(`   Batch size: ${BATCH_INSERT_SIZE.toLocaleString()} records`);

    const startTime = Date.now();
    let totalInserted = 0;

    try {
        for (let i = 0; i < rows.length; i += BATCH_INSERT_SIZE) {
            const batch = rows.slice(i, i + BATCH_INSERT_SIZE);

            // Clean and validate batch data, applying encryption to pupilId
            const cleanBatch = batch.map((row) => {
                // Convert any undefined values to null and ensure proper types
                const cleanRow = {};
                Object.keys(row).forEach((key) => {
                    let value = row[key];

                    // Handle undefined values
                    if (value === undefined) {
                        value = null;
                    }

                    // Handle boolean conversions
                    if (typeof value === 'string' && (value === 'true' || value === 'false')) {
                        value = value === 'true';
                    }

                    // Encrypt pupilId for anonymization
                    if (key === 'pupilId' && value !== null) {
                        // value = encryptStudentId(value);
                        value = BigInt(value);
                    }

                    cleanRow[key] = value;
                });

                return cleanRow;
            });

            // Insert batch
            await db.insertInto('analytics_pupil_fact').values(cleanBatch).execute();

            totalInserted += batch.length;

            // Progress indicator
            if (totalInserted % 10000 === 0 || i + BATCH_INSERT_SIZE >= rows.length) {
                const progress = Math.round((totalInserted / rows.length) * 100);
                console.log(`    Progress: ${totalInserted.toLocaleString()}/${rows.length.toLocaleString()} (${progress}%)`);
            }
        }

        const duration = Date.now() - startTime;
        console.log(`    Successfully inserted ${totalInserted.toLocaleString()} records in ${Math.round(duration / 1000)}s`);

        return { insertedCount: totalInserted, duration };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`    Insert failed after ${Math.round(duration / 1000)}s:`, error.message);
        console.error(`    Failed at record ${totalInserted.toLocaleString()}`);
        throw error;
    }
}

/**
 * Process analytics for multiple academic years (simplified, no batching)
 */
async function processSimplifiedAnalytics() {
    console.log(' Starting simplified analytics extraction and import...');
    console.log(' Configuration:');
    console.log(`   Academic years: ${ACADEMIC_YEARS.map((y) => y.name).join(', ')}`);
    console.log(`   Method: Single query per year (no pupil ID batching)`);
    console.log(`   Approach: Clean delete → Extract all → Insert in batches`);
    console.log(`   Query timeout: 50 minutes per year`);
    console.log(`   Student ID anonymization: ENABLED`);

    // Verify encryption key is available
    try {
        getEncryptionKey();
        console.log(`   Encryption: AES-256-GCM with ${ENCRYPTION_CONFIG.keyLength * 8}-bit key`);
    } catch (error) {
        console.error(`   Encryption key error: ${error.message}`);
        console.error(`   Please set STUDENT_ID_ENCRYPTION_KEY environment variable (64 hex characters)`);
        throw error;
    }

    const config = getSnapshotConfig();
    console.log(`\n Database config: ${config.host}/${config.database} (user: ${config.user})`);

    // Create database connection
    const db = createPostgresClient(config);

    try {
        // Test connection
        console.log('\n Testing database connection...');
        try {
            const testResult = await sql`SELECT current_database(), current_user, version()`.execute(db);
            console.log(`    Database: ${testResult.rows[0].current_database}`);
            console.log(`    User: ${testResult.rows[0].current_user}`);
            console.log(`    Version: ${testResult.rows[0].version.split(',')[0]}`);
        } catch (connError) {
            console.error(`    Connection test failed:`, connError.message);
            throw connError;
        }

        const overallStartTime = Date.now();
        const yearResults = [];

        // Process each academic year sequentially
        for (let i = 0; i < ACADEMIC_YEARS.length; i++) {
            const academicYear = ACADEMIC_YEARS[i];

            console.log(`\n${'='.repeat(80)}`);
            console.log(` Processing Academic Year ${i + 1}/${ACADEMIC_YEARS.length}: ${academicYear.name}`);
            console.log(`${'='.repeat(80)}`);

            const yearStartTime = Date.now();

            try {
                // Step 1: Clear existing data for this year
                const deleteResult = await clearExistingData(db, academicYear);

                // Step 2: Generate school ID ranges
                const schoolIdRanges = generateSchoolIdRanges(SCHOOL_ID_RANGE.min, SCHOOL_ID_RANGE.max, SCHOOL_BATCHES);
                console.log(`\n Generated ${schoolIdRanges.length} school ID ranges for batching`);

                let totalExtracted = 0;
                let totalInserted = 0;
                const uniquePupilsSet = new Set();
                const uniqueSubjectsSet = new Set();

                // Step 3: Process each school ID range
                for (let batchIndex = 0; batchIndex < schoolIdRanges.length; batchIndex++) {
                    const schoolIdRange = schoolIdRanges[batchIndex];

                    console.log(`\n   Batch ${batchIndex + 1}/${schoolIdRanges.length}: ${schoolIdRange.description}`);

                    // Extract data for this school ID range
                    const extractResult = await extractPupilFactData(db, academicYear, schoolIdRange);
                    totalExtracted += extractResult.stats.totalRecords;

                    if (extractResult.rows.length > 0) {
                        // Track unique pupils and subjects across batches
                        extractResult.rows.forEach((row) => {
                            uniquePupilsSet.add(row.pupilId);
                            uniqueSubjectsSet.add(row.subjectId);
                        });

                        // Insert data in batches
                        const insertResult = await insertDataInBatches(db, extractResult.rows, academicYear);
                        totalInserted += insertResult.insertedCount;
                    } else {
                        console.log(`     No records for this school ID range`);
                    }
                }

                const yearDuration = Date.now() - yearStartTime;

                const yearResult = {
                    success: true,
                    academicYear: academicYear.name,
                    stats: {
                        deletedRecords: deleteResult.deletedCount,
                        extractedRecords: totalExtracted,
                        insertedRecords: totalInserted,
                        schoolBatches: schoolIdRanges.length,
                        uniquePupils: uniquePupilsSet.size,
                        uniqueSubjects: uniqueSubjectsSet.size
                    },
                    performance: {
                        deleteTime: deleteResult.duration,
                        totalTime: yearDuration
                    }
                };

                yearResults.push(yearResult);

                console.log(`\n  Completed ${academicYear.name} in ${Math.round(yearDuration / 1000)}s`);
                console.log(`    Records: ${totalInserted.toLocaleString()}`);
                console.log(`    School batches: ${schoolIdRanges.length}`);
            } catch (error) {
                console.error(`\n  Failed processing ${academicYear.name}:`, error.message);

                yearResults.push({
                    success: false,
                    academicYear: academicYear.name,
                    error: error.message,
                    failedAt: new Date().toISOString()
                });

                // Continue with next year instead of stopping
                continue;
            }
        }

        // Overall Summary
        const overallDuration = Date.now() - overallStartTime;
        const successfulYears = yearResults.filter((r) => r.success);
        const failedYears = yearResults.filter((r) => !r.success);

        console.log(`\n${'='.repeat(80)}`);
        console.log('  MULTI-YEAR ANALYTICS COMPLETED!');
        console.log(`${'='.repeat(80)}`);

        console.log(` Overall Summary:`);
        console.log(`   Total academic years: ${ACADEMIC_YEARS.length}`);
        console.log(`   Successful: ${successfulYears.length}`);
        console.log(`   Failed: ${failedYears.length}`);
        console.log(`   Total duration: ${Math.round(overallDuration / 60000)} minutes`);

        if (successfulYears.length > 0) {
            console.log(`\n  Successful Years:`);
            successfulYears.forEach((result) => {
                console.log(`   ${result.academicYear}:`);
                console.log(`     Records: ${result.stats.insertedRecords.toLocaleString()}`);
                console.log(`     Pupils: ${result.stats.uniquePupils.toLocaleString()}`);
                console.log(`     Duration: ${Math.round(result.performance.totalTime / 1000)}s`);
            });

            const totalRecords = successfulYears.reduce((sum, r) => sum + r.stats.insertedRecords, 0);
            const totalPupils = successfulYears.reduce((sum, r) => sum + r.stats.uniquePupils, 0);

            console.log(`\n    Totals across all successful years:`);
            console.log(`     Total records: ${totalRecords.toLocaleString()}`);
            console.log(`     Total unique pupils: ${totalPupils.toLocaleString()}`);
        }

        if (failedYears.length > 0) {
            console.log(`\n  Failed Years:`);
            failedYears.forEach((result) => {
                console.log(`   ${result.academicYear}: ${result.error}`);
            });
        }

        return {
            success: successfulYears.length > 0,
            overallDuration,
            yearResults,
            summary: {
                totalYears: ACADEMIC_YEARS.length,
                successfulYears: successfulYears.length,
                failedYears: failedYears.length,
                totalRecords: successfulYears.reduce((sum, r) => sum + r.stats.insertedRecords, 0),
                totalPupils: successfulYears.reduce((sum, r) => sum + r.stats.uniquePupils, 0)
            }
        };
    } catch (error) {
        console.error('\n Simplified analytics failed:', error.message);
        throw error;
    } finally {
        await db.destroy();
    }
}

// Main execution
if (require.main === module) {
    processSimplifiedAnalytics()
        .then((result) => {
            console.log('\n Analytics processing completed successfully!');
            console.log(
                `✨ Processed ${result?.stats?.extractedRecords?.toLocaleString()} records for ${result?.stats?.uniquePupils?.toLocaleString()} pupils`
            );
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n Analytics processing failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    processSimplifiedAnalytics,
    extractPupilFactData,
    clearExistingData,
    insertDataInBatches,
    getSnapshotConfig,
    encryptStudentId,
    decryptStudentId
};
