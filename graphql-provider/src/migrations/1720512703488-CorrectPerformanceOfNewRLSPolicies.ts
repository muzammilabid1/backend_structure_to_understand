import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorrectPerformanceOfNewRLSPolicies1720512703488 implements MigrationInterface {
    NEW_DELETABLE_TABLES = [
        'static_lwp_activity',
        'static_lwp_activity_steps',
        'static_lwp_activity_tag',
        'static_lwp_email_template',
        'static_lwp_school_tag',
        'static_lwp_topic_tag',
        'static_lwp_topic',
        'static_lwp_topic_domain'
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        await Promise.all(
            this.NEW_DELETABLE_TABLES.map(async (tblName) => {
                await queryRunner.query(`
        alter policy lwpUser_perms on ${tblName} using (("deletedAt" is null) or (NOT isCurrentlyDeleted('${tblName}', "id")));
        `);
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await Promise.all(
            this.NEW_DELETABLE_TABLES.map(async (tblName) => {
                await queryRunner.query(`
        alter policy lwpUser_perms on ${tblName} using (NOT isCurrentlyDeleted('${tblName}', "id"));
        `);
            })
        );
    }
}
