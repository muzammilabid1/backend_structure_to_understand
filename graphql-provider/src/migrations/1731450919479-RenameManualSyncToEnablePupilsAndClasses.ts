import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameManualSyncToEnablePupilsAndClasses1731450919479 implements MigrationInterface {
    name = 'RenameManualSyncToEnablePupilsAndClasses1731450919479';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('lwp_school', 'manualSync', 'enableAddPupilsAndClasses');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('lwp_school', 'enableAddPupilsAndClasses', 'manualSync');
    }
}
