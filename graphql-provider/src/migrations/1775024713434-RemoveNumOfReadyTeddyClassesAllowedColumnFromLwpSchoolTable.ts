import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveNumOfReadyTeddyClassesAllowedColumnFromLwpSchoolTable1775024713434 implements MigrationInterface {
    name = 'RemoveNumOfReadyTeddyClassesAllowedColumnFromLwpSchoolTable1775024713434';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "numOfReadyTeddyClassesAllowed"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "numOfReadyTeddyClassesAllowed" integer NOT NULL DEFAULT '0'`);
    }
}
