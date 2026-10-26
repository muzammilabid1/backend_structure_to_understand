import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSetIsProgramTagFunction1767884446619 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing triggers
        await queryRunner.query(`DROP TRIGGER before_lwp_school_static_tags_change ON lwp_school_static_tags;`);
        await queryRunner.query(`DROP TRIGGER before_static_lwp_program_change ON static_lwp_program;`);

        // Drop existing function
        await queryRunner.query(`DROP FUNCTION set_is_program_tag();`);

        // Create updated function without deletedAt condition
        await queryRunner.query(`
            CREATE FUNCTION set_is_program_tag()
            RETURNS TRIGGER AS $$
            BEGIN
               IF TG_TABLE_NAME = 'lwp_school_static_tags' THEN
                -- For lwp_school_static_tags updates, set isProgramTag based on existence in static_lwp_program
                NEW."isProgramTag" := EXISTS (
                    SELECT 1 
                    FROM static_lwp_program slp 
                    WHERE slp."schoolTagId" = NEW."tagId"
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
                        WHERE slp."schoolTagId" = NEW."schoolTagId"
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop triggers
        await queryRunner.query(`DROP TRIGGER before_lwp_school_static_tags_change ON lwp_school_static_tags;`);
        await queryRunner.query(`DROP TRIGGER before_static_lwp_program_change ON static_lwp_program;`);

        // Drop updated function
        await queryRunner.query(`DROP FUNCTION set_is_program_tag();`);

        // Restore original function with deletedAt condition
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
    }
}
