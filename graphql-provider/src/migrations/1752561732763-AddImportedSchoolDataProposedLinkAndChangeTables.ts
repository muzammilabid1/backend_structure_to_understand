import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportedSchoolDataProposedLinkAndChangeTables1752561732763 implements MigrationInterface {
    name = 'AddImportedSchoolDataProposedLinkAndChangeTables1752561732763';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "imported_school_data_proposed_link" ("id" BIGSERIAL NOT NULL, "importedSchoolId" character varying NOT NULL, "status" character varying NOT NULL, "entityType" character varying NOT NULL, "importedEntityId" character varying NOT NULL, "platformEntityId" bigint NOT NULL, "isHighConfidence" boolean NOT NULL, CONSTRAINT "PK_eb5c8d3c029eb62dc2b99fcc478" PRIMARY KEY ("id"), CONSTRAINT "UQ_imported_platform_entity" UNIQUE ("importedEntityId", "platformEntityId"))`
        );
        await queryRunner.query(
            `CREATE TABLE "imported_school_data_proposed_change" ("id" BIGSERIAL NOT NULL, "importedSchoolId" character varying NOT NULL, "status" character varying NOT NULL, "entityType" character varying NOT NULL, "operation" character varying NOT NULL, "platformEntityId" bigint NULL, "fieldName" character varying, "proposedValue" character varying, CONSTRAINT "PK_ac55005e87f79024c18e19b2582" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "importStatus" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "importStatus"`);
        await queryRunner.query(`DROP TABLE "imported_school_data_proposed_change"`);
        await queryRunner.query(`DROP TABLE "imported_school_data_proposed_link"`);
    }
}
