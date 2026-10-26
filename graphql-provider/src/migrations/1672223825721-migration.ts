import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1672223825721 implements MigrationInterface {
    name = 'migration1672223825721'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_5a21076ac34867575a7b3b3fe7a"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "UQ_5a21076ac34867575a7b3b3fe7a"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "currentReadingWeekId"`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" DROP COLUMN "pupilTopicId"`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" DROP COLUMN "trophyId"`);
        await queryRunner.query(`update lwp_user u set "watchedIntroVideo" = true from lwp_pupil_parent pp join lwp_pupil p on p.id = pp."pupilId" where pp."parentId" = u."id" and pp.status= 'ACTIVE' and p."watchedIntoVideo"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ADD "trophyId" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_magic_link" ADD "pupilTopicId" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "currentReadingWeekId" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "UQ_5a21076ac34867575a7b3b3fe7a" UNIQUE ("currentReadingWeekId")`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_5a21076ac34867575a7b3b3fe7a" FOREIGN KEY ("currentReadingWeekId") REFERENCES "lwp_class_topic"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
