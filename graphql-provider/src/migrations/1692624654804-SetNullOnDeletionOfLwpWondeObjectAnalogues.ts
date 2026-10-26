import {MigrationInterface, QueryRunner} from "typeorm";

export class SetNullOnDeletionOfLwpWondeObjectAnalogues1692624654804 implements MigrationInterface {
    name = 'SetNullOnDeletionOfLwpWondeObjectAnalogues1692624654804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP CONSTRAINT "FK_844439900161b2351dd836813b9"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP CONSTRAINT "FK_2000737b47416d939bd0d9e221a"`);
        await queryRunner.query(`ALTER TABLE "wonde_school" DROP CONSTRAINT "FK_d7b01668828854a137c1719c86e"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_6b11f51e601667c6d98cbcd9164"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP CONSTRAINT "FK_817733434d30d2d41d2ce295ada"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ALTER COLUMN "schoolId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ALTER COLUMN "schoolId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ALTER COLUMN "schoolId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ALTER COLUMN "schoolId" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_844439900161b2351dd836813b" ON "wonde_student" ("lwpPupilId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d7b01668828854a137c1719c86" ON "wonde_school" ("lwpSchoolId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6b11f51e601667c6d98cbcd916" ON "wonde_school_class" ("lwpSchoolClassId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_377a44e70b697bc51306a35d08" ON "lwp_user_interstitial" ("userId") `);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD CONSTRAINT "FK_817733434d30d2d41d2ce295ada" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD CONSTRAINT "FK_844439900161b2351dd836813b9" FOREIGN KEY ("lwpPupilId") REFERENCES "lwp_pupil"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD CONSTRAINT "FK_2000737b47416d939bd0d9e221a" FOREIGN KEY ("lwpUserId") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school" ADD CONSTRAINT "FK_d7b01668828854a137c1719c86e" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_6b11f51e601667c6d98cbcd9164" FOREIGN KEY ("lwpSchoolClassId") REFERENCES "lwp_school_class"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_6b11f51e601667c6d98cbcd9164"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7"`);
        await queryRunner.query(`ALTER TABLE "wonde_school" DROP CONSTRAINT "FK_d7b01668828854a137c1719c86e"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP CONSTRAINT "FK_2000737b47416d939bd0d9e221a"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP CONSTRAINT "FK_844439900161b2351dd836813b9"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP CONSTRAINT "FK_817733434d30d2d41d2ce295ada"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_377a44e70b697bc51306a35d08"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b11f51e601667c6d98cbcd916"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d7b01668828854a137c1719c86"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_844439900161b2351dd836813b"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ALTER COLUMN "schoolId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ALTER COLUMN "schoolId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ALTER COLUMN "schoolId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ALTER COLUMN "schoolId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD CONSTRAINT "FK_817733434d30d2d41d2ce295ada" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_6b11f51e601667c6d98cbcd9164" FOREIGN KEY ("lwpSchoolClassId") REFERENCES "lwp_school_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school" ADD CONSTRAINT "FK_d7b01668828854a137c1719c86e" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD CONSTRAINT "FK_2000737b47416d939bd0d9e221a" FOREIGN KEY ("lwpUserId") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD CONSTRAINT "FK_844439900161b2351dd836813b9" FOREIGN KEY ("lwpPupilId") REFERENCES "lwp_pupil"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
