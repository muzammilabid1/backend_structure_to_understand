/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class OneWayMigrateDevTshirtsToMatchProdCategory1718266078370 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`UPDATE static_lwp_mathscot_item SET theme = 'Base' WHERE theme = 'TShirt'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
