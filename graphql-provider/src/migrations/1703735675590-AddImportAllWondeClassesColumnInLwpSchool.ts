import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportAllWondeClassesColumnInLwpSchool1703735675590 implements MigrationInterface {
    name = 'AddImportAllWondeClassesColumnInLwpSchool1703735675590';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "importAllWondeClasses" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "importAllWondeClasses"`);
    }
}
