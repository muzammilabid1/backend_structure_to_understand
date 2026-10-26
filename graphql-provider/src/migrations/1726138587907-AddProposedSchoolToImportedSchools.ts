import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProposedSchoolToImportedSchools1726138587907 implements MigrationInterface {
    name = 'AddProposedSchoolToImportedSchools1726138587907';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school" ADD "proposedSchoolId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "imported_school" ADD CONSTRAINT "UQ_6bb3e8b21bfeac40c064aac2c5a" UNIQUE ("proposedSchoolId")`
        );
        await queryRunner.query(`CREATE INDEX "IDX_6bb3e8b21bfeac40c064aac2c5" ON "imported_school" ("proposedSchoolId") `);
        await queryRunner.query(
            `ALTER TABLE "imported_school" ADD CONSTRAINT "FK_6bb3e8b21bfeac40c064aac2c5a" FOREIGN KEY ("proposedSchoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school" DROP CONSTRAINT "FK_6bb3e8b21bfeac40c064aac2c5a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bb3e8b21bfeac40c064aac2c5"`);
        await queryRunner.query(`ALTER TABLE "imported_school" DROP CONSTRAINT "UQ_6bb3e8b21bfeac40c064aac2c5a"`);
        await queryRunner.query(`ALTER TABLE "imported_school" DROP COLUMN "proposedSchoolId"`);
    }
}
