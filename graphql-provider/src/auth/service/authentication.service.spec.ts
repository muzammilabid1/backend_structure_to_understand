import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from 'jsonwebtoken';
import { UserStatus } from 'lwp-shared';
import { LogLwpLogin } from 'src/api/entities/log_login';
import { LwpUser } from 'src/api/entities/user';
import { LwpUserAssociatedLogin } from 'src/api/entities/user_associated_login';
import { LwpUserSession } from 'src/api/entities/user_session';
import { AcceptUserInvitationInput, LogResults, MagicLinkType, UserAssociatedLoginType } from 'src/api/model';
import { HelperService } from 'src/api/service/helper.service';
import { LogLoginService } from 'src/api/service/log_login.service';
import { MagicLinkService } from 'src/api/service/magic_link.service';
import { ParameterService } from 'src/api/service/parameter.service';
import { UserType } from 'src/auth/types/UserType';
import { BASE_MODULE_ENTITIES } from 'src/base.module.entities';
import { EntityManager, EntityTarget } from 'typeorm';

import { DbMocks } from '../__utils__/DbMocks';
import { mockNest } from '../__utils__/ModuleMocks';
import { RepoAccessLog } from '../__utils__/RepoAccessLog';
import { StubRepositoryContainer } from '../__utils__/StubRepositoryContainer';
import { AuthResolver } from '../auth.resolver';
import { AuthenticationFailedError } from '../types/AuthenticationFailedError';
import { AuthMethod } from '../types/AuthMethod';
import { AuthToken } from '../types/AuthToken';
import { IdpJwtOutput } from '../types/IdpJwtOutput';
import { PreLoginStatus } from '../types/PreLoginStatus';
import { RefreshToken } from '../types/RefreshToken';
import { SessionLength } from '../types/SessionLength';
import { TokenPair } from '../types/TokenPair';
import { UserTrustLevel } from '../types/UserTrustLevel';
import { AuthenticationService, MAGIC_LINKS_ALLOWED_FOR_SIGN_IN } from './authentication.service';
import * as googleIdp from './idps/google';
import * as microsoftIdp from './idps/microsoft';
import { UsersService } from './user.service';

