import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveReadingAsAGroupColumnFromLwpSchoolTable1706774206506 implements MigrationInterface {
    name = 'RemoveReadingAsAGroupColumnFromLwpSchoolTable1706774206506';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "enableReadingAsGroup"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "enableReadingAsGroup" boolean NOT NULL DEFAULT false`);
    }
}
