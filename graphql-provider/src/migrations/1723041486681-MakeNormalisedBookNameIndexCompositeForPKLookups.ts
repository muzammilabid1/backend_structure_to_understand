import {MigrationInterface, QueryRunner} from "typeorm";

export class MakeNormalisedBookNameIndexCompositeForPKLookups1723041486681 implements MigrationInterface {
    name = 'MakeNormalisedBookNameIndexCompositeForPKLookups1723041486681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_95e1919661dd4da2685b47ac87"`);
        await queryRunner.query(`CREATE INDEX "lwp_pupil_feedback_bookname_id_idx" ON "lwp_pupil_feedback" ("normalisedBookName", "id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_feedback_bookname_id_idx"`);
        await queryRunner.query(`CREATE INDEX "IDX_95e1919661dd4da2685b47ac87" ON "lwp_pupil_feedback" ("normalisedBookName") `);
    }

}
