import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureFuzzyMatchExtenisonEnabled1723029100042 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(`CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(`DROP EXTENSION fuzzystrmatch;`);
    }
}
