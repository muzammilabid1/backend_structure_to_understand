import {MigrationInterface, QueryRunner} from "typeorm";

export class CascadeDeletesForPupilActivitiesDirectlyFromPupils1692707106543 implements MigrationInterface {
    name = 'CascadeDeletesForPupilActivitiesDirectlyFromPupils1692707106543'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP CONSTRAINT "FK_2a425ff523faaf0ea52ccd37364"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD CONSTRAINT "FK_2a425ff523faaf0ea52ccd37364" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" DROP CONSTRAINT "FK_2a425ff523faaf0ea52ccd37364"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity" ADD CONSTRAINT "FK_2a425ff523faaf0ea52ccd37364" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
