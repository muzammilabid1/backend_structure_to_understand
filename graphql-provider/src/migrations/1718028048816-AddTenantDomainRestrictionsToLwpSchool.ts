import {MigrationInterface, QueryRunner} from "typeorm";

export class AddTenantDomainRestrictionsToLwpSchool1718028048816 implements MigrationInterface {
    name = 'AddTenantDomainRestrictionsToLwpSchool1718028048816'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "tenantDomain" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "msTenantIssuer" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "msTenantIssuer"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "tenantDomain"`);
    }

}
