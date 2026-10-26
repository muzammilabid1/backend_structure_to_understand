import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1688986126402 implements MigrationInterface {
    name = 'migration1688986126402'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "readingLaunchDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "includeReadingAtSchoolInTarget" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" ADD "userType" character varying`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" ADD "loginType" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ALTER COLUMN "emailTemplateType" SET DEFAULT 'deprecatedTemplate'`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ALTER COLUMN "firstname" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ALTER COLUMN "firstname" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ALTER COLUMN "emailTemplateType" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" DROP COLUMN "loginType"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" DROP COLUMN "userType"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "includeReadingAtSchoolInTarget"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "readingLaunchDate"`);
    }

}
