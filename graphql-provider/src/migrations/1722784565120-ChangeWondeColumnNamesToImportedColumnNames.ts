import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeWondeColumnNamesToImportedColumnNames1722784565120 implements MigrationInterface {
    name = 'ChangeWondeColumnNamesToImportedColumnNames1722784565120';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('wonde_school', 'wondeIgnoredContacts', 'importedIgnoredContacts');

        await queryRunner.renameTable('wonde_school_class_student', 'imported_school_class_student');

        await queryRunner.renameColumn('imported_school_class_student', 'wondeSchoolClassId', 'importedSchoolClassId');

        await queryRunner.renameColumn('imported_school_class_student', 'wondeStudentId', 'importedStudentId');
        await queryRunner.renameColumn('wonde_student_contact', 'wondeStudentId', 'importedStudentId');
        await queryRunner.renameColumn('wonde_student_contact', 'wondeContactId', 'importedContactId');
        await queryRunner.renameColumn('lwp_school', 'wondeSchoolId', 'importedSchoolId');
        await queryRunner.renameColumn('lwp_pupil_parent', 'wondeStudentContactID', 'importedStudentContactID');
        await queryRunner.renameColumn('lwp_pupil', 'wondeStudentId', 'importedStudentId');
        await queryRunner.renameColumn('lwp_user', 'wondeContactId', 'importedContactId');
        await queryRunner.renameColumn('lwp_school_class', 'wondeSchoolClassId', 'importedSchoolClassId');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.renameColumn('wonde_school', 'importedIgnoredContacts', 'wondeIgnoredContacts');

        await queryRunner.renameTable('imported_school_class_student', 'wonde_school_class_student');

        await queryRunner.renameColumn('imported_school_class_student', 'importedSchoolClassId', 'wondeSchoolClassId');
        await queryRunner.renameColumn('imported_school_class_student', 'importedStudentId', 'wondeStudentId');
        await queryRunner.renameColumn('wonde_student_contact', 'importedStudentId', 'wondeStudentId');
        await queryRunner.renameColumn('wonde_student_contact', 'importedContactId', 'wondeContactId');
        await queryRunner.renameColumn('lwp_school', 'importedSchoolId', 'wondeSchoolId');
        await queryRunner.renameColumn('lwp_pupil_parent', 'importedStudentContactID', 'wondeStudentContactID');
        await queryRunner.renameColumn('lwp_pupil', 'importedStudentId', 'wondeStudentId');
        await queryRunner.renameColumn('lwp_user', 'importedContactId', 'wondeContactId');
        await queryRunner.renameColumn('lwp_school_class', 'importedSchoolClassId', 'wondeSchoolClassId');
    }
}
