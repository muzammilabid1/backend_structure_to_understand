/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetClassIdAndClassTopicIdToNullInPupilTopic1765959397495 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Create backup table to preserve records before updating
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "backup_20251218_can_be_deleted_20260618_lwp_8716_remove_class_and_class_topic_id" (
                "pupil_topic_id" BIGINT NOT NULL,
                "class_id" BIGINT,
                "class_topic_id" BIGINT,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Step 2: Insert records that will be updated into the backup table
        // This captures all records matching the three conditions below before they are modified
        await queryRunner.query(`
            -- Insert those records in the backup table that meet any of the following conditions:
            -- 1. The pupil topic is linked to a class where the pupil is not enrolled in that class.
            -- 2. Either classId or classTopicId is NULL (but not both).
            -- 3. The classId in lwp_pupil_topic does not match the classId in lwp_class_topic.

            INSERT INTO "backup_20251218_can_be_deleted_20260618_lwp_8716_remove_class_and_class_topic_id" 
            ("pupil_topic_id", "class_id", "class_topic_id")
            SELECT 
                lpt."id",
                lpt."classId",
                lpt."classTopicId"
            FROM 
                lwp_pupil_topic AS lpt
            WHERE 
                -- Case 1: The pupil topic is linked to a class where the pupil is not enrolled in that class
                lpt."id" IN (
                    SELECT 
                        DISTINCT lpt2."id"
                    FROM 
                        lwp_pupil_topic AS lpt2
                    LEFT JOIN 
                        lwp_class_pupil AS lcp 
                        ON lcp."lwpPupilId" = lpt2."pupilId" 
                        AND lcp."lwpSchoolClassId" = lpt2."classId"
                    WHERE 
                        lpt2."classTopicId" IS NOT NULL
                        AND lpt2."classId" IS NOT NULL
                        AND lcp."lwpPupilId" IS NULL    
                )
                -- Case 2: Either classId or classTopicId is NULL, but not both
                OR (
                    (lpt."classId" IS NULL AND lpt."classTopicId" IS NOT NULL) 
                    OR (lpt."classTopicId" IS NULL AND lpt."classId" IS NOT NULL)
                )
                -- Case 3: classId does not match the classId in lwp_class_topic
                OR lpt."id" IN (
                    SELECT lpt2.id
                    FROM lwp_pupil_topic lpt2
                    JOIN lwp_class_topic lct ON lct.id = lpt2."classTopicId"
                    WHERE lpt2."classId" <> lct."classId"
                );
        `);

        // Step 3: Set classId and classTopicId to NULL for records that exist in the backup table
        await queryRunner.query(`
            UPDATE 
                lwp_pupil_topic AS lpt
            SET 
                "classId" = NULL, 
                "classTopicId" = NULL
            WHERE 
                lpt."id" IN (
                    SELECT "pupil_topic_id" 
                    FROM "backup_20251218_can_be_deleted_20260618_lwp_8716_remove_class_and_class_topic_id"
                );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
