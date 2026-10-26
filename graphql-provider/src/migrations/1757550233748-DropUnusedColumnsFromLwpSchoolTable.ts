import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUnusedColumnsFromLwpSchoolTable1757550233748 implements MigrationInterface {
    name = 'DropUnusedColumnsFromLwpSchoolTable1757550233748';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "lastWondeSync"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "importAllWondeClasses"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "wondeUpdateStatus"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "lastWondeSync" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "importAllWondeClasses" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "wondeUpdateStatus" character varying`);
    }
}
