/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDeletedAtColumnsPart1a1739965431243 implements MigrationInterface {
    name = 'RemoveDeletedAtColumnsPart1a1739965431243';

    DELETABLE_TABLES = [
        'static_lwp_interstitial',
        'lwp_user_interstitial',
        'lwp_pupil_parent',
        'lwp_school_holiday',
        'static_lwp_program',
        'lwp_demo_activity_feedback',
        'lwp_pupil_topic',
        'lwp_pupil_activity',
        'static_lwp_activity_tag',
        'static_lwp_activity',
        'static_lwp_activity_steps',
        'static_lwp_topic_tag',
        'static_lwp_subject',
        'static_lwp_topic_domain',
        'static_lwp_topic',
        'static_lwp_school_tag',
        'lwp_school',
        'lwp_user_associated_login',
        'lwp_user',
        'lwp_feedback_reply',
        'lwp_pupil_feedback_media',
        'lwp_pupil_feedback',
        'lwp_pupil_tag',
        'lwp_pupil',
        'lwp_school_class',
        'lwp_class_topic',
        'static_lwp_email_template'
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const tblName of this.DELETABLE_TABLES) {
            await queryRunner.query(`DELETE FROM "${tblName}" WHERE "deletedAt" IS NOT NULL;`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
