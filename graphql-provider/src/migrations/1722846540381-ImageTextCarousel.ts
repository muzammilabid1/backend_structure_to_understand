import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImageTextCarousel1722846540381 implements MigrationInterface {
    name = 'ImageTextCarousel1722846540381';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" RENAME COLUMN "carouselData" TO "textCarouselData"`);

        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" ADD "carouselData" jsonb`);

        await queryRunner.query(`
            UPDATE static_lwp_activity_steps
            SET "carouselData" = (
                SELECT jsonb_agg(
                    CASE
                        WHEN "stepType" = 'IMAGE_CAROUSEL' THEN jsonb_build_object(
                            'alt', icd ->> 'alt',
                            'fileName', icd ->> 'fileName',
                            'imageUrl', icd ->> 'imageUrl',
                            'textEditorState', NULL,
                            'labelEditorState', NULL,
                            'type', 'IMAGE',
                            'fileIdentifier', icd ->> 'fileIdentifier'
                        )
                        WHEN "stepType" = 'CAROUSEL' THEN jsonb_build_object(
                            'alt', NULL,
                            'fileName', NULL,
                            'imageUrl', NULL,
                            'textEditorState', '<p style="font-size:' || (tcd ->> 'fontSize') || 'px;">' || (tcd ->> 'text') || '</p>',
                            'labelEditorState', NULL,
                            'type', 'TEXT',
                            'fileIdentifier', NULL
                        )
                    END
                )
                FROM (
                    SELECT jsonb_array_elements("textCarouselData"::jsonb -> 'text') AS tcd,
                           jsonb_array_elements("imageCarouselData"::jsonb) AS icd
                ) AS elements
            )
            WHERE "stepType" IN ('IMAGE_CAROUSEL', 'CAROUSEL');
        `);

        await queryRunner.query(`
            UPDATE static_lwp_activity_steps
            SET "stepType" = 'CAROUSEL'
            WHERE "stepType" = 'IMAGE_CAROUSEL';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE static_lwp_activity_steps
            SET "stepType" = 'IMAGE_CAROUSEL'
            WHERE "stepType" = 'CAROUSEL' AND "imageCarouselData" IS NOT NULL;
        `);

        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" DROP COLUMN "carouselData"`);

        await queryRunner.query(`ALTER TABLE "static_lwp_activity_steps" RENAME COLUMN "textCarouselData" TO "carouselData"`);
    }
}
