import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { LogLwpAccessService } from 'src/api/service/log_lwp_access.service';
import { BASE_MODULE_ENTITIES } from 'src/base.module.entities';

import { mockJwtAuthToken } from './__utils__/AuthMocks';
import { mockNest } from './__utils__/ModuleMocks';
import { mockAuthHeader } from './__utils__/NestMocks';
import { StubRepositoryContainer } from './__utils__/StubRepositoryContainer';
import { IS_PUBLIC_KEY } from './auth.object.decorators';
import { AuthenticatedContext, AuthenticationGuard } from './authentication.guard';
import { AuthenticationService } from './service/authentication.service';
import { UserTrustLevel } from './types/UserTrustLevel';

describe('AuthenticationGuard', () => {
    let guard: AuthenticationGuard;
    let jwtService: JwtService;
    let authService: AuthenticationService;
    let reflector: Reflector;

    beforeAll(async () => {
        const moduleRef = await mockNest(
            {
                imports: [
                    JwtModule.register({
                        secret: 'testsecret'
                    })
                ],
                providers: [AuthenticationService, LogLwpAccessService]
            },
            BASE_MODULE_ENTITIES,
            new StubRepositoryContainer()
        );

        jwtService = moduleRef.get<JwtService>(JwtService);
        authService = moduleRef.get<AuthenticationService>(AuthenticationService);
        reflector = moduleRef.get<Reflector>(Reflector);

        guard = new AuthenticationGuard(authService, reflector, moduleRef.get<LogLwpAccessService>(LogLwpAccessService));
    });

    it('should pass with no auth for public methods', async () => {
        const context = createMock<ExecutionContext>();

        const reflectSpy = jest.spyOn(reflector, 'getAllAndOverride');

        reflectSpy.mockReturnValue(true);

        expect(await guard.canActivate(context)).toBe(true);
        expect(reflectSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.anything());
        expect(reflectSpy).toHaveBeenCalledTimes(1);

        reflectSpy.mockRestore();
    });

    it('should pass with expired auth for public methods', async () => {
        const context = createMock<ExecutionContext>();

        const reflectSpy = jest.spyOn(reflector, 'getAllAndOverride');

        reflectSpy.mockReturnValue(true);

        const token = jwtService.sign(mockJwtAuthToken(0, {}, UserTrustLevel.Full, 0));

        await mockAuthHeader(`Bearer ${token}`, async () => {
            expect(await guard.canActivate(context)).toBe(true);
            expect(reflectSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.anything());
            expect(reflectSpy).toHaveBeenCalledTimes(1);
        });

        reflectSpy.mockRestore();
    });

    it('should fail without auth', () => {
        const context = createMock<ExecutionContext>();

        expect(async () => await guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should fail with invalid auth format', async () => {
        const context = createMock<ExecutionContext>();

        await mockAuthHeader(`notAValidTokenFormat`, () => {
            expect(async () => await guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });
    });

    it('should fail with expired tokens', async () => {
        const context = createMock<ExecutionContext>();

        const token = jwtService.sign(mockJwtAuthToken(0, {}, UserTrustLevel.Full, 0));

        await mockAuthHeader(`Bearer ${token}`, () => {
            expect(async () => await guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });
    });

    it('should return true with auth', async () => {
        const context = createMock<ExecutionContext>();

        const name = 'Test User Authentication';

        const token = jwtService.sign(mockJwtAuthToken(0, { firstName: name }));

        const validateSpy = jest.spyOn(authService, 'validate');

        await mockAuthHeader(`Bearer ${token}`, async (gqlContext: AuthenticatedContext) => {
            expect(await guard.canActivate(context)).toBe(true);

            expect(Object.getOwnPropertyNames(gqlContext).includes('auth')).toBe(true);

            expect(gqlContext.auth.sub).toEqual('0');
            expect(gqlContext.auth.firstName).toEqual(name);

            expect(validateSpy).toHaveBeenCalledTimes(1);
        });
    });
});
