import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantCreateTempToLwpRoUser1756291277516 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`GRANT TEMP ON DATABASE postgres TO "lwpRoUser";`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`REVOKE TEMP ON DATABASE postgres FROM "lwpRoUser";`);
    }
}
