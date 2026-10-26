import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTeacherPowerpointToTeacherResource1789649269468 implements MigrationInterface {
    name = 'RenameTeacherPowerpointToTeacherResource1789649269468';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" RENAME COLUMN "teacherPowerpoint" TO "teacherResource"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" RENAME COLUMN "teacherResource" TO "teacherPowerpoint"`);
    }
}
