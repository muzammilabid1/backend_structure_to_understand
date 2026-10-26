import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveParentLoginsAndActivityAccessedColumnsFromSchool1700439283540 implements MigrationInterface {
    name = 'RemoveParentLoginsAndActivityAccessedColumnsFromSchool1700439283540';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "parentLogins"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "activityAccessed"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "activityAccessed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "parentLogins" integer NOT NULL DEFAULT '0'`);
    }
}
