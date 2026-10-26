import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToLwpSchoolImportedSchoolId1791360468953 implements MigrationInterface {
    name = 'AddUniqueConstraintToLwpSchoolImportedSchoolId1791360468953';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // NULLs don't clash in a unique constraint, so schools without a Wonde ID are unaffected
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD CONSTRAINT "UQ_e48f6ab787308b9bd9a099c3da8" UNIQUE ("importedSchoolId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP CONSTRAINT "UQ_e48f6ab787308b9bd9a099c3da8"`);
    }
}
