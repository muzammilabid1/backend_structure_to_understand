import { FeatureTooltipTargets } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeatureToolTipIdInLwpUserToolTipHistoryTable1739632839727 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            -- Update child switch tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.CHILD_SWITCH}'
            )
            WHERE type = 'CHILD_SWITCH';
        
            -- Update topic library tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.TOPIC_LIBRARY}'
            )
            WHERE type = 'TOPIC_LIBRARY';
        
            -- Update school reading log tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.SCHOOL_READING_LOG}'
            )
            WHERE type = 'SCHOOL_READING_LOG';
        
            -- Update tick all feedback tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.TICK_ALL_FEEDBACK_AS_READ}'
            )
            WHERE type = 'TICK_ALL_FEEDBACK_AS_READ';
        
            -- Update tick single feedback tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.TICK_SINGLE_FEEDBACK_AS_READ}'
            )
            WHERE type = 'TICK_SINGLE_FEEDBACK_AS_READ';
        
            -- Update reply on feedback tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.REPLY_ON_FEEDBACK}'
            )
            WHERE type = 'REPLY_ON_FEEDBACK';
        
            -- Update award stickers tooltip
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = (
                SELECT id 
                FROM static_lwp_feature_tooltip 
                WHERE "targetId" = '${FeatureTooltipTargets.AWARD_STICKERS_TO_FEEDBACK}'
            )
            WHERE type = 'AWARD_STICKERS_TO_FEEDBACK';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE lwp_user_tooltip_history 
            SET "featureTooltipId" = null
            WHERE type IN (
                'CHILD_SWITCH',
                'TOPIC_LIBRARY',
                'SCHOOL_READING_LOG',
                'TICK_ALL_FEEDBACK_AS_READ',
                'TICK_SINGLE_FEEDBACK_AS_READ',
                'REPLY_ON_FEEDBACK',
                'AWARD_STICKERS_TO_FEEDBACK'
            );
        `);
    }
}
