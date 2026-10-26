import {MigrationInterface, QueryRunner} from "typeorm";

export class AddLogSchoolClassLicenses1697029212761 implements MigrationInterface {
    name = 'AddLogSchoolClassLicenses1697029212761'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "log_school_class_license" ("id" BIGSERIAL NOT NULL, "operationType" character varying, "fullProgrammeClassCount" integer DEFAULT '0', "totalClassCount" integer DEFAULT '0', "requestedFullProgrammeClassCount" integer DEFAULT '0', "requestedReadingOnlyClassCount" integer DEFAULT '0', "requestedUpgradeClassCount" integer DEFAULT '0', "fullProgrammeClassPrice" integer DEFAULT '0', "readingOnlyClassPrice" integer DEFAULT '0', "totalPrice" integer DEFAULT '0', "schoolPeriod" character varying, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "schoolId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_75c25473482ba48ac0c02206e48" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" ADD CONSTRAINT "FK_382678814aa2af18b9916630816" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" ADD CONSTRAINT "FK_467487742580cea78125ff2d35f" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" ADD CONSTRAINT "FK_a58714f2da14193cfd898b26de1" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_school_class_license" DROP CONSTRAINT "FK_a58714f2da14193cfd898b26de1"`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" DROP CONSTRAINT "FK_467487742580cea78125ff2d35f"`);
        await queryRunner.query(`ALTER TABLE "log_school_class_license" DROP CONSTRAINT "FK_382678814aa2af18b9916630816"`);
        await queryRunner.query(`DROP TABLE "log_school_class_license"`);
    }

}
