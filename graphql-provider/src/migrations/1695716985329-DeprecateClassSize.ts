import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeprecateClassSize1695716985329 implements MigrationInterface {
    name = 'DeprecateClassSize1695716985329';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // why does JS not support date and time formatting like everything else?!
        await queryRunner.query(`
            CREATE TABLE "backup_${new Date().toISOString().slice(0, 10).replace('-', '_')}_lwp_school_class_classsize" AS (
                SELECT id, "classSize" FROM lwp_school_class
            )
        `);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "classSize"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "classSize" integer NOT NULL DEFAULT '0'`);
    }
}
