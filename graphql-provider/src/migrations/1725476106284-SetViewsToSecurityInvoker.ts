import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetViewsToSecurityInvoker1725476106284 implements MigrationInterface {
    views = [
        'lwp_view_can_notify_school',
        'lwp_view_class_next_mathscot_items',
        'lwp_view_notifiable_parents',
        'lwp_view_pupil_status',
        'lwp_view_pupil_topics_for_notifications',
        'lwp_view_reading_log_to_reading_topic'
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const view of this.views) {
            await queryRunner.query(`ALTER VIEW ${view} SET (security_invoker = true);`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const view of this.views) {
            await queryRunner.query(`ALTER VIEW ${view} SET (security_invoker = false);`);
        }
    }
}
