import { registerEnumType } from '@nestjs/graphql';
import { UserType } from 'lwp-shared';
/**
 * User types in the application,
 * Brought over from model.ts.
 *
 * @export
 * @enum
 */
export { UserType };

registerEnumType(UserType, {
    name: 'UserType'
});
