import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndicesToSchoolClasses1695120499221 implements MigrationInterface {
    name = 'AddIndicesToSchoolClasses1695120499221'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_7d4cfca9d87858f7ec57c262f1" ON "lwp_school_class" ("parentClassId") `);
        await queryRunner.query(`CREATE INDEX "IDX_42e678039940cc979ec557351e" ON "lwp_school_class" ("schoolId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_42e678039940cc979ec557351e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7d4cfca9d87858f7ec57c262f1"`);
    }

}
