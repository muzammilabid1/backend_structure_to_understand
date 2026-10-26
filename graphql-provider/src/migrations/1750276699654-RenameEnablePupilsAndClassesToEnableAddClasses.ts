import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEnablePupilsAndClassesToEnableAddClasses1750276699654 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('lwp_school', 'enableAddPupilsAndClasses', 'enableAddClasses');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('lwp_school', 'enableAddClasses', 'enableAddPupilsAndClasses');
    }
}
