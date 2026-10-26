import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDateOfBirthToWondeStudent1722959939571 implements MigrationInterface {
    name = 'AddDateOfBirthToWondeStudent1722959939571';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_student" ADD "dateOfBirth" DATE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imported_student" DROP COLUMN "dateOfBirth"`);
    }
}
