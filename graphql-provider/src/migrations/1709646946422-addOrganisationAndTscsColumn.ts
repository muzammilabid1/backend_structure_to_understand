import { MigrationInterface, QueryRunner } from 'typeorm';

export class addOrganisationAndTscsColumn1709646946422 implements MigrationInterface {
    name = 'addOrganisationAndTscsColumn1709646946422';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "organisations" character varying NOT NULL DEFAULT 'Learning with Parents'`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "termsAndConditions" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "privacyPolicy" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "showTermsAndConditions" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "showPrivacyPolicy" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "showPrivacyPolicy"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "showTermsAndConditions"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "privacyPolicy"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "termsAndConditions"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "organisations"`);
    }
}
