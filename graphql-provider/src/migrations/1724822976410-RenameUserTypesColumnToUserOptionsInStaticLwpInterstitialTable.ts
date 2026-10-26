import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserTypesColumnToUserOptionsInStaticLwpInterstitialTable1724822976410 implements MigrationInterface {
    name = 'RenameUserTypesColumnToUserOptionsInStaticLwpInterstitialTable1724822976410';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('static_lwp_interstitial', 'userTypes', 'userOptions');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('static_lwp_interstitial', 'userOptions', 'userTypes');
    }
}
