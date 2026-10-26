import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubjectRelationWithStaticLwpInterstitial1746480430079 implements MigrationInterface {
    name = 'AddSubjectRelationWithStaticLwpInterstitial1746480430079';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "subjectId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_interstitial" ADD CONSTRAINT "FK_345735bc2ffcd6f10c1f4c56c2c" FOREIGN KEY ("subjectId") REFERENCES "static_lwp_subject"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP CONSTRAINT "FK_345735bc2ffcd6f10c1f4c56c2c"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "subjectId"`);
    }
}
