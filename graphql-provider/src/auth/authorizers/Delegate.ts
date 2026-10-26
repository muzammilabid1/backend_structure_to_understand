import { NotFoundException } from '@nestjs/common';

import { AuthResult, ObjectAuthorizer } from '../auth.object.decorators';
import { AuthorizationGuard } from '../authorization.guard';
import { BaseAuthorizerEntity } from '../types/BaseAuthorizerEntity';
import { OpType } from '../types/OpType';

/**
 * Delegate is a function that returns an {@link ObjectAuthorizer}
 * function that delegates authorizaton decisions to another
 * related class. This is only defined for one-to-one
 * relationships.
 *
 * In essence, this is useful for entities where if someone
 * has access to an "owner" entity, they should have
 * access to the "child" entity.
 *
 * Note that, if being called manually, you must pass `this` context
 * into the function (most often using {@link Function#apply}).
 *
 * If used for creations, it will assume the parentId is on the same relation.
 *
 * @param {((): typeof BaseAuthorizerEntity)} delegateTo a forward reference to the entity to delegate to
 * @param {string} onRelation the relation to get the "parent" through
 * @returns {ObjectAuthorizer} an authorizer function for this entity
 */
export const Delegate = (delegateTo: () => typeof BaseAuthorizerEntity, onRelation: string): ObjectAuthorizer<unknown> => {
    return async function (this: typeof BaseAuthorizerEntity, { id, opType, token, parentId }): Promise<AuthResult<unknown>> {
        if (opType === OpType.Write && id === null)
            return AuthorizationGuard.canAccessField(onRelation, await delegateTo().authorize({ id: parentId, opType, token }))
                ? '*'
                : false;

        const relatedId = (
            await this.createQueryBuilder('this')
                .innerJoin(`this.${onRelation}`, 'relatedEntity')
                .select('relatedEntity.id')
                .where('this.id = :id', { id })
                .getRawOne<{ relatedEntity_id: string }>()
        )?.relatedEntity_id;

        if (!relatedId) throw new NotFoundException(`Entity with ID ${id} not found or has no ${onRelation} relation`);

        return AuthorizationGuard.canAccessField(onRelation, await delegateTo().authorize({ id: relatedId, opType, token })) ? '*' : false;
    };
};
