import { MigrationInterface, QueryRunner } from 'typeorm';

export class NonMisSchoolsUsingCSVChanges1702457144352 implements MigrationInterface {
    name = 'NonMisSchoolsUsingCSVChanges1702457144352';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Changes to school table
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "manualSync" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "enableSchoolCode"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "signUpCode"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "buttonColor"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "buttonTextColor"`);

        // Changes to school class table
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "code"`);

        // Changes to imported tables
        await queryRunner.query(`ALTER TABLE "wonde_school" ADD "importedFrom" character varying NOT NULL DEFAULT 'WONDE'`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD "importedFrom" character varying NOT NULL DEFAULT 'WONDE'`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD "importedFrom" character varying NOT NULL DEFAULT 'WONDE'`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD "importedFrom" character varying NOT NULL DEFAULT 'WONDE'`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD "importedFrom" character varying NOT NULL DEFAULT 'WONDE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes to school table
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "manualSync"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "enableSchoolCode" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "signUpCode" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "buttonColor" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "buttonTextColor" character varying`);

        // Revert changes to school class table
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "code" character varying(6)`);

        // Revert changes to imported tables
        await queryRunner.query(`ALTER TABLE "wonde_school" DROP COLUMN "importedFrom"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP COLUMN "importedFrom"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP COLUMN "importedFrom"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP COLUMN "importedFrom"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP COLUMN "importedFrom"`);
    }
}
