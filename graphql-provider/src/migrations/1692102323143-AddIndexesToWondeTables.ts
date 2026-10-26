import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexesToWondeTables1692102323143 implements MigrationInterface {
    name = 'AddIndexesToWondeTables1692102323143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_817733434d30d2d41d2ce295ad" ON "wonde_student" ("schoolId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cfbd7c9c8e6ecb800feee3ea8f" ON "wonde_student_contact" ("wondeStudentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_d8828e6de3728405955055790f" ON "wonde_student_contact" ("wondeContactId") `);
        await queryRunner.query(`CREATE INDEX "IDX_173523f2cb350ec2c4895b1e60" ON "wonde_student_contact" ("schoolId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2000737b47416d939bd0d9e221" ON "wonde_contact" ("lwpUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a61b772408d07f0b50d3c606f" ON "wonde_contact" ("schoolId") `);
        await queryRunner.query(`CREATE INDEX "IDX_42d33ac46e5a776347e1d62aab" ON "wonde_school_class" ("schoolId") `);
        await queryRunner.query(`CREATE INDEX "IDX_199c61922532abd0f739639db7" ON "wonde_school_class" ("yearGroup") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_199c61922532abd0f739639db7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_42d33ac46e5a776347e1d62aab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a61b772408d07f0b50d3c606f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2000737b47416d939bd0d9e221"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_173523f2cb350ec2c4895b1e60"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d8828e6de3728405955055790f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfbd7c9c8e6ecb800feee3ea8f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_817733434d30d2d41d2ce295ad"`);
    }

}
