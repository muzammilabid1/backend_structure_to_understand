import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexToLwpUserRelations1725359941817 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_8019bce83a2fb14f7a4acdbb97" ON "lwp_feedback_reply" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_f8af153fb49519bb073f62708b" ON "lwp_feedback_reply" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_05b324c4cb7769f7b2acf28c50" ON "lwp_feedback_reply" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_467487742580cea78125ff2d35" ON "log_school_class_license" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_a58714f2da14193cfd898b26de" ON "log_school_class_license" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_46ecec32d5bc90fe9e09dbc9d4" ON "static_lwp_school_tag" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a655ce9718a4945edeae4960d" ON "static_lwp_school_tag" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a648f6142f6bf4762d4cf2d3b" ON "static_lwp_school_tag" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_3d874a69cc610e6edb47643d27" ON "static_lwp_topic_tag" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_6751a3de932c6c8a10fc5e8c2d" ON "static_lwp_topic_tag" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_7ba90d8508a5d220d878b20b89" ON "static_lwp_topic_tag" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_3405c33e7db626983a427afbb4" ON "static_lwp_topic_domain" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_fc671d09c11d32b25117f2b1c6" ON "static_lwp_topic_domain_year_group" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_e068b1f1f8fd4dcf849f2b02b0" ON "static_lwp_topic_domain_year_group" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_56914a5c98348e7b0d64d28196" ON "static_lwp_topic" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_16ce399c90c3f84a15452cbb78" ON "lwp_pupil_parent" ("parentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b27674871a58aa5a9ef34d0e2a" ON "lwp_pupil_feedback" ("tickedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_054f240cad5e4ac4c6bca3ad58" ON "lwp_user_tooltip_history" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_f042874b958f3a9c3707d57f02" ON "lwp_user_tooltip_history" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_a8d05133c82fb8814ab94ce58d" ON "lwp_user_tooltip_history" ("logUpdatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f7a40f291d88aaae96f58a1aa" ON "lwp_magic_link" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7773d6f4bfb3f1047340409a5f" ON "lwp_user_associated_login" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bfb5c86b0fe76e9991b0ec990" ON "static_lwp_activity" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_c8f1d4ebd6ed1b80a4347a0213" ON "static_lwp_activity_steps" ("deletedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_e1f843c022ace5ffed5af0e8fe" ON "static_lwp_email_template" ("deletedById") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_e1f843c022ace5ffed5af0e8fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c8f1d4ebd6ed1b80a4347a0213"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bfb5c86b0fe76e9991b0ec990"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7773d6f4bfb3f1047340409a5f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0f7a40f291d88aaae96f58a1aa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a8d05133c82fb8814ab94ce58d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f042874b958f3a9c3707d57f02"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_054f240cad5e4ac4c6bca3ad58"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b27674871a58aa5a9ef34d0e2a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16ce399c90c3f84a15452cbb78"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_56914a5c98348e7b0d64d28196"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e068b1f1f8fd4dcf849f2b02b0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc671d09c11d32b25117f2b1c6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3405c33e7db626983a427afbb4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ba90d8508a5d220d878b20b89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6751a3de932c6c8a10fc5e8c2d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3d874a69cc610e6edb47643d27"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a648f6142f6bf4762d4cf2d3b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2a655ce9718a4945edeae4960d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_46ecec32d5bc90fe9e09dbc9d4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a58714f2da14193cfd898b26de"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_467487742580cea78125ff2d35"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05b324c4cb7769f7b2acf28c50"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f8af153fb49519bb073f62708b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8019bce83a2fb14f7a4acdbb97"`);
    }
}
