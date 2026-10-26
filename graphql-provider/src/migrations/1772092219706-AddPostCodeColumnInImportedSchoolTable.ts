import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostCodeColumnInImportedSchoolTable1772092219706 implements MigrationInterface {
    name = 'AddPostCodeColumnInImportedSchoolTable1772092219706';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school" ADD "postCode" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school" DROP COLUMN "postCode"`);
    }
}
