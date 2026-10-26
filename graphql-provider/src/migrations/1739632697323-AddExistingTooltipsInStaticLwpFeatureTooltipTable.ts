import { ContentStatus, FeatureTooltipTargets } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExistingTooltipsInStaticLwpFeatureTooltipTable1739632697323 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO static_lwp_feature_tooltip 
            (name, "targetId", "order", message, "imageUrl", "userTypes", status)
            VALUES 
            ('Child Switch', '${FeatureTooltipTargets.CHILD_SWITCH}', 1, 'Use the menu to switch between your children!', 'switch_between.svg', '["PARENT"]', '${ContentStatus.PUBLISHED}'),
            ('Topic Library', '${FeatureTooltipTargets.TOPIC_LIBRARY}', 1, 'Set topics for classes and groups from one place', 'Puzzle.svg', '["TEACHER"]', '${ContentStatus.PUBLISHED}'),
            ('School Reading Log', '${FeatureTooltipTargets.SCHOOL_READING_LOG}', 2, 'Quickly record reading with one or several pupils', 'Book_Open_Purple.png', '["TEACHER"]', '${ContentStatus.PUBLISHED}'),
            ('Mark All Feedback as Read', '${FeatureTooltipTargets.TICK_ALL_FEEDBACK_AS_READ}', 3, 'You can now mark all activities/reading log entries as read', NULL, '["TEACHER"]', '${ContentStatus.PUBLISHED}'),
            ('Mark Feedback as Read', '${FeatureTooltipTargets.TICK_SINGLE_FEEDBACK_AS_READ}', 4, 'You can mark single activity/reading log entry as read', NULL, '["TEACHER"]', '${ContentStatus.PUBLISHED}'),
            ('Reply to Feedback', '${FeatureTooltipTargets.REPLY_ON_FEEDBACK}', 5, 'You can now reply on activity/reading log entry.', NULL, '["TEACHER"]', '${ContentStatus.PUBLISHED}'),
            ('Award Stickers', '${FeatureTooltipTargets.AWARD_STICKERS_TO_FEEDBACK}', 6, 'You can now send sticker on activity/reading log entry.', NULL, '["TEACHER"]', '${ContentStatus.PUBLISHED}');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM static_lwp_feature_tooltip 
            WHERE "targetId" IN (
                '${FeatureTooltipTargets.CHILD_SWITCH}',
                '${FeatureTooltipTargets.TOPIC_LIBRARY}',
                '${FeatureTooltipTargets.SCHOOL_READING_LOG}',
                '${FeatureTooltipTargets.TICK_ALL_FEEDBACK_AS_READ}',
                '${FeatureTooltipTargets.TICK_SINGLE_FEEDBACK_AS_READ}',
                '${FeatureTooltipTargets.REPLY_ON_FEEDBACK}',
                '${FeatureTooltipTargets.AWARD_STICKERS_TO_FEEDBACK}'
            );
        `);
    }
}
