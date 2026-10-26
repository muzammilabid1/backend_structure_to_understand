import { DatabaseService } from './dbSetup.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbService = new DatabaseService();

const getParentPupilTopicDataForReadingLog = async () => {
    try {
        await dbService.connect();

        const query = `
    select distinct on (lpp."parentId")
        lu."email" as "parentEmail",
        lpp."parentId" as "parentId",
        lcp."lwpPupilId" as "pupilId",
        lpt."id" as "topicId"
    from lwp_school_class lsc
    join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id and lsc."IsReadingLogsEnabled"
    join lwp_pupil_parent lpp on lpp."pupilId" = lcp."lwpPupilId"
    join lwp_pupil_topic lpt on lpt."pupilId" = lcp."lwpPupilId"
    join lwp_school ls on ls."id" = lsc."schoolId"
    join lwp_user lu on lu."id" = lpp."parentId"
    join lwp_pupil_feedback lpf on lpf."userId" = lpp."parentId"
    where lsc."isFullProgramme"
        and lu."type" = 'PARENT'
        and not ls."isTestSchool"
        and EXTRACT(YEAR FROM lpf."logCreatedAt") = 2025
        and lu."password" is not null
    ORDER BY lpp."parentId", lpt."releaseDate" DESC
        `;

        const result = await dbService.query(query);
        await dbService.close();

        if (result.rows.length === 0) {
            console.log(
                'No test data found. Please ensure there are active parent users with pupils and topics.',
            );
            return [];
        }

        console.log(`Found ${result.rows.length} test data records`);

        // Create test user objects with only essential fields
        const testUsers = result.rows.map((row) => ({
            parentEmail: row.parentEmail,
            parentPassword: 'password',
            parentId: row.parentId,
            pupilId: row.pupilId,
            topicId: row.topicId,
        }));

        console.log(`Generated ${testUsers.length} test user combinations`);

        return testUsers;
    } catch (error) {
        console.error('Error getting test data from database:', error.message);
        console.error('Full error details (for debugging):', error);

        return [];
    } finally {
        try {
            await dbService.close();
        } catch (closeError) {
            console.error(
                'Error closing database connection:',
                closeError.message,
            );
        }
    }
};

const getTeacherAddReadingLogData = async () => {
    try {
        await dbService.connect();

        const query = `
            SELECT DISTINCT ON (lu."id")
                lu."email",
                lu."id",
                lu."schoolId"
            FROM lwp_user lu
            JOIN lwp_school ls ON ls."id" = lu."schoolId"
            JOIN lwp_school_class lsc ON lsc."schoolId" = lu."schoolId"
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            WHERE lu."schoolId" IS NOT NULL
                AND lu."type" = 'TEACHER'
                AND lsc."IsReadingLogsEnabled" = TRUE
                AND lsc."isFullProgramme" = TRUE
                AND NOT ls."isTestSchool"
                AND lu."password" IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM lwp_pupil_feedback lpf
                    WHERE lpf."userId" = lu."id"
                    AND EXTRACT(YEAR FROM lpf."logCreatedAt") = EXTRACT(YEAR FROM CURRENT_DATE)
                )
            -- filter teachers without pupils
            and lcp."lwpPupilId" is not null
            ORDER BY lu."id";
        `;

        const result = await dbService.query(query);
        await dbService.close();

        if (result.rows.length === 0) {
            console.log(
                'No teacher test data found. Please ensure there are active teachers with schools and classes.',
            );
            return [];
        }

        console.log(`Found ${result.rows.length} teacher test data records`);

        const testUsers = result.rows.map((row) => ({
            teacherEmail: row.email,
            teacherPassword: 'password',
            teacherId: row.id.toString(),
            schoolId: row.schoolId.toString()
        }));

        console.log(
            `Generated ${testUsers.length} teacher test user combinations`,
        );

        return testUsers;
    } catch (error) {
        console.error(
            'Error generating teacher add reading log test data:',
            error.message,
        );
        await dbService.close();
        throw error;
    }
};

