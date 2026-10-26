import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeWondeTableNamesToImportedTableNames1722786979540 implements MigrationInterface {
    name = 'ChangeWondeTableNamesToImportedTableNames1722786979540';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameTable('wonde_contact', 'imported_contact');
        await queryRunner.renameTable('wonde_school', 'imported_school');
        await queryRunner.renameTable('wonde_school_class', 'imported_school_class');
        await queryRunner.renameTable('wonde_student', 'imported_student');
        await queryRunner.renameTable('wonde_student_contact', 'imported_student_contact');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameTable('imported_contact', 'wonde_contact');
        await queryRunner.renameTable('imported_school', 'wonde_school');
        await queryRunner.renameTable('imported_school_class', 'wonde_school_class');
        await queryRunner.renameTable('imported_student', 'wonde_student');
        await queryRunner.renameTable('imported_student_contact', 'wonde_student_contact');
    }
}
