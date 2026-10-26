import { MigrationInterface, QueryRunner } from 'typeorm';

import { disableRLS, enableRLS } from '../migration_helpers/1721038124744-enable_rls';

export class AddSoftDeletionInformationToUserAssociatedLogins1721038124744 implements MigrationInterface {
    name = 'AddSoftDeletionInformationToUserAssociatedLogins1721038124744';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD "deletedById" bigint`);
        await queryRunner.query(
            `ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "FK_7773d6f4bfb3f1047340409a5f3" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "UQ_4586e2df1b9603ef59f69870bbc"`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_accountId_where_not_deleted" ON "lwp_user_associated_login" ("accountId") WHERE "deletedAt" IS NULL`
        );

        await enableRLS(queryRunner, 'lwp_user_associated_login');

        await queryRunner.query(
            `UPDATE lwp_user_associated_login lual SET "deletedAt" = lu."deletedAt", "deletedById" = lu."deletedById" FROM lwp_user lu WHERE lual."userId" = lu.id AND lu."deletedAt" IS NOT NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await disableRLS(queryRunner, 'lwp_user_associated_login');

        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "FK_7773d6f4bfb3f1047340409a5f3"`);
        await queryRunner.query(`DROP INDEX "public"."idx_accountId_where_not_deleted"`);
        await queryRunner.query(
            `ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "UQ_4586e2df1b9603ef59f69870bbc" UNIQUE ("accountId")`
        );
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP COLUMN "deletedAt"`);
    }
}
