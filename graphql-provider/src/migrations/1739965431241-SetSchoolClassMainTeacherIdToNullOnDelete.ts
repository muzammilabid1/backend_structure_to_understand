import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetSchoolClassMainTeacherIdToNullOnDelete1739965431241 implements MigrationInterface {
    name = 'SetSchoolClassMainTeacherIdToNullOnDelete1739965431241';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_b44ed3f4d72ebca63d2d9961e6b";`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_b44ed3f4d72ebca63d2d9961e6b" FOREIGN KEY ("mainTeacherId") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE`
        );
        await queryRunner.query(`ALTER TABLE "static_lwp_contact" DROP CONSTRAINT "FK_8ac597bfb636456e8fc364cf413";`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_contact" ADD CONSTRAINT "FK_8ac597bfb636456e8fc364cf413" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_contact" DROP CONSTRAINT "FK_8ac597bfb636456e8fc364cf413";`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_contact" ADD CONSTRAINT "FK_8ac597bfb636456e8fc364cf413" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_b44ed3f4d72ebca63d2d9961e6b";`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_b44ed3f4d72ebca63d2d9961e6b" FOREIGN KEY ("mainTeacherId") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
