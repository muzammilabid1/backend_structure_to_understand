import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolAndCharacterToLwpStickerAndAddAdminStickerStatus1726149356851 implements MigrationInterface {
    name = 'AddSchoolAndCharacterToLwpStickerAndAddAdminStickerStatus1726149356851';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_sticker_character_item" ("id" BIGSERIAL NOT NULL, "alt" character varying NOT NULL, "fileName" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "type" character varying NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_5ef3a4ce7da548102255a142396" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE TABLE "lwp_admin_sticker_school_status" ("id" BIGSERIAL NOT NULL, "isActive" boolean NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "stickerId" bigint, "schoolId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_81b11d857f275d6676ea181d859" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ADD "label" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ADD "textColor" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ADD "borderColor" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ADD "characterId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ADD "itemId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ADD "schoolId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ALTER COLUMN "isActive" SET NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker_character_item" ADD CONSTRAINT "FK_46805cf5c3d571fa788f453483d" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker_character_item" ADD CONSTRAINT "FK_ae03fdb6994a432366d29e3d9af" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker" ADD CONSTRAINT "FK_436e297dae53b26591969d75e26" FOREIGN KEY ("characterId") REFERENCES "lwp_sticker_character_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker" ADD CONSTRAINT "FK_aeff9636071d001b32586037c4c" FOREIGN KEY ("itemId") REFERENCES "lwp_sticker_character_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_sticker" ADD CONSTRAINT "FK_6516af9634e9ebeed44ff8102e8" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_admin_sticker_school_status" ADD CONSTRAINT "FK_4aa05a9a79d81a1462e358527d2" FOREIGN KEY ("stickerId") REFERENCES "lwp_sticker"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_admin_sticker_school_status" ADD CONSTRAINT "FK_a01a4c005740ab913adf0726d18" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_admin_sticker_school_status" ADD CONSTRAINT "FK_e20aaeb0942ec875e8d69676b0d" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_admin_sticker_school_status" ADD CONSTRAINT "FK_b51999f0b02716f56adc59ad8d4" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_admin_sticker_school_status" DROP CONSTRAINT "FK_b51999f0b02716f56adc59ad8d4"`);
        await queryRunner.query(`ALTER TABLE "lwp_admin_sticker_school_status" DROP CONSTRAINT "FK_e20aaeb0942ec875e8d69676b0d"`);
        await queryRunner.query(`ALTER TABLE "lwp_admin_sticker_school_status" DROP CONSTRAINT "FK_a01a4c005740ab913adf0726d18"`);
        await queryRunner.query(`ALTER TABLE "lwp_admin_sticker_school_status" DROP CONSTRAINT "FK_4aa05a9a79d81a1462e358527d2"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP CONSTRAINT "FK_6516af9634e9ebeed44ff8102e8"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP CONSTRAINT "FK_aeff9636071d001b32586037c4c"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP CONSTRAINT "FK_436e297dae53b26591969d75e26"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker_character_item" DROP CONSTRAINT "FK_ae03fdb6994a432366d29e3d9af"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker_character_item" DROP CONSTRAINT "FK_46805cf5c3d571fa788f453483d"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" ALTER COLUMN "isActive" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP COLUMN "schoolId"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP COLUMN "itemId"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP COLUMN "characterId"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP COLUMN "borderColor"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP COLUMN "textColor"`);
        await queryRunner.query(`ALTER TABLE "lwp_sticker" DROP COLUMN "label"`);
        await queryRunner.query(`DROP TABLE "lwp_admin_sticker_school_status"`);
        await queryRunner.query(`DROP TABLE "lwp_sticker_character_item"`);
    }
}
