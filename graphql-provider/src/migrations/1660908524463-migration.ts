import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1660908524463 implements MigrationInterface {
    name = 'migration1660908524463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" ADD "badParams" jsonb DEFAULT '[]'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_lwp_email_sms" DROP COLUMN "badParams"`);
    }

}
