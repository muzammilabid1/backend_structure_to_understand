import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnableBookNameOnlyReadingLogColumn1710823938726 implements MigrationInterface {
    name = 'AddEnableBookNameOnlyReadingLogColumn1710823938726';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "enableBookNameOnlyReadingLog" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "enableBookNameOnlyReadingLog"`);
    }
}
