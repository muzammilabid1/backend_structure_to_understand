import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameInsterstitialContextColumnPropertyOfLwpPupilParentTable1722929871041 implements MigrationInterface {
    name = 'RenameInsterstitialContextColumnPropertyOfLwpPupilParentTable1722929871041';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "lwp_pupil_parent"
            SET "interstitialContext" = jsonb_set(
                "interstitialContext" - 'isMathsAndEnglishSectionShown',
                '{isTopicsSectionShown}',
                "interstitialContext"->'isMathsAndEnglishSectionShown'
            )
            WHERE "interstitialContext" ? 'isMathsAndEnglishSectionShown';
        `);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_parent" ALTER COLUMN "interstitialContext" SET DEFAULT '{"isReadingSectionShown":false,"isTopicsSectionShown":false}'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "lwp_pupil_parent"
            SET "interstitialContext" = jsonb_set(
                "interstitialContext" - 'isTopicsSectionShown',
                '{isMathsAndEnglishSectionShown}',
                "interstitialContext"->'isTopicsSectionShown'
            )
            WHERE "interstitialContext" ? 'isTopicsSectionShown';
        `);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_parent" ALTER COLUMN "interstitialContext" SET DEFAULT '{"isReadingSectionShown": false, "isMathsAndEnglishSectionShown": false}'`
        );
    }
}
