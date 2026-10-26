import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToProposedLinkTable1768355189167 implements MigrationInterface {
    name = 'AddUniqueConstraintToProposedLinkTable1768355189167';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "imported_school_data_proposed_link" ADD CONSTRAINT "UQ_IMPORTED_PLATFORM_ENTITY_ID" UNIQUE ("importedEntityId", "platformEntityId")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_data_proposed_link" DROP CONSTRAINT "UQ_IMPORTED_PLATFORM_ENTITY_ID"`);
    }
}
