import { ViewEntity } from 'typeorm';

/**
 * LwpViewNotifiableParents shows users who are
 * parents, and who are in INVITED, ACTIVE
 * or ACCOUNTLESS state.
 *
 * @export
 * @class LwpViewNotifiableParents
 */
@ViewEntity({
    expression: `
	select * from lwp_user where "type" = 'PARENT' and "userStatus" = any('{INVITED,ACTIVE,ACCOUNTLESS}')
    `
})
export class LwpViewNotifiableParents {
    // Deliberately not mapped to TypeORM
}
