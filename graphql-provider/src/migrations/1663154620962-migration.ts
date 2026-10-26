import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1663154620962 implements MigrationInterface {
    name = 'migration1663154620962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "skipAutoWondeImport" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "skipAutoWondeImport"`);
    }

}
