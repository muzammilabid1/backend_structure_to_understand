import {MigrationInterface, QueryRunner} from "typeorm";

export class CascadeDeletesOnWondeTables1692105149368 implements MigrationInterface {
    name = 'CascadeDeletesOnWondeTables1692105149368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP CONSTRAINT "FK_817733434d30d2d41d2ce295ada"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_cfbd7c9c8e6ecb800feee3ea8f7"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_d8828e6de3728405955055790f8"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class_student" DROP CONSTRAINT "FK_de71d8217ca47cf31783651c6be"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD CONSTRAINT "FK_817733434d30d2d41d2ce295ada" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_cfbd7c9c8e6ecb800feee3ea8f7" FOREIGN KEY ("wondeStudentId") REFERENCES "wonde_student"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_d8828e6de3728405955055790f8" FOREIGN KEY ("wondeContactId") REFERENCES "wonde_contact"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class_student" ADD CONSTRAINT "FK_de71d8217ca47cf31783651c6be" FOREIGN KEY ("wondeStudentId") REFERENCES "wonde_student"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wonde_school_class_student" DROP CONSTRAINT "FK_de71d8217ca47cf31783651c6be"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" DROP CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7"`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" DROP CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_d8828e6de3728405955055790f8"`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" DROP CONSTRAINT "FK_cfbd7c9c8e6ecb800feee3ea8f7"`);
        await queryRunner.query(`ALTER TABLE "wonde_student" DROP CONSTRAINT "FK_817733434d30d2d41d2ce295ada"`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class_student" ADD CONSTRAINT "FK_de71d8217ca47cf31783651c6be" FOREIGN KEY ("wondeStudentId") REFERENCES "wonde_student"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_school_class" ADD CONSTRAINT "FK_42d33ac46e5a776347e1d62aab7" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_contact" ADD CONSTRAINT "FK_7a61b772408d07f0b50d3c606fb" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_173523f2cb350ec2c4895b1e60b" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_d8828e6de3728405955055790f8" FOREIGN KEY ("wondeContactId") REFERENCES "wonde_contact"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student_contact" ADD CONSTRAINT "FK_cfbd7c9c8e6ecb800feee3ea8f7" FOREIGN KEY ("wondeStudentId") REFERENCES "wonde_student"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wonde_student" ADD CONSTRAINT "FK_817733434d30d2d41d2ce295ada" FOREIGN KEY ("schoolId") REFERENCES "wonde_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
