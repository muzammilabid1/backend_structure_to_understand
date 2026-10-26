/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLwpSetupMagicLinkTimesIfUnsetDBFunctionAndTrigger1733203891041 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            create or replace function lwp_setup_magic_link_times_if_unset ()
                returns trigger
                as $$
            declare
                timeoutInterval interval;
            begin
                timeoutInterval := (((
                    select
                        coalesce(min(value), '{"RESETPASSWORD":1,"INVITATION":24, "REJECT_INVITATION": 24, "TOPICACCESS": 1008, "TROPHY": 1008, "READING": 1008, "DEMOTOPIC": 2160, "SCHOOL_IMPACT_REPORT": 1008}')::jsonb
                    from static_lwp_parameter
                    where
                        key = 'MAGIC_LINK_TIMEOUT')->>(new."type"))::integer * interval '1 hour');
                new."expiryTime" = current_timestamp + timeoutInterval;
                new."lastRegeneratedAt" = now();
                return new;
            end;
            $$
            language plpgsql;

            drop trigger if exists triggerSetupTimesIfUnset on lwp_magic_link;
            
            create trigger triggerSetupTimesIfUnset
                before insert on lwp_magic_link
                for each row
                when (new."expiryTime" is null)
                execute procedure lwp_setup_magic_link_times_if_unset ();
        
            
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
