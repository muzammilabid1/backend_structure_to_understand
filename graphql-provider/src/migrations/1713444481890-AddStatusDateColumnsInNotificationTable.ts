import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusDateColumnsInNotificationTable1713444481890 implements MigrationInterface {
    name = 'AddStatusDateColumnsInNotificationTable1713444481890';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "queuedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "deliveredAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "failedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "rejectedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "openedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD "clickedAt" TIMESTAMP`);
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
                            end, 'userId', (recipient).id, 'userType', (recipient).type, 'notificationType', notifType, 'emailTemplateType', emailTemplateType, 'params', params || globals, 'context', json_build_object('isBulkProcess', isBulkProcess, 'pupilId', params -> 'PUPILID', 'mailData', jsonb_build_object('to', (recipient).email, 'toName', concat((recipient).firstname, ' ', (recipient).lastname), 'params', params)), 'status', 'WAITING'));
                end;
                $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "clickedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "openedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "rejectedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "failedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "deliveredAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP COLUMN "queuedAt"`);
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
}
