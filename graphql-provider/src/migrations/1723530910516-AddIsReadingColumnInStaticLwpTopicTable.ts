import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsReadingColumnInStaticLwpTopicTable1723530910516 implements MigrationInterface {
    name = 'AddIsReadingColumnInStaticLwpTopicTable1723530910516';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "isReading" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(
            `
                UPDATE static_lwp_topic AS slt
                SET
                    "isReading" = true
                WHERE
                    slt."subject" = 'READING'
            `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "isReading"`);
    }
}
