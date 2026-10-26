/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoftDeletePupilParentRelationForSoftDeletedParent1729063117221 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE lwp_pupil_parent lpp
            SET "deletedAt" = NOW()
            FROM lwp_user lu
            INNER JOIN backup_lwp_deleted_users bldu ON bldu.id = lu.id
            WHERE lpp."parentId" = lu.id
              AND lpp."deletedAt" IS NULL
              AND bldu.status = 'SOFTDELETED'
              AND lu."deletedAt" IS NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
