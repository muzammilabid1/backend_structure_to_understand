import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLwpEmailTemplateTableToStaticLwpEmailTemplate1721796341169 implements MigrationInterface {
    name = 'RenameLwpEmailTemplateTableToStaticLwpEmailTemplate1721796341169';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE lwp_email_template
            RENAME TO static_lwp_email_template
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE static_lwp_email_template
            RENAME TO lwp_email_template
        `);
    }
}
