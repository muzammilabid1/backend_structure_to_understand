import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRationaleModalToStaticLwpActivity1784698189229 implements MigrationInterface {
    name = 'AddRationaleModalToStaticLwpActivity1784698189229';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" ADD "rationaleModalId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_activity" ADD CONSTRAINT "FK_9661697eb75e3e11890dde67d09" FOREIGN KEY ("rationaleModalId") REFERENCES "static_lwp_modal"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP CONSTRAINT "FK_9661697eb75e3e11890dde67d09"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP COLUMN "rationaleModalId"`);
    }
}
