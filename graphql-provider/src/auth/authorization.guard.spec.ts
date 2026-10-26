import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomInt } from 'crypto';
import { BASE_MODULE_ENTITIES } from 'src/base.module.entities';

import { mockJwtAuthToken } from './__utils__/AuthMocks';
import { mockNest } from './__utils__/ModuleMocks';
import { StubRepositoryContainer } from './__utils__/StubRepositoryContainer';
import { AccessRequirement, AuthorizingClass, IS_PUBLIC_KEY, Or, REQUIRE_ACCESS_TO } from './auth.object.decorators';
import { AuthorizationGuard, NO_AUTHORIZATION_REQUIREMENTS_SPECIFIED } from './authorization.guard';
import { OpType } from './types/OpType';
import { UserTrustLevel } from './types/UserTrustLevel';

describe('AuthorizationGuard', () => {
    let guard: AuthorizationGuard;
    let reflector: Reflector;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reflectSpy: jest.SpyInstance<any, [metadataKey: any, target: object, propertyKey: string | symbol], any>;
    let mockKey: string;
    let mockValue: unknown;
    let context: DeepMocked<ExecutionContext>;
    const ctxArgs = [{}, {}, {}, {}];

    const getCurrentMock = (): [string, unknown] => [mockKey, mockValue];
    const getCurrentCtxArgs = (): unknown[] => ctxArgs;

    beforeAll(async () => {
        const moduleRef = await mockNest(
            {
                providers: []
            },
            BASE_MODULE_ENTITIES,
            new StubRepositoryContainer()
        );

        reflector = moduleRef.get<Reflector>(Reflector);

        const originalReflectorFn = Reflect.getMetadata;

        reflectSpy = jest.spyOn(Reflect, 'getMetadata').mockImplementation((key, targets) => {
            const [mockKey, mockValue] = getCurrentMock();

            if (key === mockKey) {
                return mockValue;
            } else {
                originalReflectorFn.call(reflector, key, targets);
            }
        });

        guard = new AuthorizationGuard(reflector);
    });

    beforeEach(() => {
        context = createMock<ExecutionContext>();

        for (let i = 0; i < ctxArgs.length; i++) {
            ctxArgs[i] = {};
        }

        ctxArgs[3]['parentType'] = { name: 'MockAuthorizingClass' };

        context.getArgs.mockImplementation(() => getCurrentCtxArgs());
    });

    afterEach(() => {
        MockAuthorizingClass.authorize.mockReset();
        mockKey = undefined;
        mockValue = undefined;

        reflectSpy.mockClear();
    });

    it('should pass with no auth for public methods', async () => {
        mockKey = IS_PUBLIC_KEY;
        mockValue = true;

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, {});
        expect(reflectSpy).toHaveBeenCalledTimes(1);
    });

    it('should fail for methods which are not public but lack authorization metadata', () => {
        expect(async () => {
            await guard.canActivate(context);
        }).rejects.toThrow(NO_AUTHORIZATION_REQUIREMENTS_SPECIFIED);
    });

    it('should fail when authorizers refuse with no ID passed', async () => {
        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, null]] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue(false);

        expect(await guard.canActivate(context)).toBe(false);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: null, opType: OpType.Read, token: undefined, parentId: null });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);
    });

    describe('optional IDs', () => {
        it('should fail for null IDs by default', () => {
            mockKey = REQUIRE_ACCESS_TO;
            mockValue = [[MockAuthorizingClass, OpType.Read, 'somethingnotset']] as AccessRequirement<never>[];

            expect(() => guard.canActivate(context)).rejects.toThrow(
                'Authorizer ID argument somethingnotset must be an ID string in undefined'
            );
            expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
            expect(MockAuthorizingClass.authorize).not.toHaveBeenCalled();
        });

        it('should pass for null IDs when optional is specified', async () => {
            mockKey = REQUIRE_ACCESS_TO;
            mockValue = [[MockAuthorizingClass, OpType.Read, 'somethingnotset', { optional: true }]] as AccessRequirement<never>[];

            expect(await guard.canActivate(context)).toBe(true);
            expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
            expect(MockAuthorizingClass.authorize).not.toHaveBeenCalled();
        });
    });

    it('should fail when authorizers refuse and pass correct IDs when applicable', async () => {
        const randomId = randomInt(10_000).toString();

        ctxArgs[1]['idVariable'] = randomId;

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, 'idVariable']] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue(false);

        expect(await guard.canActivate(context)).toBe(false);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);
    });

    it('should pass when authorizers accept', async () => {
        const randomId = randomInt(10_000).toString();

        ctxArgs[1]['idVariable'] = randomId;

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [
            [MockAuthorizingClass, OpType.Read, 'idVariable'],
            [MockAuthorizingClass, OpType.Write, 'idVariable']
        ] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
    });

    it('should work with authorizer-only AccessRequirement<never>s', async () => {
        const randomId = randomInt(10_000).toString();

        ctxArgs[1]['idVariable'] = randomId;

        const mockAuthorizer = jest.fn();

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [mockAuthorizer, [MockAuthorizingClass, OpType.Write, 'idVariable']] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');
        mockAuthorizer.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(mockAuthorizer).toHaveBeenCalledWith({ id: null, opType: null, token: undefined });
        expect(mockAuthorizer).toHaveBeenCalledTimes(1);
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Write,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);
    });

    it('should work with nested ID paths', async () => {
        const randomId = randomInt(10_000).toString();

        ctxArgs[1]['nested'] = {};
        ctxArgs[1]['nested']['idVariable'] = randomId;

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [
            [MockAuthorizingClass, OpType.Read, 'nested.idVariable'],
            [MockAuthorizingClass, OpType.Write, 'nested.idVariable']
        ] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Write,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
    });

    it('should work with ID arrays', async () => {
        const randomId = randomInt(10_000).toString();
        const randomId2 = randomInt(10_000).toString();

        ctxArgs[1]['nested'] = {};
        ctxArgs[1]['nested']['idVariable'] = [randomId, randomId2];

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, 'nested.idVariable']] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId2,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
    });

    it('should work with ID argument functions', async () => {
        const randomId = randomInt(10_000).toString();
        const randomId2 = randomInt(10_000).toString();

        ctxArgs[1]['idVariable'] = { test: randomId, test2: randomId2 };

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, (args): unknown => Object.values(args.idVariable)]] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId2,
            opType: OpType.Read,
            token: undefined,
            parentId: null
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
    });

    it('should pass on parent IDs when set', async () => {
        const randomId = randomInt(10_000).toString();
        const randomParentId = randomInt(10_000).toString();

        ctxArgs[1]['idVariable'] = randomId;
        ctxArgs[1]['parentIdVariable'] = randomParentId;

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, 'idVariable', { parentId: 'parentIdVariable' }]] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: randomParentId
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);
    });

    it('should validate required user trust levels', async () => {
        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [
            [MockAuthorizingClass, OpType.Read, 'idVariable', { requiredTrust: UserTrustLevel.Limited }]
        ] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        ctxArgs[1]['idVariable'] = '1';

        const tokenObj = mockJwtAuthToken(1, {}, UserTrustLevel.AsFarAsWeCanThrowThem);

        ctxArgs[2]['auth'] = tokenObj;

        expect(async () => await guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        expect(MockAuthorizingClass.authorize).not.toHaveBeenCalled();

        tokenObj.userTrustLevel = UserTrustLevel.Limited;

        expect(await guard.canActivate(context)).toBe(true);
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);

        tokenObj.userTrustLevel = UserTrustLevel.Full;

        expect(await guard.canActivate(context)).toBe(true);
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
    });

    it('should store authn decisions in GQL context', async () => {
        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, 'idVariable']] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue(['somevalue']);

        ctxArgs[1]['idVariable'] = '1';

        expect(await guard.canActivate(context)).toBe(true);
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);

        expect(ctxArgs[2]['fieldAuthorizations']?.['MockAuthorizingClass']?.[1]).toEqual(['somevalue']);
    });

    it('should work with parent ID arrays', async () => {
        const randomId = randomInt(10_000).toString();
        const randomId2 = randomInt(10_000).toString();

        ctxArgs[1]['parentIds'] = [randomId, randomId2];
        ctxArgs[1]['idVariable'] = [randomId, randomId2];

        mockKey = REQUIRE_ACCESS_TO;
        mockValue = [[MockAuthorizingClass, OpType.Read, 'idVariable', { parentId: 'parentIds' }]] as AccessRequirement<never>[];

        MockAuthorizingClass.authorize.mockReturnValue('*');

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(REQUIRE_ACCESS_TO, {});
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: randomId
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId,
            opType: OpType.Read,
            token: undefined,
            parentId: randomId2
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId2,
            opType: OpType.Read,
            token: undefined,
            parentId: randomId
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({
            id: randomId2,
            opType: OpType.Read,
            token: undefined,
            parentId: randomId2
        });
        expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(4);
    });

    describe('with one failing and one passing authorizer', () => {
        beforeEach(() => {
            ctxArgs[1]['passArg'] = '1';
            ctxArgs[1]['failArg'] = '2';

            mockKey = REQUIRE_ACCESS_TO;

            MockAuthorizingClass.authorize.mockImplementation(({ id }) => {
                if (typeof id === 'string' && id === '1') return '*';

                return false;
            });
        });

        it('should fail when any authorizer fails', async () => {
            mockValue = [
                [MockAuthorizingClass, OpType.Read, 'passArg'],
                [MockAuthorizingClass, OpType.Read, 'failArg']
            ] as AccessRequirement<never>[];

            expect(await guard.canActivate(context)).toBe(false);
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: '1', opType: OpType.Read, token: undefined, parentId: null });
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: '2', opType: OpType.Read, token: undefined, parentId: null });
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
        });

        it('should fail fast when any authorizer fails', async () => {
            mockValue = [
                [MockAuthorizingClass, OpType.Read, 'failArg'],
                [MockAuthorizingClass, OpType.Read, 'passArg']
            ] as AccessRequirement<never>[];

            expect(await guard.canActivate(context)).toBe(false);
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: '2', opType: OpType.Read, token: undefined, parentId: null });
            expect(MockAuthorizingClass.authorize).not.toHaveBeenCalledWith({
                id: '1',
                opType: OpType.Read,
                token: undefined,
                parentId: null
            });
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);
        });
    });

    describe('ORs', () => {
        beforeEach(() => {
            ctxArgs[1]['passArg'] = '1';
            ctxArgs[1]['failArg'] = '2';

            mockKey = REQUIRE_ACCESS_TO;

            MockAuthorizingClass.authorize.mockImplementation(({ id }) => {
                if (typeof id === 'string' && id === '1') return '*';

                return false;
            });
        });

        it('should pass when either branch of an OR passes', async () => {
            mockValue = [
                Or([MockAuthorizingClass, OpType.Read, 'passArg'], [MockAuthorizingClass, OpType.Read, 'failArg'])
            ] as AccessRequirement<never>[];

            expect(await guard.canActivate(context)).toBe(true);
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: '1', opType: OpType.Read, token: undefined, parentId: null });
            expect(MockAuthorizingClass.authorize).not.toHaveBeenCalledWith({
                id: '2',
                opType: OpType.Read,
                token: undefined,
                parentId: null
            });
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(1);
        });

        it('should run in order and pass when either branch of an OR passes', async () => {
            mockValue = [
                Or([MockAuthorizingClass, OpType.Read, 'failArg'], [MockAuthorizingClass, OpType.Read, 'passArg'])
            ] as AccessRequirement<never>[];

            expect(await guard.canActivate(context)).toBe(true);
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: '1', opType: OpType.Read, token: undefined, parentId: null });
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledWith({ id: '2', opType: OpType.Read, token: undefined, parentId: null });
            expect(MockAuthorizingClass.authorize).toHaveBeenCalledTimes(2);
        });

        it('should fail when all fail', async () => {
            mockValue = [Or([MockAuthorizingClass, OpType.Read, 'failArg'], () => false)] as AccessRequirement<never>[];

            expect(await guard.canActivate(context)).toBe(false);
        });
    });
});

describe('canAccessField', () => {
    it('returns correctly for *', () => {
        expect(AuthorizationGuard.canAccessField('anyname', '*')).toBe(true);
    });

    it('returns correctly for a list of fields', () => {
        expect(AuthorizationGuard.canAccessField('anyname', ['anyname'])).toBe(true);
        expect(AuthorizationGuard.canAccessField('notinthelist', ['anyname'])).toBe(false);
    });

    it('returns correctly for a false', () => {
        expect(AuthorizationGuard.canAccessField('anyname', false)).toBe(false);
    });
});

const MockAuthorizingClass: DeepMocked<AuthorizingClass<never>> = class {
    toString = jest.fn(() => 'Mock Authorizer');
    static authorize = jest.fn();
};
