import {MigrationInterface, QueryRunner} from "typeorm";

export class AddAnalyticsTables1755591956430 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create analytics_time_dim table
        await queryRunner.query(`
            CREATE TABLE analytics_time_dim (
                "timeKey" integer NOT NULL,
                "timeGrain" varchar(20) NOT NULL CHECK ("timeGrain" IN ('weekly', 'monthly', 'yearly')),
                "academicYear" integer,
                "academicTerm" varchar,
                "calendarYear" integer,
                "calendarMonth" integer,
                "weekNumber" integer,
                "periodStartDate" date,
                "periodEndDate" date,
                "termWeekNumber" integer,
                "periodDescription" varchar,
                "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("timeKey", "timeGrain")
            )
        `);

        // Create analytics_school_groups_dim table
        await queryRunner.query(`
            CREATE TABLE analytics_school_groups_dim (
                "groupId" bigserial PRIMARY KEY,
                "groupType" varchar NOT NULL CHECK ("groupType" IN ('region', 'local_authority', 'trust', 'custom')),
                "groupName" varchar NOT NULL,
                "description" varchar,
                "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create analytics_schools_in_groups_dim table
        await queryRunner.query(`
            CREATE TABLE analytics_schools_in_groups_dim (
                "id" bigserial PRIMARY KEY,
                "groupId" bigint NOT NULL REFERENCES analytics_school_groups_dim("groupId") ON DELETE CASCADE,
                "schoolId" bigint NOT NULL REFERENCES lwp_school(id) ON DELETE CASCADE,
                "region" varchar,
                "localAuthority" varchar,
                "addedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("groupId", "schoolId")
            )
        `);

        // Create analytics_pupil_fact table (renamed from analytics_student_metrics_fact)
        // Note: sen is boolean - true when sen_status is not null and not in ('N', 'N,', ''), false otherwise
        // For schools not sharing SEN data, use 'Unknown' for sen, ethnicityCode, and englishAsAdditionalLanguage
        // Using ON DELETE SET NULL for anonymized data retention after original records are deleted
        await queryRunner.query(`
            CREATE TABLE analytics_pupil_fact (
                "id" bigserial PRIMARY KEY,
                "pupilId" bigint REFERENCES lwp_pupil(id) ON DELETE SET NULL,
                "schoolId" bigint REFERENCES lwp_school(id) ON DELETE SET NULL,
                "timeKey" integer NOT NULL,
                "timeGrain" varchar(20) NOT NULL CHECK ("timeGrain" IN ('weekly', 'monthly', 'yearly')),
                "subjectId" bigint,
                "isActive" boolean,
                "activitiesSetCount" integer DEFAULT 0,
                "activitiesCompletedCount" integer DEFAULT 0,
                "activitiesAccessedCount" integer DEFAULT 0,
                "topicsSetCount" integer DEFAULT 0,
                "topicsCompletedCount" integer DEFAULT 0,
                "readingTarget" integer DEFAULT 0,
                "videosWatchedCount" integer DEFAULT 0,
                "parentCommentsLeftCount" integer DEFAULT 0,
                "pupilCommentsLeftCount" integer DEFAULT 0,
                "teacherCommentsLeftCount" integer DEFAULT 0,
                "parentPhotosUploadedCount" integer DEFAULT 0,
                "teacherPhotosUploadedCount" integer DEFAULT 0,
                "parentAudioClipsUploadedCount" integer DEFAULT 0,
                "teacherAudioClipsUploadedCount" integer DEFAULT 0,
                "starRatingsCount" integer DEFAULT 0,
                "sumStarRatings" integer DEFAULT 0,
                "oneStarRatingsCount" integer DEFAULT 0,
                "twoStarRatingsCount" integer DEFAULT 0,
                "threeStarRatingsCount" integer DEFAULT 0,
                "fourStarRatingsCount" integer DEFAULT 0,
                "fiveStarRatingsCount" integer DEFAULT 0,
                "parentFeedbackEntries" integer DEFAULT 0,
                "teacherFeedbackEntries" integer DEFAULT 0,
                "subject" varchar,
                "isPupilPremium" boolean,
                "gender" varchar,
                "ethnicityCode" varchar,
                "sen" boolean,
                "englishAsAdditionalLanguage" varchar,
                "activeParentsCount" integer DEFAULT 0,
                "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("pupilId", "schoolId", "timeKey", "timeGrain", "subjectId")
            )
        `);

        // Create analytics_pupil_dim table for student segments
        await queryRunner.query(`
            CREATE TABLE analytics_pupil_dim (
                "segmentId" bigserial PRIMARY KEY,
                "segmentType" varchar(50) NOT NULL,
                "segmentValue" varchar(100) NOT NULL,
                "segmentDescription" varchar(255),
                "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("segmentType", "segmentValue")
            )
        `);

        // Insert default segments for analytics_pupil_dim
        await queryRunner.query(`
            INSERT INTO analytics_pupil_dim ("segmentType", "segmentValue", "segmentDescription") VALUES
            ('all', 'all_students', 'All students combined'),
            ('pupil_premium', 'pp', 'Pupil Premium students only'),
            ('pupil_premium', 'non_pp', 'Non-Pupil Premium students only'),
            ('gender', 'male', 'Male students only'),
            ('gender', 'female', 'Female students only'),
            ('sen', 'sen', 'Students with Special Educational Needs'),
            ('sen', 'non_sen', 'Students without Special Educational Needs'),
            ('eal', 'eal', 'English as Additional Language students'),
            ('eal', 'non_eal', 'Non-EAL students')
            ON CONFLICT ("segmentType", "segmentValue") DO NOTHING
        `);

        // Create analytics_content_fact table
        await queryRunner.query(`
            CREATE TABLE analytics_content_fact (
                "id" bigserial PRIMARY KEY,
                "timeKey" integer NOT NULL,
                "timeGrain" varchar(20) NOT NULL CHECK ("timeGrain" IN ('weekly', 'monthly', 'yearly')),
                "activityId" bigint REFERENCES static_lwp_activity(id) ON DELETE SET NULL,
                "topicId" bigint REFERENCES static_lwp_topic(id) ON DELETE SET NULL,
                "segmentId" bigint NOT NULL REFERENCES analytics_pupil_dim("segmentId") ON DELETE CASCADE,
                "subject" varchar(100),
                "subjectIds" bigint[],
                "domains" varchar(100)[],
                "domainIds" bigint[],
                "yearGroups" varchar(50)[],
                "yearGroupIds" bigint[],
                "activityName" varchar(255),
                "activityOrder" integer,
                "topicName" varchar(255),
                "parentTopicName" varchar(255),
                "totalAssignmentsCount" integer DEFAULT 0,
                "completedAssignmentsCount" integer DEFAULT 0,
                "accessedAssignmentsCount" integer DEFAULT 0,
                "oneStarRatingsCount" integer DEFAULT 0,
                "twoStarRatingsCount" integer DEFAULT 0,
                "threeStarRatingsCount" integer DEFAULT 0,
                "fourStarRatingsCount" integer DEFAULT 0,
                "fiveStarRatingsCount" integer DEFAULT 0,
                "ratingsCount" integer DEFAULT 0,
                "totalRatingsSum" integer DEFAULT 0,
                "countParentComments" integer DEFAULT 0,
                "countTeacherComments" integer DEFAULT 0,
                "countPupilComments" integer DEFAULT 0,
                "photosUploadedCount" integer DEFAULT 0,
                "audioClipsUploadedCount" integer DEFAULT 0,
                "uniqueStudentsAssigned" integer DEFAULT 0,
                "uniqueStudentsCompleted" integer DEFAULT 0,
                "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("timeKey", "timeGrain", "activityId", "topicId", "segmentId")
            )
        `);

        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_time ON analytics_pupil_fact("timeKey", "timeGrain")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_school ON analytics_pupil_fact("schoolId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_pupil ON analytics_pupil_fact("pupilId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_subject ON analytics_pupil_fact("subjectId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_active ON analytics_pupil_fact("isActive") WHERE "isActive" = true`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_pp ON analytics_pupil_fact("isPupilPremium")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_fact_school_time ON analytics_pupil_fact("schoolId", "timeKey", "timeGrain")`);
        
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_time ON analytics_content_fact("timeKey", "timeGrain")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_segment ON analytics_content_fact("segmentId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_activity ON analytics_content_fact("activityId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_topic ON analytics_content_fact("topicId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_subject ON analytics_content_fact("subject")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_assignments ON analytics_content_fact("totalAssignmentsCount") WHERE "totalAssignmentsCount" > 0`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_time_segment ON analytics_content_fact("timeKey", "segmentId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_activity_time ON analytics_content_fact("activityId", "timeKey")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_content_fact_topic_segment ON analytics_content_fact("topicId", "segmentId")`);
        
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_dim_type ON analytics_pupil_dim("segmentType")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_pupil_dim_value ON analytics_pupil_dim("segmentValue")`);
        
        await queryRunner.query(`CREATE INDEX idx_analytics_schools_in_groups_dim_school ON analytics_schools_in_groups_dim("schoolId")`);
        await queryRunner.query(`CREATE INDEX idx_analytics_schools_in_groups_dim_group ON analytics_schools_in_groups_dim("groupId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_time`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_school`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_pupil`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_subject`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_active`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_pp`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_fact_school_time`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_time`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_segment`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_activity`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_topic`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_subject`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_assignments`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_time_segment`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_activity_time`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_content_fact_topic_segment`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_dim_type`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_pupil_dim_value`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_schools_in_groups_dim_school`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_analytics_schools_in_groups_dim_group`);

        // Drop tables in reverse order to handle dependencies
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_content_fact`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_pupil_fact`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_pupil_dim`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_schools_in_groups_dim`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_school_groups_dim`);
        await queryRunner.query(`DROP TABLE IF EXISTS analytics_time_dim`);
    }

}