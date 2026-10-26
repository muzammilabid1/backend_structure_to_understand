import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropShowPolicyAndTermsColumn1710153680363 implements MigrationInterface {
    name = 'DropShowPolicyAndTermsColumn1710153680363';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "showTermsAndConditions"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "showPrivacyPolicy"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "showPrivacyPolicy" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "showTermsAndConditions" boolean DEFAULT false`);
    }
}
