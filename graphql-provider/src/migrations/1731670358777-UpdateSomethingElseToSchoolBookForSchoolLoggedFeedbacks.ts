import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSomethingElseToSchoolBookForSchoolLoggedFeedbacks1731670358777 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE lwp_pupil_feedback 
            SET "readingType" = 'SCHOOL_BOOK' 
            WHERE "userType" = 'TEACHER' AND "readingType" = 'SOMETHING_ELSE'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE lwp_pupil_feedback 
            SET "readingType" = 'SOMETHING_ELSE' 
            WHERE "userType" = 'TEACHER' AND "readingType" = 'SCHOOL_BOOK'
        `);
    }
}
