import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameForContentDevColumnInStaticModalTable1703655052651 implements MigrationInterface {
    name = 'AddNameForContentDevColumnInStaticModalTable1703655052651';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_modal" ADD "nameForContentDev" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_modal" DROP COLUMN "nameForContentDev"`);
    }
}
