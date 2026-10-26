import {MigrationInterface, QueryRunner} from "typeorm";

export class CascadeDeletesForPupilTopicsFromPupils1692200889156 implements MigrationInterface {
    name = 'CascadeDeletesForPupilTopicsFromPupils1692200889156'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP CONSTRAINT "FK_25cbfe3d28ebefc869ace0a030a"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD CONSTRAINT "FK_25cbfe3d28ebefc869ace0a030a" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP CONSTRAINT "FK_25cbfe3d28ebefc869ace0a030a"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD CONSTRAINT "FK_25cbfe3d28ebefc869ace0a030a" FOREIGN KEY ("pupilId") REFERENCES "lwp_pupil"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
