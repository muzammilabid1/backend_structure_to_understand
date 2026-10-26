import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1653559443481 implements MigrationInterface {
    name = 'migration1653559443481'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "hideClassCreation" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "deletedSchoolId" bigint`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "editAsHtml" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "static_lwp_faq" ADD "editAsHtml" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "static_lwp_news" ADD "editAsHtml" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "static_lwp_resource" ADD "download" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD CONSTRAINT "FK_eeb328790bb65d30e08c3f69557" FOREIGN KEY ("deletedSchoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP CONSTRAINT "FK_eeb328790bb65d30e08c3f69557"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_resource" DROP COLUMN "download"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_news" DROP COLUMN "editAsHtml"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_faq" DROP COLUMN "editAsHtml"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "editAsHtml"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "deletedSchoolId"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "hideClassCreation"`);
    }

}
