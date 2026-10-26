import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpSchoolTagsTable1730213017207 implements MigrationInterface {
    name = 'AddLwpSchoolTagsTable1730213017207';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_school_static_tags" ("id" BIGSERIAL NOT NULL, "isProgramTag" boolean NOT NULL DEFAULT false, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "tagId" bigint, "schoolId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_e972a0f09e21137de553f2e6024" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_unique_school_isprogramtag" ON "lwp_school_static_tags" ("schoolId", "isProgramTag") WHERE "isProgramTag" = true`
        );
        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "FK_1aaeccb9440690ed9fc5cc4dde1"`);

        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_schoolTag_where_not_deleted" ON "static_lwp_program" ("schoolTagId") WHERE "deletedAt" IS NULL`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_static_tags" ADD CONSTRAINT "FK_b5f11483d6f415906ad5e5983c0" FOREIGN KEY ("tagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_static_tags" ADD CONSTRAINT "FK_f0aa274054cba5d8ac6d260d4f5" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_static_tags" ADD CONSTRAINT "FK_50d1858e4c7e9f97a4a3f571193" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_static_tags" ADD CONSTRAINT "FK_26b43bae3da6e06f8e491989f4f" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "static_lwp_program" ADD CONSTRAINT "FK_1aaeccb9440690ed9fc5cc4dde1" FOREIGN KEY ("schoolTagId") REFERENCES "static_lwp_school_tag"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        await queryRunner.query(`
            CREATE FUNCTION set_is_program_tag()
            RETURNS TRIGGER AS $$
            BEGIN
               IF TG_TABLE_NAME = 'lwp_school_static_tags' THEN
                -- For lwp_school_static_tags updates, set isProgramTag based on existence in static_lwp_program
                NEW."isProgramTag" := EXISTS (
                    SELECT 1 
                    FROM static_lwp_program slp 
                    WHERE slp."schoolTagId" = NEW."tagId" AND slp."deletedAt" IS NULL
                );
                
            ELSIF TG_TABLE_NAME = 'static_lwp_program' THEN
                -- For static_lwp_program updates, update the related lwp_school_static_tags record
                UPDATE lwp_school_static_tags
                SET "isProgramTag" = FALSE
                WHERE "tagId" = OLD."schoolTagId";
                    
                IF NEW."schoolTagId" IS NOT NULL THEN
                    UPDATE lwp_school_static_tags
                    SET "isProgramTag" = EXISTS (
                        SELECT 1 
                        FROM static_lwp_program slp 
                        WHERE slp."schoolTagId" = NEW."schoolTagId" AND slp."deletedAt" IS NULL
                    )
                    WHERE "tagId" = NEW."schoolTagId";
                END IF;
            END IF;

        
                RETURN NEW;
            END;
            $$
            LANGUAGE plpgsql;
        
            -- Create a trigger that calls this function before insert or update
            CREATE TRIGGER before_lwp_school_static_tags_change
            BEFORE INSERT OR UPDATE ON lwp_school_static_tags
            FOR EACH ROW

            EXECUTE FUNCTION set_is_program_tag();
            CREATE TRIGGER before_static_lwp_program_change
            AFTER INSERT OR UPDATE ON static_lwp_program
            FOR EACH ROW
            EXECUTE FUNCTION set_is_program_tag();

        `);

        await queryRunner.query(`
            INSERT INTO "lwp_school_static_tags" (
                "logCreatedAt", 
                "logUpdatedAt", 
                "tagId", 
                "schoolId", 
                "logCreatedById", 
                "logUpdatedById"
            )
            SELECT 
                "logCreatedAt", 
                "logUpdatedAt", 
                "staticLwpSchoolTagId", 
                "lwpSchoolId", 
                "logCreatedById", 
                "logUpdatedById"
            FROM "lwp_school_tags" lst
            join static_lwp_school_tag slst on slst.id =  lst."staticLwpSchoolTagId"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER before_lwp_school_static_tags_change ON lwp_school_static_tags;`);
        await queryRunner.query(`DROP TRIGGER before_static_lwp_program_change ON static_lwp_program;`);

        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "FK_1aaeccb9440690ed9fc5cc4dde1"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_static_tags" DROP CONSTRAINT "FK_26b43bae3da6e06f8e491989f4f"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_static_tags" DROP CONSTRAINT "FK_50d1858e4c7e9f97a4a3f571193"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_static_tags" DROP CONSTRAINT "FK_f0aa274054cba5d8ac6d260d4f5"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_static_tags" DROP CONSTRAINT "FK_b5f11483d6f415906ad5e5983c0"`);
        await queryRunner.query(`DROP INDEX "public"."idx_schoolTag_where_not_deleted"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_program" DROP CONSTRAINT "UQ_1aaeccb9440690ed9fc5cc4dde1"`);
        await queryRunner.query(`DROP INDEX "public"."idx_unique_school_isprogramtag"`);
        await queryRunner.query(`DROP TABLE "lwp_school_static_tags"`);
    }
}
