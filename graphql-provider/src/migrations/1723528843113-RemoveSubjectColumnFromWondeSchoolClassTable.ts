import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSubjectColumnFromWondeSchoolClassTable1723528843113 implements MigrationInterface {
    name = 'RemoveSubjectColumnFromWondeSchoolClassTable1723528843113';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" DROP COLUMN "subject"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_school_class" ADD "subject" character varying`);
    }
}