describe('AuthenticationService', () => {
    let authService: AuthenticationService;
    let usersService: UsersService;
    let jwtService: JwtService;
    let logLoginService: LogLoginService;
    let parameterService: ParameterService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usersSpy: jest.SpyInstance<Promise<AuthMethod[]>, [user: LwpUser], any>;
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(async () => {
        const moduleRef = await mockNest(
            {
                imports: [
                    JwtModule.register({
                        secret: 'testsecret'
                    })
                ],
                providers: [AuthenticationService, UsersService, MagicLinkService, LogLoginService, ParameterService]
            },
            BASE_MODULE_ENTITIES,
            mockedRepos
        );

        authService = moduleRef.get<AuthenticationService>(AuthenticationService);
        usersService = moduleRef.get<UsersService>(UsersService);
        jwtService = moduleRef.get<JwtService>(JwtService);
        logLoginService = moduleRef.get<LogLoginService>(LogLoginService);
        parameterService = moduleRef.get<ParameterService>(ParameterService);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => {
        mockedRepos.clearAll();

        jest.spyOn(logLoginService, 'countFailedLogins').mockImplementation(() => Promise.resolve(dbMocks.mockRepos.LogLwpLogin.count()));

        usersSpy = jest.spyOn(usersService, 'getAssociatedAuthMethodsForUser').mockImplementation(() => Promise.resolve([]));

        jest.spyOn(logLoginService, 'nextLoginAllowedAt').mockImplementation(() => {
            const date = new Date();

            date.setMinutes(new Date().getMinutes() + 10);

            return Promise.resolve(date);
        });
    });

    describe('preLogin', () => {
        it('should return correctly for an invited user emailed within the last hour', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.INVITED, options: { lastInvitationEmailSent: new Date() } });

            const inviteSpy = jest.spyOn(usersService, 'sendInvitationEmailForUser').mockReturnValue(null);

            expect(await authService.preLogin(user.email)).toEqual({
                emailOrPhone: user.email,
                status: PreLoginStatus.Invited,
                methods: [AuthMethod.Password],
                canSendEmail: true,
                canSendSms: false
            });

            expect(inviteSpy.mock.calls).toHaveLength(0);
        });

        it('should return correctly for an invited user emailed more than an hour ago', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.INVITED, options: { lastInvitationEmailSent: new Date('1970-01-01') } });

            const inviteSpy = jest.spyOn(usersService, 'sendInvitationEmailForUser').mockReturnValue(null);

            expect(await authService.preLogin(user.email)).toEqual({
                emailOrPhone: user.email,
                status: PreLoginStatus.Invited,
                methods: [AuthMethod.Password],
                canSendEmail: true,
                canSendSms: false
            });

            expect(inviteSpy.mock.calls).toHaveLength(1);
        });

        it('should return correctly for an invited user with a phone number', async () => {
            const user = dbMocks.mockParent({
                status: UserStatus.INVITED,
                options: { phoneNumber: '00000' }
            });

            expect(await authService.preLogin(user.email)).toEqual({
                emailOrPhone: user.email,
                status: PreLoginStatus.Invited,
                methods: [AuthMethod.Password],
                canSendEmail: true,
                canSendSms: true
            });
        });

        it('should return correctly for an imported user', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.IMPORTED });

            expect(await authService.preLogin(user.email)).toEqual({
                emailOrPhone: user.email,
                status: PreLoginStatus.Imported
            });
        });

        it('should return status correctly for an active user', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            expect((await authService.preLogin(user.email)).status).toEqual(PreLoginStatus.OK);
        });

        it('should return correctly for an active user with a Google account', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            usersSpy.mockImplementation(() => Promise.resolve([AuthMethod.Google]));

            await parameterService.addParameter({ key: 'PARENT_SOCIAL_LOGIN_PERMISSIONS', value: '{"google":"true"}' }, '1');

            expect(await authService.preLogin(user.email)).toEqual({
                emailOrPhone: user.email,
                status: PreLoginStatus.OK,
                methods: [AuthMethod.Password, AuthMethod.Google]
            });
        });

        // TODO test login permissions - in here or in UserService?
    });

    describe('login', () => {
        describe('logging in with a password', () => {
            it('throws for nonexistent user', () => {
                expect(async () => {
                    await authService.login('notexist@example.com', 'password', AuthMethod.Password, false);
                }).rejects.toThrow('No such user');
            });

            it('throws for locked user', () => {
                const unlockDate = new Date();

                unlockDate.setTime(unlockDate.getTime() + 60 * 60 * 1000);

                dbMocks.mockParent({ options: { email: 'locked@example.com', unlockAccountTime: unlockDate } });

                expect(async () => {
                    await authService.login('locked@example.com', 'password', AuthMethod.Password, false);
                }).rejects.toThrow('User account is locked');
            });

            describe('given a user with a valid password set', () => {
                let hashedPass: string;

                beforeAll(async () => {
                    hashedPass = await bcrypt.hash('somePasswordGoesInHere', 10);
                });

                beforeEach(() => {
                    dbMocks.mockParent({ options: { email: 'user@example.com', password: hashedPass } });
                });

                describe('brute-force protection', () => {
                    beforeEach(() => {
                        for (let i = 0; i < 4; i++) {
                            const login = new LogLwpLogin();

                            login.userEmail = 'user@example.com';
                            login.result = LogResults.WRONGPASSWORD;
                            login.logCreatedAt = new Date();

                            dbMocks.mockRepos.LogLwpLogin.save(login);
                        }
                    });

                    it('logs in the user OK on the fifth attempt in ten minutes', () => {
                        return authService
                            .login('user@example.com', 'somePasswordGoesInHere', AuthMethod.Password, false)
                            .then((authResult) => {
                                expect(jwtService.verify(authResult.refreshToken)).toBeTruthy();
                            });
                    });

                    it('locks out a user after five attempts in ten minutes', async () => {
                        await expect(async () => {
                            await authService.login('user@example.com', 'notTheSamePassword', AuthMethod.Password, false);
                        }).rejects.toThrow('Invalid password');

                        await expect(async () => {
                            await authService.login('user@example.com', 'somePasswordGoesInHere', AuthMethod.Password, false);
                        }).rejects.toThrow('Your account is temporarily locked. Please try again in 10 minutes.');
                    });

                    it('locks out a user after five attempts in ten minutes', async () => {
                        await expect(async () => {
                            await authService.login('user@example.com', 'notTheSamePassword', AuthMethod.Password, false);
                        }).rejects.toThrow('Invalid password');

                        await expect(async () => {
                            await authService.login('user@example.com', 'somePasswordGoesInHere', AuthMethod.Password, false);
                        }).rejects.toThrow('Your account is temporarily locked. Please try again in 10 minutes.');
                    });
                });

                it('throws for invalid password', async () => {
                    await expect(async () => {
                        await authService.login('user@example.com', 'notTheSamePassword', AuthMethod.Password, false);
                    }).rejects.toThrow('Invalid password');
                });

                it('succeeds and issues a short token for no remember me', () => {
                    return authService
                        .login('user@example.com', 'somePasswordGoesInHere', AuthMethod.Password, false)
                        .then((authResult) => {
                            const exp = jwtService.decode(authResult.refreshToken)['exp'];

                            // 5 second tolerance to be extremely generous
                            expect(exp).toBeLessThanOrEqual(new Date().getTime() / 1000 + 6000 * 60);
                            expect(exp).toBeGreaterThanOrEqual(new Date().getTime() / 1000 + 60 * 60 - 5);
                        });
                });

                it('succeeds and issues a long token for remember me', () => {
                    return authService.login('user@example.com', 'somePasswordGoesInHere', AuthMethod.Password, true).then((authResult) => {
                        const exp = jwtService.decode(authResult.refreshToken)['exp'];

                        // 5 second tolerance to be extremely generous
                        expect(exp).toBeLessThanOrEqual(new Date().getTime() / 1000 + 60 * 60 * 24 * 30);
                        expect(exp).toBeGreaterThanOrEqual(new Date().getTime() / 1000 + 60 * 60 * 24 * 30 - 5);
                    });
                });
            });
        });

        describe('logging in with Google', () => {
            const spy = jest.spyOn(googleIdp, 'validateGoogleJwt');

            beforeEach(() => {
                spy.mockClear();
                spy.mockImplementation(() => {
                    return Promise.resolve({ id: '1' });
                });
            });

            itBehavesLikeASocialLoginMatcher(spy, AuthMethod.Google, UserAssociatedLoginType.GOOGLE);

            it('issues a short token irrespective of remember me', async () => {
                const user = dbMocks.mockParent({ options: { email: 'parent@example.com' } });

                dbMocks.mockUserAssociatedLogin(user, '1', UserAssociatedLoginType.GOOGLE);

                for (const val of [true, false]) {
                    const tokenPair = await authService.login('user@example.com', 'token', AuthMethod.Google, val);

                    expect(tokenPair.accessToken).toBeTruthy();
                    expect(tokenPair.refreshToken).toBeTruthy();

                    const exp = jwtService.decode(tokenPair.refreshToken)['exp'];

                    // 5 second tolerance to be extremely generous
                    expect(exp).toBeLessThanOrEqual(new Date().getTime() / 1000 + 60 * 60 * 12);
                    expect(exp).toBeGreaterThanOrEqual(new Date().getTime() / 1000 + 60 * 60 - 5);
                }
            });
        });

        describe('logging in with Microsoft', () => {
            const spy = jest.spyOn(microsoftIdp, 'validateMicrosoftJwt');

            beforeEach(() => {
                spy.mockClear();
                spy.mockImplementation(() => {
                    return Promise.resolve({ id: '1' });
                });
            });

            itBehavesLikeASocialLoginMatcher(spy, AuthMethod.Microsoft, UserAssociatedLoginType.MICROSOFT);

            it('issues an instant token with no refresh token irrespective of remember me', async () => {
                const user = dbMocks.mockParent({ options: { email: 'parent@example.com' } });

                dbMocks.mockUserAssociatedLogin(user, '1', UserAssociatedLoginType.MICROSOFT);

                for (const val of [true, false]) {
                    const tokenPair = await authService.login('user@example.com', 'token', AuthMethod.Microsoft, val);

                    expect(tokenPair.accessToken).toBeTruthy();
                    expect(tokenPair?.refreshToken).toBeFalsy();
                }
            });
        });

        it("doesn't confuse Microsoft and Google IDs even if they clash", () => {
            const user = dbMocks.mockParent({ options: { email: 'parent@example.com' } });

            dbMocks.mockUserAssociatedLogin(user, 'MICROSOFT1', UserAssociatedLoginType.MICROSOFT);
            dbMocks.mockUserAssociatedLogin(user, 'GOOGLE1', UserAssociatedLoginType.GOOGLE);

            jest.spyOn(microsoftIdp, 'validateMicrosoftJwt').mockImplementation(() => {
                return Promise.resolve({ id: 'GOOGLE1' });
            });

            jest.spyOn(googleIdp, 'validateGoogleJwt').mockImplementation(() => {
                return Promise.resolve({ id: 'MICROSOFT1' });
            });

            expect(async () => {
                await authService.login('parent@example.com', 'token', AuthMethod.Microsoft, false);
            }).rejects.toThrow("Couldn't match that login to a Learning with Parents user.");

            expect(async () => {
                await authService.login('parent@example.com', 'token', AuthMethod.Google, false);
            }).rejects.toThrow("Couldn't match that login to a Learning with Parents user.");
        });
    });

    describe('signInUser', () => {
        it('throws for inactive user', () => {
            const user = dbMocks.mockParent({ status: UserStatus.IMPORTED });

            expect(authService.signInUser(user.id, SessionLength.Instant, AuthMethod.Password)).rejects.toThrow(AuthenticationFailedError);
        });

        it('throws for teachers of inactive schools', () => {
            const school = dbMocks.mockSchool();

            school.inactive = true;
            const user = dbMocks.mockTeacher({ school });

            expect(authService.signInUser(user.id, SessionLength.Instant, AuthMethod.Password)).rejects.toThrow(AuthenticationFailedError);
        });

        it("returns an access token but doesn't return a refresh token for an instant session", async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            const authResult = await authService.signInUser(user.id, SessionLength.Instant, AuthMethod.Password);

            expect(authResult.accessToken).toBeTruthy();
            expect(authResult.refreshToken).toBeFalsy();
            expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() })).toBeTruthy();
        });

        it('returns an access token and a refresh token for a short session, with correct timings', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            const authResult = await authService.signInUser(user.id, SessionLength.Short, AuthMethod.Password);

            expect(authResult.accessToken).toBeTruthy();
            expect(authResult.refreshToken).toBeTruthy();
            expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(authResult.refreshToken, { subject: user.id.toString() })).toBeTruthy();

            // 1 hour please - floored and /1000 to get to same precision as in JWT
            expect(jwtService.decode(authResult.refreshToken)['exp']).toEqual(Math.floor((Date.now() + 1000 * 60 * 60) / 1000));
        });

        it('returns an access token and a refresh token for a long session, with correct timings', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            const authResult = await authService.signInUser(user.id, SessionLength.Long, AuthMethod.Password);

            expect(authResult.accessToken).toBeTruthy();
            expect(authResult.refreshToken).toBeTruthy();
            expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(authResult.refreshToken, { subject: user.id.toString() })).toBeTruthy();

            // 30 days please - floored and /1000 to get to same precision as in JWT
            expect(jwtService.decode(authResult.refreshToken)['exp']).toEqual(Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000));
        });

        it('updates an existing session when one is passed in', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });
            const session = dbMocks.mockSession(user);

            const authResult = await authService.signInUser(user.id, SessionLength.Long, AuthMethod.Password, '', '', session.id);

            expect(authResult.accessToken).toBeTruthy();
            expect(authResult.refreshToken).toBeTruthy();
            expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(authResult.refreshToken, { subject: user.id.toString() })).toBeTruthy();

            expect(jwtService.decode(authResult.refreshToken)['jti']).toEqual(session.refreshToken);
        });

        it('returns limited trust for magic link auth', async () => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            const authResult = await authService.signInUser(user.id, SessionLength.Instant, AuthMethod.MagicLink);

            expect(authResult.accessToken).toBeTruthy();
            expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() }).userTrustLevel).toEqual(
                UserTrustLevel.Limited
            );
        });

        it.each(
            (Object.entries(UserTrustLevel) as [string, UserTrustLevel][]).filter(([, trustLevel]) => trustLevel !== UserTrustLevel.Limited)
        )('returns %s trust for magic link auth if overridden', async (_, trustLevel) => {
            const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

            const authResult = await authService.signInUser(
                user.id,
                SessionLength.Instant,
                AuthMethod.MagicLink,
                null,
                null,
                null,
                trustLevel
            );

            expect(authResult.accessToken).toBeTruthy();
            expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() }).userTrustLevel).toEqual(trustLevel);
        });

        it.each(Object.entries(AuthMethod).filter(([, method]) => method !== AuthMethod.MagicLink))(
            'returns full trust for %s auth',
            async (_, method) => {
                const user = dbMocks.mockParent({ status: UserStatus.ACTIVE });

                const authResult = await authService.signInUser(user.id, SessionLength.Instant, method as AuthMethod);

                expect(authResult.accessToken).toBeTruthy();
                expect(jwtService.verify(authResult.accessToken, { subject: user.id.toString() }).userTrustLevel).toEqual(
                    UserTrustLevel.Full
                );
            }
        );
    });

    describe('refreshSession', () => {
        let user: LwpUser;
        let session: LwpUserSession;

        beforeEach(() => {
            user = dbMocks.mockParent();
            session = dbMocks.mockSession(user, { refreshToken: 'jtidgoeshere', sessionLength: SessionLength.Short });
        });

        it('validates that a session exists', () => {
            expect(() => authService.refreshSession(user.id, 'notarealjtid')).rejects.toThrow(ForbiddenException);
        });

        it('validates that the session has the same user ID', () => {
            expect(() => authService.refreshSession('5', 'jtidgoeshere')).rejects.toThrow(ForbiddenException);
        });

        it('issues a new token with the same session length when correctly validated', async () => {
            const tokenPair = await authService.refreshSession(user.id, 'jtidgoeshere');

            expect(jwtService.verify(tokenPair.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(tokenPair.refreshToken, { subject: user.id.toString() }).exp / 1000).toBeCloseTo(
                Math.floor((Date.now() + 1000 * 60 * 60) / 1000) / 1000
            );
        });

        it('updates session IDs correctly after refresh', async () => {
            await authService.refreshSession(user.id, 'jtidgoeshere');

            expect(session.previousRefreshToken).toEqual('jtidgoeshere');
            expect(session.refreshToken).not.toEqual('jtidgoeshere');
        });

        it('calls a callback if required', async () => {
            const fn = jest.fn();

            const tokenPair = await authService.refreshSession(user.id, 'jtidgoeshere', fn);

            expect(jwtService.verify(tokenPair.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(tokenPair.refreshToken, { subject: user.id.toString() }).exp / 1000).toBeCloseTo(
                Math.floor((Date.now() + 1000 * 60 * 60) / 1000) / 1000
            );
            expect(fn).toHaveBeenCalledWith(session);
        });

        it('sets a custom session length if required', async () => {
            const fn = jest.fn();

            const tokenPair = await authService.refreshSession(user.id, 'jtidgoeshere', fn, SessionLength.Long);

            expect(jwtService.verify(tokenPair.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(tokenPair.refreshToken, { subject: user.id.toString() }).exp / 1000).toBeCloseTo(
                Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000) / 1000
            );
            expect(fn).toHaveBeenCalledWith(session);
        });

        it('issues a new token with the same refresh token ID when a duplicate request comes in within the grace period', async () => {
            dbMocks.mockSession(user, {
                refreshToken: 'jtidgoeshere',
                previousRefreshToken: 'jtidold',
                sessionLength: SessionLength.Short,
                logUpdatedAt: new Date(Date.now() - 5000)
            });

            const tokenPair = await authService.refreshSession(user.id, 'jtidold');

            expect(jwtService.verify(tokenPair.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(
                jwtService.verify(tokenPair.refreshToken, { jwtid: 'jtidgoeshere', subject: user.id.toString() }).exp / 1000
            ).toBeCloseTo((Math.floor((Date.now() + 1000 * 60 * 60) / 1000) - 5) / 1000);
        });

        it('refuses to issue a new token with the same refresh token ID when a duplicate request comes in outside the grace period', () => {
            dbMocks.mockSession(user, {
                refreshToken: 'jtidgoeshere',
                previousRefreshToken: 'jtidold',
                sessionLength: SessionLength.Short,
                logUpdatedAt: new Date(Date.now() - 65000)
            });

            expect(() => authService.refreshSession(user.id, 'jtidold')).rejects.toThrow(ForbiddenException);
        });
    });

    describe('trust level after refreshing a session started by accepting an invitation', () => {
        // Accepting an invitation used to save the session as a magic link login with a one-off Full trust override.
        // The override only applies to the first access token: a refresh rebuilds the token from the session's saved
        // auth method, so every refresh dropped the user to Limited trust and hid other users' names from them.
        let resolver: AuthResolver;
        let leader: LwpUser;

        beforeAll(() => {
            // Built directly: resolving AuthResolver through Nest also resolves its throttler guard's module options.
            resolver = new AuthResolver(authService, usersService, {
                extractUserAgentFromContext: () => 'jest'
            } as unknown as HelperService);
        });

        beforeEach(() => {
            // Saving the account details is covered by UsersService; here only the sign-in that follows matters.
            leader = dbMocks.mockTeacher({ leader: true });
            jest.spyOn(usersService, 'acceptUserInvitation').mockResolvedValue(leader);
        });

        /**
         * Refreshes a session the way the frontend does once its access token expires, and returns the new tokens.
         */
        const refresh = (user: LwpUser, tokens: TokenPair): Promise<TokenPair> =>
            authService.refreshSession(user.id, jwtService.verify(tokens.refreshToken).jti);

        const trustLevel = (tokens: TokenPair): UserTrustLevel => jwtService.verify(tokens.accessToken).userTrustLevel;

        const savedAuthMethod = (user: LwpUser): AuthMethod =>
            (mockedRepos.repos().LwpUserSession.findOne({ where: { userId: user.id } }) as LwpUserSession).authMethod;

        it.each([
            {
                signedUpWith: 'a password',
                input: { password: 'Password123!' },
                authMethod: AuthMethod.Password,
                trustAfterRefresh: UserTrustLevel.Full
            },
            {
                signedUpWith: 'a Google account',
                input: { socialLoginProvider: UserAssociatedLoginType.GOOGLE, socialLoginJwt: 'jwt' },
                authMethod: AuthMethod.Google,
                trustAfterRefresh: UserTrustLevel.Full
            },
            {
                signedUpWith: 'a Microsoft account',
                input: { socialLoginProvider: UserAssociatedLoginType.MICROSOFT, socialLoginJwt: 'jwt' },
                authMethod: AuthMethod.Microsoft,
                trustAfterRefresh: UserTrustLevel.Full
            },
            {
                // UsersService only connects a social account when the token is sent too, so a password is what was set up.
                signedUpWith: 'a password and a social provider but no social token',
                input: { password: 'Password123!', socialLoginProvider: UserAssociatedLoginType.GOOGLE },
                authMethod: AuthMethod.Password,
                trustAfterRefresh: UserTrustLevel.Full
            },
            {
                // With no credential, the invitation link is all the user proved, so refreshes stay limited as before.
                signedUpWith: 'no credential',
                input: {},
                authMethod: AuthMethod.MagicLink,
                trustAfterRefresh: UserTrustLevel.Limited
            }
        ])(
            'after signing up with $signedUpWith, saves the session as $authMethod and refreshes to trust level $trustAfterRefresh',
            async ({ input, authMethod, trustAfterRefresh }) => {
                const tokens = await resolver.acceptUserInvitation(input as AcceptUserInvitationInput, {});

                // The first access token always has full trust, as before this fix.
                expect(trustLevel(tokens)).toEqual(UserTrustLevel.Full);
                expect(savedAuthMethod(leader)).toEqual(authMethod);
                expect(trustLevel(await refresh(leader, tokens))).toEqual(trustAfterRefresh);
            }
        );

        it('keeps full trust across repeated refreshes after signing up with a password', async () => {
            const tokens = await resolver.acceptUserInvitation({ password: 'Password123!' } as AcceptUserInvitationInput, {});

            const firstRefresh = await refresh(leader, tokens);
            const secondRefresh = await refresh(leader, firstRefresh);

            expect(trustLevel(firstRefresh)).toEqual(UserTrustLevel.Full);
            expect(trustLevel(secondRefresh)).toEqual(UserTrustLevel.Full);
        });

        it('keeps limited trust before and after a refresh for a magic link sign-in (unchanged)', async () => {
            const parent = dbMocks.mockParent();
            const tokens = await authService.signInUser(parent.id, SessionLength.Short, AuthMethod.MagicLink);

            expect(trustLevel(tokens)).toEqual(UserTrustLevel.Limited);
            expect(trustLevel(await refresh(parent, tokens))).toEqual(UserTrustLevel.Limited);
        });
    });

    describe('refreshSession transaction discipline (LEA-6693)', () => {
        // A refresh holds a row lock on the session for the life of its transaction. Any query it
        // makes through a default repository needs a second pooled connection while the first is
        // still held; once every pooled connection is held by a refresh waiting for a second one,
        // the pool deadlocks and the server stops answering. These tests record which connection
        // every repository call runs on and require all of them to be the transaction's.
        const accessLog = new RepoAccessLog();
        const transactionalRepos = new StubRepositoryContainer();
        let transactionalAuthService: AuthenticationService;
        let transactionalDbMocks: DbMocks;
        let user: LwpUser;

        beforeAll(async () => {
            const moduleRef = await mockNest(
                {
                    imports: [JwtModule.register({ secret: 'testsecret' })],
                    providers: [AuthenticationService, UsersService, MagicLinkService, LogLoginService, ParameterService]
                },
                BASE_MODULE_ENTITIES,
                transactionalRepos,
                (repo, entityName) => accessLog.track(repo, 'pool', entityName)
            );

            transactionalAuthService = moduleRef.get<AuthenticationService>(AuthenticationService);
            transactionalDbMocks = new DbMocks(transactionalRepos);

            // Repositories obtained from the transaction's manager wrap the same stubs, so the data is
            // shared with the injected repositories, but calls on them are recorded as transactional.
            const manager = {
                getRepository: (entity: EntityTarget<never>): unknown => {
                    const entityName = entity['name'] || entity.toString();

                    return accessLog.track(transactionalRepos.repos()[entityName], 'transaction', entityName);
                }
            } as unknown as EntityManager;

            transactionalRepos.repos().LwpUserSession.manager = {
                transaction: ((run: (manager: EntityManager) => Promise<unknown>) =>
                    run(manager)) as unknown as EntityManager['transaction']
            };
        });

        beforeEach(() => {
            transactionalRepos.clearAll();
            accessLog.clear();

            user = transactionalDbMocks.mockParent();
            transactionalDbMocks.mockSession(user, { refreshToken: 'jtidgoeshere', sessionLength: SessionLength.Short });
        });

        it.each([
            ['a refresh', (): Promise<TokenPair> => transactionalAuthService.refreshSession(user.id, 'jtidgoeshere')],
            ['a session upgrade', (): Promise<TokenPair> => transactionalAuthService.upgradeSession(user.id, 'jtidgoeshere')]
        ])('runs every database call for %s on the transaction, never on the pool', async (_, refresh) => {
            await refresh();

            expect(accessLog.describe('pool')).toEqual([]);
            expect(accessLog.describe()).toEqual([
                'transaction:LwpUserSession.findOne', // find and lock the session
                'transaction:LwpUser.findOne', // load the user for the access token
                'transaction:LwpSchool.createQueryBuilder', // hydrate the user's school for the access token
                'transaction:LwpPupilParent.find', // load the parent's pupil IDs for the access token
                'transaction:LwpUserSession.update', // rotate the refresh token
                'transaction:LwpUser.update' // record last access
            ]);
        });

        it('runs every database call for a duplicate refresh within the grace period on the transaction, never on the pool', async () => {
            transactionalDbMocks.mockSession(user, {
                refreshToken: 'jtidnew',
                previousRefreshToken: 'jtidold',
                sessionLength: SessionLength.Short,
                logUpdatedAt: new Date(Date.now() - 5000)
            });

            await transactionalAuthService.refreshSession(user.id, 'jtidold');

            expect(accessLog.describe('pool')).toEqual([]);
            expect(accessLog.describe()).toEqual([
                'transaction:LwpUserSession.findOne', // no session has this refresh token any more
                'transaction:LwpUserSession.findOne', // so look for one recently rotated away from it
                'transaction:LwpUser.findOne', // load the user for the access token
                'transaction:LwpSchool.createQueryBuilder', // hydrate the user's school for the access token
                'transaction:LwpPupilParent.find' // load the parent's pupil IDs for the access token
            ]);
        });
    });

    describe('connectSocialAccount', () => {
        let user: LwpUser;
        const googleSpy = jest.spyOn(googleIdp, 'validateGoogleJwt');
        const microsoftSpy = jest.spyOn(microsoftIdp, 'validateMicrosoftJwt');
        let dbSpy: jest.SpyInstance<
            Promise<LwpUserAssociatedLogin>,
            [user: string | LwpUser, accountType: UserAssociatedLoginType, idpData: IdpJwtOutput],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            any
        >;
        const idpData = { id: '1' };

        beforeAll(() => (dbSpy = jest.spyOn(usersService, 'connectSocialAccount')));

        beforeEach(() => {
            user = dbMocks.mockParent();
            dbSpy.mockClear();

            [googleSpy, microsoftSpy].forEach((spy) => {
                spy.mockClear();
                spy.mockImplementation(() => {
                    return Promise.resolve(idpData);
                });
            });
        });

        it('calls the Google functions appropriately', async () => {
            expect(await authService.connectSocialAccount(user.id, UserAssociatedLoginType.GOOGLE, 'test')).toEqual(true);
            expect(googleSpy).toHaveBeenCalledWith('test', undefined);
            expect(microsoftSpy).not.toHaveBeenCalled();
            expect(dbSpy).toHaveBeenCalledWith(user.id, UserAssociatedLoginType.GOOGLE, idpData);
        });

        it('calls the Microsoft functions appropriately', async () => {
            expect(await authService.connectSocialAccount(user.id, UserAssociatedLoginType.MICROSOFT, 'test')).toEqual(true);
            expect(microsoftSpy).toHaveBeenCalledWith('test', undefined);
            expect(googleSpy).not.toHaveBeenCalled();
            expect(dbSpy).toHaveBeenCalledWith(user.id, UserAssociatedLoginType.MICROSOFT, idpData);
        });

        it("returns false and doesn't attach an account if the token verification fails", async () => {
            microsoftSpy.mockResolvedValue(false);
            expect(await authService.connectSocialAccount(user.id, UserAssociatedLoginType.MICROSOFT, 'test')).toEqual(false);
            expect(microsoftSpy).toHaveBeenCalledWith('test', undefined);
            expect(googleSpy).not.toHaveBeenCalled();
            expect(dbSpy).not.toHaveBeenCalled();
        });

        describe('teacher connection with schools with tenant restrictions', () => {
            beforeEach(() => {
                const school = dbMocks.mockSchool();

                school.tenantDomain = 'google.com';
                school.msTenantIssuer = 'https://login.microsoftonline.com/e660f51d-0486-4cb4-a342-604eb20d287d/v2.0';

                user = dbMocks.mockTeacher({
                    school
                });

                dbSpy.mockClear();

                [googleSpy, microsoftSpy].forEach((spy) => {
                    spy.mockClear();
                    spy.mockImplementation(() => {
                        return Promise.resolve(idpData);
                    });
                });
            });

            it('calls the Google functions with the correct domain restriction', async () => {
                expect(await authService.connectSocialAccount(user.id, UserAssociatedLoginType.GOOGLE, 'test')).toEqual(true);
                expect(googleSpy).toHaveBeenCalledWith('test', 'google.com');
                expect(microsoftSpy).not.toHaveBeenCalled();
                expect(dbSpy).toHaveBeenCalledWith(user.id, UserAssociatedLoginType.GOOGLE, idpData);
            });

            it('calls the Microsoft functions with the correct domain restriction', async () => {
                expect(await authService.connectSocialAccount(user.id, UserAssociatedLoginType.MICROSOFT, 'test')).toEqual(true);
                expect(microsoftSpy).toHaveBeenCalledWith(
                    'test',
                    'https://login.microsoftonline.com/e660f51d-0486-4cb4-a342-604eb20d287d/v2.0'
                );
                expect(googleSpy).not.toHaveBeenCalled();
                expect(dbSpy).toHaveBeenCalledWith(user.id, UserAssociatedLoginType.MICROSOFT, idpData);
            });
        });
    });

    describe('upgradeSession', () => {
        let user: LwpUser;

        beforeEach(() => {
            user = dbMocks.mockParent();
        });

        it('upgrades a short lived session correctly', async () => {
            dbMocks.mockSession(user, { refreshToken: 'jtidgoeshere', sessionLength: SessionLength.Short });

            const tokenPair = await authService.upgradeSession(user.id, 'jtidgoeshere');

            expect(jwtService.verify(tokenPair.accessToken, { subject: user.id.toString() })).toBeTruthy();
            expect(jwtService.verify(tokenPair.refreshToken, { subject: user.id.toString() }).exp).toEqual(
                Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000)
            );
        });

        it.each([SessionLength.Instant, SessionLength.Long])('refuses to upgrade a %s-lived session', (sessionLength) => {
            dbMocks.mockSession(user, { refreshToken: 'jtidgoeshere', sessionLength });

            const upgradeFn = (): Promise<TokenPair> => authService.upgradeSession(user.id, 'jtidgoeshere');

            expect(upgradeFn).rejects.toThrow("you can't upgrade a session that isn't a short-lived session");

            expect(upgradeFn).rejects.toThrow(BadRequestException);
        });
    });

    describe('redeemMagicLink', () => {
        it.each(MAGIC_LINKS_ALLOWED_FOR_SIGN_IN)('creates an appropriate response including sign in data for %s', async (type) => {
            const link = dbMocks.mockMagicLink(type);

            const magicOutput = await authService.redeemMagicLink(link.url);

            expect(magicOutput.type).toEqual(type);
            expect(magicOutput.tokens).toBeTruthy();
            expect(jwtService.verify(magicOutput.tokens.accessToken, { subject: link.user.id.toString() }));

            // It should last 1 hour for the website
            expect(jwtService.decode(magicOutput.tokens.refreshToken)['exp'] / 1000).toBeCloseTo(
                Math.floor((Date.now() + 1000 * 60 * 60) / 1000) / 1000
            );
        });

        it.each(MAGIC_LINKS_ALLOWED_FOR_SIGN_IN)(
            'creates an appropriate response including sign in data for %s (long length session for PWA)',
            async (type) => {
                const link = dbMocks.mockMagicLink(type);

                const magicOutput = await authService.redeemMagicLink(link.url, null, null, true);

                expect(magicOutput.type).toEqual(type);
                expect(magicOutput.tokens).toBeTruthy();
                expect(jwtService.verify(magicOutput.tokens.accessToken, { subject: link.user.id.toString() }));

                // It should last 30 days for PWA
                expect(jwtService.decode(magicOutput.tokens.refreshToken)['exp'] / 1000).toBeCloseTo(
                    Math.floor((Date.now() + 1000 * 60 * 60 * 24 * 30) / 1000) / 1000
                );
            }
        );

        it.each(Object.values(MagicLinkType).filter((t) => !MAGIC_LINKS_ALLOWED_FOR_SIGN_IN.includes(t)))(
            'creates an appropriate response without sign in data for %s',
            async (type) => {
                const link = dbMocks.mockMagicLink(type);

                const magicOutput = await authService.redeemMagicLink(link.url);

                expect(magicOutput.type).toEqual(type);
                expect(magicOutput.tokens).toBeFalsy();
            }
        );

        it("doesn't redeem expired links", () => {
            const link = dbMocks.mockMagicLink(MagicLinkType.TOPICACCESS, new Date('2023-01-01'));

            expect(() => authService.redeemMagicLink(link.url)).rejects.toThrow('token expired');
        });
    });

    describe('logout', () => {
        let user: LwpUser;

        beforeEach(() => {
            user = dbMocks.mockParent();
            dbMocks.mockSession(user, { refreshToken: 'jtidgoeshere', sessionLength: SessionLength.Short });
        });

        it('validates that a session exists', () => {
            expect(() => authService.logout(user.id, 'notarealjtid')).rejects.toThrow(ForbiddenException);
        });

        it('validates that the session has the same user ID', () => {
            expect(() => authService.logout('5', 'jtidgoeshere')).rejects.toThrow(ForbiddenException);
        });

        it('deletes the session when correctly validated', async () => {
            expect(mockedRepos.repos().LwpUserSession.count()).toEqual(1);

            await authService.logout(user.id, 'jtidgoeshere');

            expect(mockedRepos.repos().LwpUserSession.count()).toEqual(0);
        });
    });

    /**
     * itBehavesLikeASocialLoginMatcher checks that `it` matches
     * in the appropriate way for a social login IDP.
     *
     * @param {jest.SpyInstance<Promise<false | IdpJwtOutput>, [jwt: string, tenantIdentifier?: string], unknown>} jwtValidatorSpy the current instance of the spy
     * @param {AuthMethod.Google | AuthMethod.Microsoft} authMethod the idp authMethod
     * @param {UserAssociatedLoginType} userLoginType the user login type
     */
    function itBehavesLikeASocialLoginMatcher(
        jwtValidatorSpy: jest.SpyInstance<Promise<false | IdpJwtOutput>, [jwt: string, tenantIdentifier?: string], unknown>,
        authMethod: AuthMethod.Google | AuthMethod.Microsoft,
        userLoginType: UserAssociatedLoginType
    ): void {
        it('matches users with exact social login ID matches', async () => {
            const user = dbMocks.mockParent({ options: { email: 'parent@example.com' } });

            dbMocks.mockUserAssociatedLogin(user, '1', userLoginType);

            const tokenPair = await authService.login('parent@example.com', 'token', authMethod);

            expect((jwtService.decode(tokenPair.accessToken) as JwtPayload)['sub']).toEqual(user.id.toString());
        });

        it.skip('matches users with email matches and creates social login ID matches for them', async () => {
            const user = dbMocks.mockParent({ options: { email: 'parent@example.com' } });

            jwtValidatorSpy.mockImplementation(() => {
                return Promise.resolve({ id: '1', email: 'parent@example.com' });
            });

            const tokenPair = await authService.login('parent@example.com', 'token', authMethod);

            expect((jwtService.decode(tokenPair.accessToken) as JwtPayload)['sub']).toEqual(user.id.toString());

            expect(mockedRepos.repos().LwpUserAssociatedLogin.findOne({ where: { user: user } })).toBeTruthy();
            expect(
                (mockedRepos.repos().LwpUserAssociatedLogin.findOne({ where: { user: user } }) as LwpUserAssociatedLogin).accountId
            ).toEqual('1');
            expect(
                (mockedRepos.repos().LwpUserAssociatedLogin.findOne({ where: { user: user } }) as LwpUserAssociatedLogin).accountType
            ).toEqual(userLoginType);
        });

        it('rejects other users', () => {
            dbMocks.mockParent({ options: { email: 'parent@example.com' } });

            jwtValidatorSpy.mockImplementation(() => {
                return Promise.resolve({ id: '1', email: 'parent@example.com' });
            });

            expect(async () => {
                await authService.login('parent@example.com', 'token', authMethod, false);
            }).rejects.toThrow("Couldn't match that login to a Learning with Parents user.");
        });

        it('calls to validate jwt correctly', async () => {
            const user = dbMocks.mockParent({ options: { email: 'parent@example.com' } });

            dbMocks.mockUserAssociatedLogin(user, '1', userLoginType);

            await authService.login('parent@example.com', 'token', authMethod);

            expect(jwtValidatorSpy).toHaveBeenCalledWith('token');
            expect(jwtValidatorSpy).toHaveBeenCalledTimes(1);
        });
    }

    describe('validateJwt', () => {
        const validToken: AuthToken = new AuthToken({
            firstName: 'Test',
            lastName: 'User',
            userType: UserType.PARENT,
            status: UserStatus.INVITED
        });

        it('checks valid signatures', () => {
            const token = jwtService.sign(validToken.toPayload(), { secret: 'testnottherightsecret', subject: '1', expiresIn: '1 hour' });

            expect(async () => {
                await authService.validate(token, AuthToken);
            }).rejects.toThrow('invalid token');
        });

        it('checks expiry', () => {
            const token = jwtService.sign(validToken.toPayload(), { expiresIn: '-1 day', subject: '1' });

            expect(async () => {
                await authService.validate(token, AuthToken);
            }).rejects.toThrow('token expired');
        });

        it('checks correct token types are given', () => {
            const wrongType = new RefreshToken();

            const token = jwtService.sign(wrongType.toPayload(), { subject: '1', expiresIn: '1 hour' });

            expect(async () => {
                await authService.validate(token, AuthToken);
            }).rejects.toThrow('invalid token type');
        });

        it('rejects subjectless tokens', () => {
            const token = jwtService.sign(validToken.toPayload(), { expiresIn: '1 hour' });

            expect(async () => {
                await authService.validate(token, AuthToken);
            }).rejects.toThrow('invalid token subject');
        });

        it('rejects expiryless tokens', () => {
            const token = jwtService.sign(validToken.toPayload(), { subject: '1' });

            expect(async () => {
                await authService.validate(token, AuthToken);
            }).rejects.toThrow("tokens aren't diamonds");
        });

        it('rejects old-style tokens', () => {
            const token =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                'eyJlbWFpbCI6ImN1cnRpc0Bwb3RlcmlzLmNvLnVrIiwidXNlcklkIjoiMTE5NjM3NjAxIiwic2Nob29sSWQiOm51bGwsInR5cGUiOiJURVNUVE9LRU4iLCJ1c2VyU3RhdHVzIjoiQUNUSVZFIiwiZmlyc3RuYW1lIjoiQ3VydGlzIiwicGhvbmVOdW1iZXIiOm51bGwsInJlc3RyaWN0U2l0ZURhdGEiOmZhbHNlLCJsYXN0bmFtZSI6IlBhcmZpdHQtRm9yZCIsImlzU2Nob29sTGVhZGVyIjpmYWxzZSwiaWF0IjoxNzE4NjE1OTI0LCJleHAiOjUwMTg2NTkxMjR9.' +
                'Hkuh-7EpNohKBaE64rRrG_UmW90LmvMJAcN292qgy2w';

            expect(async () => {
                await authService.validate(token, AuthToken);
            }).rejects.toThrow('Learning with Parents has been updated! Please refresh the page to continue.');
        });

        it('returns the JWT contents for valid auth JWTs', async () => {
            const token = jwtService.sign(validToken.toPayload(), { expiresIn: '1 day', subject: '1' });

            const validated = await authService.validate(token, AuthToken);

            expect(validated).toMatchObject(validToken);
            expect(validated.sub).toEqual('1');
        });

        it('returns the JWT contents for valid refresh JWTs', async () => {
            const token = jwtService.sign(new RefreshToken().toPayload(), { expiresIn: '1 day', subject: '1' });

            const validated = await authService.validate(token, RefreshToken);

            expect(validated).toMatchObject(RefreshToken.prototype);
            expect(validated.sub).toEqual('1');
        });
    });
});
