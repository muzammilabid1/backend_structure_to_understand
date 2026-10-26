import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSchoolSpecificEmailTemplateModel1710218552841 implements MigrationInterface {
    name = 'RemoveSchoolSpecificEmailTemplateModel1710218552841';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_7e05a49647736f267b1fdff0ee8"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "schoolId"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "schoolId"`);
        await queryRunner.query(`
            create or replace function gen_notif_data (recipient lwp_user, preferrednotificationtype character varying, emailtemplatetype character varying, isBulkProcess boolean, params jsonb)
            returns lwp_notification
            language plpgsql
            immutable
            as $$
                declare
                    notifType varchar(5) := 'EMAIL';
                    globals jsonb;
                begin
                    if (preferredNotificationType = 'phone' and (recipient)."phoneNumber" is not null) or (recipient)."email" is null then
                        notifType := 'SMS';
                    end if;
                    globals := jsonb_build_object('FIRSTNAME', (recipient).firstname, 'LASTNAME', (recipient).lastname, 'USERSTATUS', (recipient)."userStatus");
                    return jsonb_populate_record(null::lwp_notification, jsonb_build_object('logCreatedAt', now(), 'logUpdatedAt', now(), 'recipient', case notifType
                            when 'SMS' then
                                (recipient)."phoneNumber"
                            else
                                (recipient)."email"
                            end, 'userId', (recipient).id, 'userType', (recipient).type, 'notificationType', notifType, 'emailTemplateType', emailTemplateType, 'params', params || globals, 'context', json_build_object('isBulkProcess', isBulkProcess, 'pupilId', params -> 'PUPILID', 'mailData', jsonb_build_object('to', (recipient).email, 'toName', concat((recipient).firstname, ' ', (recipient).lastname), 'params', params))));
                end;
                $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "schoolId" integer`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "schoolId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_7e05a49647736f267b1fdff0ee8" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
