import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewColumnForSchoolDataDownloadCheckbox1714631221333 implements MigrationInterface {
    name = 'AddNewColumnForSchoolDataDownloadCheckbox1714631221333';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "isDownloadSchoolData" boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "isDownloadSchoolData"`);
    }
}
