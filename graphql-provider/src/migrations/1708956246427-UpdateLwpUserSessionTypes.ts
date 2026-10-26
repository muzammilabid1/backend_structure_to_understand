import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLwpUserSessionTypes1708956246427 implements MigrationInterface {
    name = 'UpdateLwpUserSessionTypes1708956246427';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_session" DROP COLUMN "authMethod"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ADD "authMethod" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_user_session" DROP COLUMN "authMethod"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_session" ADD "authMethod" integer NOT NULL`);
    }
}
