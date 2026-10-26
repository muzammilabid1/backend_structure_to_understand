import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueStickerAndUserIndexToLogLwpParentStickerNotification1755765856254 implements MigrationInterface {
    name = 'AddUniqueStickerAndUserIndexToLogLwpParentStickerNotification1755765856254'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_83a90c78f9e7e756d840c242d3" ON "log_lwp_parent_sticker_notification" ("stickerId", "userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_83a90c78f9e7e756d840c242d3"`);
    }

}
