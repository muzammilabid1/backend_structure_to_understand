import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenderAndDateOfBirthColumnsInLwpPupilTable1741831962035 implements MigrationInterface {
    name = 'AddGenderAndDateOfBirthColumnsInLwpPupilTable1741831962035';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "dateOfBirth" date`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "gender" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "gender"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "dateOfBirth"`);
    }
}
