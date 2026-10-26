import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncDatabaseWithSchema1724050696109 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") 
             VALUES (current_database(), $1, $2, $3, $4, $5)`,
            ['public', 'lwp_pupil_feedback', 'GENERATED_COLUMN', 'normalisedBookName', 'trim(lower("bookName"))']
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = current_database() AND "schema" = $3 AND "table" = $4`,
            ['GENERATED_COLUMN', 'normalisedBookName', 'public', 'lwp_pupil_feedback']
        );
    }
}
