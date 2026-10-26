import {MigrationInterface, QueryRunner} from "typeorm";

export class readdCascadeDeletesToLwpClassPupilsFromLwpSchoolClasses1693918410867 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_pupil" DROP CONSTRAINT "FK_ef0ec84bccbb9408c20f1ccb07c"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_pupil" ADD CONSTRAINT "FK_ef0ec84bccbb9408c20f1ccb07c" FOREIGN KEY ("lwpSchoolClassId") REFERENCES "lwp_school_class"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_class_pupil" DROP CONSTRAINT "FK_ef0ec84bccbb9408c20f1ccb07c"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_pupil" ADD CONSTRAINT "FK_ef0ec84bccbb9408c20f1ccb07c" FOREIGN KEY ("lwpSchoolClassId") REFERENCES "lwp_school_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    }

}
