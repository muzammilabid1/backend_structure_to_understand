import {MigrationInterface, QueryRunner} from "typeorm";

export class CorrectRelationshipRules1739890781198 implements MigrationInterface {
    name = 'CorrectRelationshipRules1739890781198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_16ce399c90c3f84a15452cbb782"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "FK_94f30c4658579135f5d32d23998"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_42e678039940cc979ec557351e7"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" DROP CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "UQ_4586e2df1b9603ef59f69870bbc" UNIQUE ("accountId")`);
        await queryRunner.query(`DROP INDEX "idx_class_release_due"`);
        await queryRunner.query(`CREATE INDEX "idx_class_release_due" ON "lwp_class_topic" ("classId", "releaseDate", "dueDate")`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_16ce399c90c3f84a15452cbb782" FOREIGN KEY ("parentId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "FK_94f30c4658579135f5d32d23998" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_42e678039940cc979ec557351e7" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" ADD CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" DROP CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_42e678039940cc979ec557351e7"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "FK_94f30c4658579135f5d32d23998"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_16ce399c90c3f84a15452cbb782"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" DROP CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db"`);
        await queryRunner.query(`DROP INDEX "public"."idx_class_release_due"`);
        await queryRunner.query(`CREATE INDEX "idx_class_release_due" ON "lwp_class_topic" ("classId", "releaseDate", "dueDate") WHERE "deletedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" DROP CONSTRAINT "UQ_4586e2df1b9603ef59f69870bbc"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" ADD CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_42e678039940cc979ec557351e7" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_associated_login" ADD CONSTRAINT "FK_94f30c4658579135f5d32d23998" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_16ce399c90c3f84a15452cbb782" FOREIGN KEY ("parentId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_parent" ADD CONSTRAINT "FK_5123c0ddb3e6f7587d74b24c0db" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
