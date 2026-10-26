/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateImportedFromForCSVInImportedSchoolTable1731539055553 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE imported_school
            SET "importedFrom" = 'CSV'
            WHERE id LIKE 'CSV-%'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