const getTeacherAssigningStickerOnActivityFeedData = async () => {
    try {
        await dbService.connect();

        const query = `
            SELECT DISTINCT ON (lu."id")
                lu."email",
                lu."id",
                lu."schoolId"
            FROM lwp_user lu
            JOIN lwp_school ls ON ls."id" = lu."schoolId"
            	and lu."lastLogin" is not null
            	and lu."type" = 'TEACHER'
                AND lu."password" IS NOT null
            JOIN lwp_school_class lsc ON lsc."schoolId" = lu."schoolId"
            	AND lsc."IsReadingLogsEnabled" = TRUE
                AND NOT ls."isTestSchool"
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            join lwp_sticker lss on ls.id = lss."schoolId"
            WHERE lu."schoolId" IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM lwp_pupil_feedback lpf
                    join lwp_user lu on lpf."userId" = lu.id
                    WHERE lpf."userId" = lu."id"
                    AND EXTRACT(YEAR FROM lpf."logCreatedAt") = EXTRACT(YEAR FROM CURRENT_DATE)
                    and lpf."userType" = 'PARENT'
                )
            ORDER by lu."id";
            `;

        const result = await dbService.query(query);
        await dbService.close();

        if (result.rows.length === 0) {
            console.log(
                'No teacher test data found. Please ensure there are active teachers with schools and classes that have feedbacks.',
            );
            return [];
        }

        console.log(`Found ${result.rows.length} teacher test data records`);

        const testUsers = result.rows.map((row) => ({
            teacherEmail: row.email,
            teacherPassword: 'password',
            teacherId: row.id,
            schoolId: row.schoolId,
        }));

        console.log(
            `Generated ${testUsers.length} teacher test user combinations`,
        );

        return testUsers;
    } catch (error) {
        console.error(
            'Error generating teacher assigning sticker on activity feed test data:',
            error.message,
        );
        await dbService.close();
        throw error;
    }
};

const getTeacherLeavingCommentOnActivityFeedData = async () => {
    try {
        await dbService.connect();

        const query = `
with teacher_data as (SELECT DISTINCT ON (lu."id")
                lu."email",
                lu."id",
                lu."schoolId",
                lu."lastLogin"
            FROM lwp_user lu
            JOIN lwp_school ls ON ls."id" = lu."schoolId"
	            AND lu."lastLogin" >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
	            and ls."curentPeriodIndex" = EXTRACT(YEAR FROM CURRENT_DATE) - 1 -- for previous year
            	and lu."type" = 'TEACHER'
                AND lu."password" IS NOT null
                and lu."userStatus" = 'ACTIVE'
                and (ls."inactive" = false OR ls."inactive" IS NULL)
            JOIN lwp_school_class lsc ON lsc."schoolId" = lu."schoolId"
            	AND lsc."IsReadingLogsEnabled" = TRUE
                AND NOT ls."isTestSchool"
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            WHERE lu."schoolId" IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM lwp_pupil_feedback lpf
                    join lwp_user lu on lpf."userId" = lu.id
                    WHERE lpf."userId" = lu."id"
                    and lpf."userType" = 'PARENT'
                )
            ORDER by lu."id"
	) select * from teacher_data order by teacher_data."lastLogin" desc limit 500;
            `;

        const result = await dbService.query(query);
        await dbService.close();

        if (result.rows.length === 0) {
            console.log(
                'No teacher test data found. Please ensure there are active teachers with schools and classes that have feedbacks.',
            );
            return [];
        }

        console.log(`Found ${result.rows.length} teacher test data records`);

        const testUsers = result.rows.map((row) => ({
            teacherEmail: row.email,
            teacherPassword: 'password',
            teacherId: row.id,
            schoolId: row.schoolId,
        }));

        console.log(
            `Generated ${testUsers.length} teacher test user combinations`,
        );

        return testUsers;
    } catch (error) {
        console.error(
            'Error generating teacher assigning sticker on activity feed test data:',
            error.message,
        );
        await dbService.close();
        throw error;
    }
};

