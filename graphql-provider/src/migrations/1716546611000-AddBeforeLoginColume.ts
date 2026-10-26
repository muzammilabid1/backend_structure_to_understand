import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBeforeLoginColume1716546611000 implements MigrationInterface {
    name = 'AddBeforeLoginColume1716546611000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_faq" ADD "forBeforeLogin" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_faq" DROP COLUMN "forBeforeLogin"`);
    }
}
