import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveHideClassCreationColumnFromLwpSchoolTable1731447818543 implements MigrationInterface {
    name = 'RemoveHideClassCreationColumnFromLwpSchoolTable1731447818543';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "hideClassCreation"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "hideClassCreation" boolean NOT NULL DEFAULT false`);
    }
}
