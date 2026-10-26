import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsReadyTeddyAvailableColumnInLwpSchoolTable1774845123331 implements MigrationInterface {
    name = 'AddIsReadyTeddyAvailableColumnInLwpSchoolTable1774845123331';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "isReadyTeddyAvailable" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`
            UPDATE "lwp_school" ls
            SET "isReadyTeddyAvailable" = true
            WHERE EXISTS (
                SELECT 1 FROM "lwp_school_class" lsc
                WHERE lsc."schoolId" = ls.id
                AND lsc."isRegistrationClass" = true
                AND lsc."isReadyTeddyEnabled" = true
                AND lsc."periodIndex" = ls."curentPeriodIndex"
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "isReadyTeddyAvailable"`);
    }
}
