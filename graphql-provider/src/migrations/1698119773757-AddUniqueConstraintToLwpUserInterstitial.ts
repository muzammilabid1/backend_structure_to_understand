import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToLwpUserInterstitial1698119773757 implements MigrationInterface {
    name = 'AddUniqueConstraintToLwpUserInterstitial1698119773757';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create an index for rows where deletedAt is NOT NULL
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_unique_user_interstitial 
            ON lwp_user_interstitial("userId", "interstitialId", "deletedAt") 
            WHERE "deletedAt" IS NOT NULL;
        `);

        // Create another index for rows where deletedAt IS NULL
        await queryRunner.query(`
            CREATE UNIQUE INDEX idx_unique_user_interstitial_null_deleted 
            ON lwp_user_interstitial("userId", "interstitialId") 
            WHERE "deletedAt" IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX idx_unique_user_interstitial;`);
        await queryRunner.query(`DROP INDEX idx_unique_user_interstitial_null_deleted;`);
    }
}
