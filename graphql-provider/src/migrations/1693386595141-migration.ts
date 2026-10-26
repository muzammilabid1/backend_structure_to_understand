import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1693386595141 implements MigrationInterface {
    name = 'migration1693386595141'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "isNewMathscotMessageShown"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD "showInterstitial" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD "interstitialContext" jsonb NOT NULL DEFAULT '{"isReadingSectionShown":false,"isMathsAndEnglishSectionShown":false}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP COLUMN "interstitialContext"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP COLUMN "showInterstitial"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "isNewMathscotMessageShown" boolean NOT NULL DEFAULT true`);
    }

}
