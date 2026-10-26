/* eslint-disable */

import {MigrationInterface, QueryRunner} from "typeorm";

export class CorrectImageTextCarouselMigration1724854987911 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE
                static_lwp_activity_steps
            SET
                "carouselData" = (
                    SELECT
                        jsonb_agg(jsonb_build_object('alt', NULL, 'fileName', NULL, 'imageUrl', NULL, 'textEditorState', concat('<p', CASE WHEN tcd ? 'fontSize' THEN
                                        concat(' style="font-size:', (tcd ->> 'fontSize'), 'px;">', (tcd ->> 'text'))
                                    ELSE
                                        concat('>', tcd #>> '{}')
                                    END, '</p>'), 'labelEditorState', NULL, 'type', 'TEXT', 'fileIdentifier', NULL))
                    FROM (
                        SELECT
                            jsonb_array_elements("textCarouselData"::jsonb -> 'text') AS tcd) AS elements)
            WHERE
                "stepType" = 'CAROUSEL'
                AND "textCarouselData" IS NOT NULL;
        `);

        await queryRunner.query(`
            UPDATE
                static_lwp_activity_steps
            SET
                "carouselData" = (
                    SELECT
                        jsonb_agg(jsonb_build_object('alt', icd ->> 'alt', 'fileName', icd ->> 'fileName', 'imageUrl', icd ->> 'imageUrl', 'textEditorState', NULL, 'labelEditorState', NULL, 'type', 'IMAGE', 'fileIdentifier', icd ->> 'fileIdentifier'))
                    FROM (
                        SELECT
                            jsonb_array_elements("imageCarouselData"::jsonb) AS icd) AS elements)
            WHERE
                "stepType" = 'CAROUSEL'
                AND "imageCarouselData" IS NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
