import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1676892469572 implements MigrationInterface {
    name = 'migration1676892469572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" ADD "hidePhotoUpload" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity" DROP COLUMN "hidePhotoUpload"`);
    }

}