const getTeacherTopicSchedulingData = async () =>  {
    try {
        await dbService.connect();

        const query = `
            with teacher_data as (SELECT DISTINCT ON (lu."id")
                lu."email",
                lu."id",
                lu."schoolId",
                lu."lastLogin"
            FROM lwp_user lu
            JOIN lwp_school ls ON ls."id" = lu."schoolId"
	            AND lu."lastLogin" >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
	            and ls."curentPeriodIndex" = EXTRACT(YEAR FROM CURRENT_DATE) - 1 -- for previous year
            	and lu."type" = 'TEACHER'
                AND lu."password" IS NOT null
                and lu."userStatus" = 'ACTIVE'
                and (ls."inactive" = false OR ls."inactive" IS null)
            JOIN lwp_school_class lsc ON lsc."schoolId" = lu."schoolId"
            	and lsc."isFullProgramme"
                AND NOT ls."isTestSchool"
            ORDER by lu."id"
	    )   select * from teacher_data order by teacher_data."lastLogin" desc limit 500;
            `;

        const result = await dbService.query(query);
        await dbService.close();

        if (result.rows.length === 0) {
            console.log(
                'No teacher test data found. Please ensure there are active teachers with schools and classes that have feedbacks.',
            );
            return [];
        }

        console.log(`Found ${result.rows.length} teacher test data records`);

        const testUsers = result.rows.map((row) => ({
            teacherEmail: row.email,
            teacherPassword: 'password',
            teacherId: row.id,
            schoolId: row.schoolId,
        }));

        console.log(
            `Generated ${testUsers.length} teacher test user combinations`,
        );

        return testUsers;
    } catch (error) {
        console.error(
            'Error generating teacher scheduling topics test data:',
            error.message,
        );
        await dbService.close();
        throw error;
    }
};

// Test name to function mapping
const testDataGenerators = {
    readingLog: {
        func: getParentPupilTopicDataForReadingLog,
        filename: 'reading-log-data.json',
        description: 'Parent/pupil/topic data for reading log tests',
    },
    teacherAddReadingLog: {
        func: getTeacherAddReadingLogData,
        filename: 'teacher-add-reading-log-data.json',
        description: 'Teacher data for reading log tests',
    },
    teacherAssigningStickerOnActivityFeed: {
        func: getTeacherAssigningStickerOnActivityFeedData,
        filename: 'teacher-assigning-sticker-on-activity-feed-data.json',
        description:
            'Teacher data for assigning sticker on activity feed tests',
    },
    teacherLeavingCommentOnActivityFeed: {
        func: getTeacherLeavingCommentOnActivityFeedData,
        filename: 'teacher-leaving-comment-on-activity-feed-data.json',
        description: 'Teacher data for leaving comment on activity feed tests',
    },
    teacherTopicScheduling: {
        func: getTeacherTopicSchedulingData,
        filename: 'teacher-topic-scheduling-data.json',
        description: 'Teacher data for topic scheduling tests',
    },
};

async function saveTestData(data, filename) {
    const tempDir = path.join(__dirname, 'temp-data');

    // Ensure temp-data directory exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save data to JSON file
    const filepath = path.join(tempDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Test data saved to: ${filepath}`);
}

async function main() {
    try {
        // Get test name from command line arguments
        const testName = process.argv[2];

        if (!testName) {
            console.error('Error: Test name is required');
            console.log('');
            console.log('Available test names:');
            Object.entries(testDataGenerators).forEach(([name, config]) => {
                console.log(`  ${name.padEnd(12)} - ${config.description}`);
            });
            console.log('');
            console.log('Usage: node getTestData.js <test-name>');
            console.log('Example: node getTestData.js readingLog');
            process.exit(1);
        }

        // Validate test name
        if (!testDataGenerators[testName]) {
            console.error(`Error: Unknown test name '${testName}'`);
            console.log('');
            console.log('Available test names:');
            Object.entries(testDataGenerators).forEach(([name, config]) => {
                console.log(`  ${name.padEnd(12)} - ${config.description}`);
            });
            process.exit(1);
        }

        const testConfig = testDataGenerators[testName];

        console.log(`Starting test data generation for: ${testName}`);
        console.log(`Description: ${testConfig.description}`);

        // Generate data using the mapped function
        const data = await testConfig.func();

        // Save to temp-data folder with test-specific filename
        await saveTestData(data, testConfig.filename);

        console.log('✅ Test data generation completed successfully!');

    } catch (error) {
        console.error('❌ Error generating test data:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
export {
    getParentPupilTopicDataForReadingLog,
    getTeacherAddReadingLogData,
    getTeacherAssigningStickerOnActivityFeedData,
    getTeacherLeavingCommentOnActivityFeedData,
    getTeacherTopicSchedulingData,
    };
