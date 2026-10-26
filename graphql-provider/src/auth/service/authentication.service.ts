import crypto from 'node:crypto';

import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { GraphQLError } from 'graphql';
import { JwtPayload } from 'jsonwebtoken';
import { UserStatus } from 'lwp-shared';
import moment from 'moment';
import newrelic from 'newrelic/index';
import { LwpUser } from 'src/api/entities/user';
import { LwpUserSession } from 'src/api/entities/user_session';
import { ErrorStatusCodeEnum, LogLoginInput, LogResults, MagicLinkOutput, MagicLinkType, UserAssociatedLoginType } from 'src/api/model';
import { LogLoginService } from 'src/api/service/log_login.service';
import { MagicLinkService } from 'src/api/service/magic_link.service';
import { EntityManager, FindOneOptions, MoreThanOrEqual, Repository } from 'typeorm';
import { UAParser } from 'ua-parser-js';

import { AuthenticationFailedError } from '../types/AuthenticationFailedError';
import { AuthMethod } from '../types/AuthMethod';
import { IdpJwtOutput } from '../types/IdpJwtOutput';
import { JwtPayloadWithRequiredProps, LwpJwt, LwpJwtConstructor } from '../types/LwpJwt';
import { PreLoginResponse } from '../types/PreLoginResponse';
import { PreLoginStatus } from '../types/PreLoginStatus';
import { RefreshToken } from '../types/RefreshToken';
import { SessionLength } from '../types/SessionLength';
import { TokenPair } from '../types/TokenPair';
import { UserTrustLevel } from '../types/UserTrustLevel';
import { UserType } from '../types/UserType';
import { validateGoogleJwt } from './idps/google';
import { validateMicrosoftJwt } from './idps/microsoft';
import { UsersService } from './user.service';

export const STATUSES_ALLOWED_FOR_SIGN_IN = [UserStatus.ACTIVE, UserStatus.ACCOUNTLESS, UserStatus.INVITED];
export const MAGIC_LINKS_ALLOWED_FOR_SIGN_IN = [
    MagicLinkType.TOPICACCESS,
    MagicLinkType.READING,
    MagicLinkType.TROPHY,
    MagicLinkType.REJECT_INVITATION
];

@Injectable()
export class AuthenticationService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private magicLinkService: MagicLinkService,
        private logLoginService: LogLoginService,
        @InjectRepository(LwpUser) private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpUserSession)
        private sessionRepository: Repository<LwpUserSession>
    ) {}

    /**
     * preLogin is called prior to login to get an indication
     * of whether to proceed, and how.
     *
     * @param {string} emailOrPhone the identifier given by the user
     * @return {Promise<PreLoginResponse>} a response showing how to proceed
     * @memberof AuthService
     */
    async preLogin(emailOrPhone: string): Promise<PreLoginResponse> {
        const user = await this.usersService.findOne(emailOrPhone);

        if (!user) {
            return {
                emailOrPhone,
                status: PreLoginStatus.NoSuchUser
            };
        }

        if (user.type === UserType.TEACHER && user.school.inactive) {
            return {
                emailOrPhone,
                status: PreLoginStatus.NoSuchUser
            };
        }

        let status: PreLoginStatus;
        let extras: Partial<PreLoginResponse> = {};

        switch (user.userStatus) {
            case UserStatus.IMPORTED:
                return { emailOrPhone, status: PreLoginStatus.Imported };

            case UserStatus.ACCOUNTLESS:
            case UserStatus.INVITED:
                if (moment(user.lastInvitationEmailSent).isBefore(moment().subtract(1, 'hour'))) {
                    await this.usersService.sendInvitationEmailForUser(user);
                }

                status = PreLoginStatus.Invited;
                extras = { canSendEmail: !!user.email, canSendSms: !!user.phoneNumber };

            // falls through to give a "methods" response

            default:
                status ||= PreLoginStatus.OK;

                const associatedLoginTypesAttachedToUser = await this.usersService.getAssociatedAuthMethodsForUser(user);

                return {
                    emailOrPhone,
                    status,
                    methods: Object.entries(await this.usersService.getSocialLoginPermissionsOfUser(user))
                        .filter(
                            ([k, v]) =>
                                v === true && (k === AuthMethod.Password || associatedLoginTypesAttachedToUser.includes(k as AuthMethod))
                        )
                        .map(([k]) => k),
                    ...extras
                };
        }
    }

    /**
     * login attempts to log a user in when it's provided with a valid
     * {@link authToken} relevant to the {@link provider} it's called in
     * relation to.
     *
     * @param {string} emailOrPhone the user's email or phone to identify them
     * @param {string} authToken the token for authenticating them
     * @param {Exclude<AuthMethod, AuthMethod.MagicLink>} provider the means by which the token should be checked
     * @param {boolean} [remember] whether the user asked to be remembered or not - defaults to false
     * @param {string} [userAgent] the user's user agent string
     * @param {string} [ip] the user's IP address
     * @return {Promise<TokenPair>} access and refresh tokens for the user
     * @memberof AuthenticationService
     */
    async login(
        emailOrPhone: string,
        authToken: string,
        provider: Exclude<AuthMethod, AuthMethod.MagicLink>,
        remember = false,
        userAgent?: string,
        ip?: string
    ): Promise<TokenPair> {
        let user: LwpUser;

        return this.withLoginLogging(
            async () => {
                switch (provider) {
                    case AuthMethod.Password:
                        user = await this.usersService.findOne(emailOrPhone);

                        if (!user) throw new NotFoundException('No such user');

                        if (user.unlockAccountTime >= new Date()) throw new ForbiddenException('User account is locked');

                        if (!(await bcrypt.compare(authToken, user.password))) throw new UnauthorizedException('Invalid password');

                        break;

                    case AuthMethod.Microsoft:
                    case AuthMethod.Google:
                        let jwtOutput: false | IdpJwtOutput;
                        let loginType: UserAssociatedLoginType;

                        if (this.isTestTokenInTestEnv(authToken)) {
                            // only runs in NODE_ENV test and when authToken is `testing`
                            const user = await this.userRepository.findOne({ where: { email: emailOrPhone } });

                            loginType =
                                provider === AuthMethod.Microsoft ? UserAssociatedLoginType.MICROSOFT : UserAssociatedLoginType.GOOGLE;

                            jwtOutput = {
                                id: user?.id,
                                email: user?.email,
                                firstName: user?.firstname,
                                lastName: user?.lastname
                            };
                        } else {
                            if (provider === AuthMethod.Microsoft) {
                                jwtOutput = await validateMicrosoftJwt(authToken);
                                loginType = UserAssociatedLoginType.MICROSOFT;
                            } else {
                                jwtOutput = await validateGoogleJwt(authToken);
                                loginType = UserAssociatedLoginType.GOOGLE;
                            }
                        }

                        if (!jwtOutput) throw new GraphQLError('Invalid IDP token');

                        user = await this.usersService.findUserFromSocialLogin(loginType, jwtOutput.id);

                        if (user) break;

                        // check if we can link the user to any kind of existing user
                        // n.b. we no longer do this.
                        // if (jwtOutput.email) {
                        //     user = await this.usersService.findOne(jwtOutput.email, true);

                        //     if (user) {
                        //         this.usersService.connectSocialAccount(user, loginType, jwtOutput);
                        //         break;
                        //     }
                        // }

                        throw new GraphQLError("Couldn't match that login to a Learning with Parents user.");
                }

                let sessionLength: SessionLength;

                if (provider == AuthMethod.Microsoft) {
                    sessionLength = SessionLength.Instant;
                } else if (provider == AuthMethod.Google) {
                    sessionLength = SessionLength.Medium;
                } else if (remember) {
                    sessionLength = SessionLength.Long;
                } else {
                    sessionLength = SessionLength.Short;
                }

                const keyPair = await this.signInUser(user.id, sessionLength, provider, userAgent, ip);

                try {
                    await this.usersService.refreshUserLastAccess(user.id);
                } catch {
                    // If it fails, just continue
                }

                return {
                    user,
                    ...keyPair
                };
            },
            emailOrPhone,
            provider,
            userAgent,
            ip
        );
    }

    /**
     * validate validates a provided {@link token} and
     * returns its content.
     *
     * @template T the type of JWT to validate
     * @param {string} token the token to validate
     * @param {T} tokenClass a prototype for the type of JWT to validate
     * @return {(Promise<T & JwtPayloadWithRequiredProps>)} a promise for the JWT payload of the correct type
     * @memberof AuthenticationService
     */
    async validate<T extends LwpJwt>(token: string, tokenClass: LwpJwtConstructor<T>): Promise<T & JwtPayloadWithRequiredProps> {
        return await this.jwtService.verifyAsync(token, { clockTolerance: 30 }).then(
            (validToken: LwpJwt & JwtPayload) => {
                if (validToken?.tokenType !== tokenClass.tokenType) throw new ForbiddenException('invalid token type');

                if (!validToken.sub?.match(/^\d+$/)) throw new ForbiddenException('invalid token subject');

                // they're not forever
                // (this error should really never be seen by anyone!)
                if (!validToken?.exp) throw new ForbiddenException("tokens aren't diamonds");

                // TODO ought we check for far-future expiration here?

                return validToken as T & JwtPayloadWithRequiredProps;
            },
            (err) => {
                if (err?.name == 'TokenExpiredError') {
                    throw new UnauthorizedException('token expired');
                }

                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let decodedToken: string | { [key: string]: any };

                    if ((decodedToken = this.jwtService.decode(token)) && typeof decodedToken === 'object' && decodedToken['userId']) {
                        // proxy for an old-style legacy token
                        throw new HttpException(
                            'Learning with Parents has been updated! Please refresh the page to continue.',
                            ErrorStatusCodeEnum._535
                        );
                    }
                } catch (e) {
                    // keep errors we throw from within the try
                    if (e instanceof HttpException) throw e;

                    // ignore and just throw the standard "invalid token" error
                }

                throw new ForbiddenException('invalid token');
            }
        );
    }

    /**
     * refreshSession takes a user ID and a token ID, and finds a relevant
     * session to refresh. If it has one, it refreshes the session and returns
     * a new token pair.
     *
     * @param {number} userId the ID of the user
     * @param {string} jti the token ID of the refresh token for the session
     * @param {(session: LwpUserSession) => void} [sessionFilter=(): void => void 0] a callback
     *  to be run before refreshing the session but after finding it from the database
     * @param {SessionLength} [sessionLengthOverride] an override for the length of the session
     *  to refresh to
     * @throws {ForbiddenException} if the refresh session couldn't be found
     * @return {Promise<TokenPair>} a new access and refresh token
     * @memberof AuthenticationService
     */
    async refreshSession(
        userId: string,
        jti: string,
        sessionFilter: (session: LwpUserSession) => void = (): void => void 0,
        sessionLengthOverride?: SessionLength
    ): Promise<TokenPair> {
        return this.sessionRepository.manager.transaction(async (manager) => {
            newrelic.recordCustomEvent('refreshRequest', { token: jti, userId });

            try {
                const session = await this.getRefreshSession(userId, jti, manager);

                sessionFilter(session);

                const tokenPair = await this.signInUser(
                    userId,
                    sessionLengthOverride ?? session.sessionLength,
                    session.authMethod,
                    null,
                    null,
                    session.id,
                    null,
                    manager
                );

                try {
                    await this.usersService.refreshUserLastAccess(userId, manager);
                } catch {
                    // If it fails, just continue
                }

                return tokenPair;
            } catch (e) {
                if (e instanceof ForbiddenException) {
                    newrelic.recordCustomEvent('recentRefreshLookup', { token: jti, userId });

                    const recentRefresh = await manager.getRepository(LwpUserSession).findOne({
                        where: {
                            userId,
                            previousRefreshToken: jti,
                            logUpdatedAt: MoreThanOrEqual(new Date(Date.now() - 60_000))
                        },
                        lock: {
                            mode: 'for_no_key_update'
                        }
                    });

                    if (recentRefresh) {
                        newrelic.recordCustomEvent('recentRefreshSuccess', { token: jti, userId, newToken: recentRefresh.refreshToken });

                        return {
                            accessToken: await this.generateAccessToken(userId, recentRefresh.authMethod, undefined, manager),
                            refreshToken: await this.jwtService.signAsync(new RefreshToken().toPayload(), {
                                expiresIn:
                                    recentRefresh.sessionLength -
                                    Math.ceil((new Date().valueOf() - recentRefresh.logUpdatedAt.valueOf()) / 1000),
                                jwtid: recentRefresh.refreshToken,
                                subject: userId
                            })
                        };
                    }

                    newrelic.recordCustomEvent('recentRefreshFailure', { token: jti, userId });
                }

                newrelic.recordCustomEvent('refreshError', { token: jti, userId, error: e });

                throw e;
            }
        });
    }

    /**
     * upgradeSession converts a Short session into a Long session.
     *
     * @param {number} userId the user ID for the session
     * @param {string} jti the JWT token ID corresponding to the session
     * @return {Promise<TokenPair>} a new token pair for the session
     * @memberof AuthenticationService
     */
    async upgradeSession(userId: string, jti: string): Promise<TokenPair> {
        return this.refreshSession(
            userId,
            jti,
            (session) => {
                if (session.sessionLength !== SessionLength.Short)
                    throw new BadRequestException("you can't upgrade a session that isn't a short-lived session");
            },
            SessionLength.Long
        );
    }

    /**
     * redeemMagicLink takes a magic link ID and redeems it, returning the
     * type of magic link that was redeemed, and optionally authentication
     * tokens if appropriate for the type of link.
     *
     * @param {string} magicLinkID the magic link to redeem
     * @param {string} [userAgent] the user's user agent string
     * @param {string} [ip] the user's IP address
     * @param {boolean} [isPwa] if the user is using PWA
     * @return {Promise<MagicLinkOutput>} the magic link type and perhaps an auth token
     * @memberof AuthenticationService
     */
    async redeemMagicLink(magicLinkID: string, userAgent?: string, ip?: string, isPwa: boolean = false): Promise<MagicLinkOutput> {
        const magicLink = await this.magicLinkService.verifyMagicLink(magicLinkID);
        let tokens: TokenPair;

        if (MAGIC_LINKS_ALLOWED_FOR_SIGN_IN.includes(magicLink.type)) {
            tokens = await this.withLoginLogging(
                async () => {
                    return {
                        user: magicLink.user,
                        ...(await this.signInUser(
                            magicLink.user.id,
                            !isPwa ? SessionLength.Short : SessionLength.Long,
                            AuthMethod.MagicLink,
                            userAgent,
                            ip,
                            null
                        ))
                    };
                },
                magicLink.user.email ?? magicLink.user.phoneNumber,
                AuthMethod.MagicLink,
                userAgent,
                ip
            );
        }

        return {
            type: magicLink.type,
            tokens,
            pupilId: magicLink.pupilId,
            pupilTopicId: magicLink.context?.pupilTopicId
        };
    }

    /**
     * connectSocialAccount connects an IDP account to an LwP user account.
     *
     * @param {number} userId the ID of the user to connect to
     * @param {UserAssociatedLoginType} provider the provider to connect to
     * @param {string} idToken the ID token from the provider
     * @return {Promise<boolean>} true if successful, false otherwise
     * @memberof AuthenticationService
     */
    async connectSocialAccount(userId: string, provider: UserAssociatedLoginType, idToken: string): Promise<boolean> {
        let idpData: false | IdpJwtOutput;

        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['school'] });

        if (this.isTestTokenInTestEnv(idToken)) {
            // only runs in NODE_ENV test and when authToken is `testing`
            idpData = {
                id: user?.id,
                email: user?.email,
                firstName: user?.firstname,
                lastName: user?.lastname
            };
        } else {
            switch (provider) {
                case UserAssociatedLoginType.GOOGLE:
                    idpData = await validateGoogleJwt(idToken, user.school?.tenantDomain);
                    break;

                case UserAssociatedLoginType.MICROSOFT:
                    idpData = await validateMicrosoftJwt(idToken, user.school?.msTenantIssuer);
                    break;
            }
        }

        if (!idpData) return false;

        try {
            await this.usersService.connectSocialAccount(userId, provider, idpData);

            return true;
        } catch (err) {
            newrelic.noticeError(err, { caught: true, handled: false });

            return false;
        }
    }

    /**
     * logout deletes a session in the database, thereby
     * preventing reuse of the refresh JWT.
     *
     * @param {number} userId the user to log out
     * @param {string} jti the JTI of their refresh token
     * @memberof AuthenticationService
     */
    async logout(userId: string, jti: string): Promise<void> {
        const session = await this.getRefreshSession(userId, jti);

        await this.sessionRepository.delete(session);
    }

    /**
     * signInUser is the internal method that manages token issuance.
     * This is a DANGEROUS METHOD. It does not authenticate the user
     * it is asked to sign in, it only issues the token. This should
     * only be called where a user has successfully passed an auth
     * method, specified in the {@link AuthMethod} passed in.
     *
     * @param {string} userId the ID of the user to sign in
     * @param {SessionLength} sessionLength the length of the user's session to issue
     * @param {AuthMethod} authMethod the authentication method that was used
     * @param {string} [userAgent] a user agent, if one is available
     * @param {string} [ip] an IP address, if one is available
     * @param {string} [sessionId] the ID of a session to replace, if one is needed
     * @param {UserTrustLevel} [trustOverride] a user trust level to use instead of the default, if needed
     * @param {EntityManager} [manager] an entity manager, if one is needed for a transaction
     * @throws {AuthenticationFailedError} if the user is in an invalid status
     * @return {Promise<TokenPair>} an access and refresh token for the client
     * @memberof AuthenticationService
     */
    async signInUser(
        userId: string,
        sessionLength: SessionLength,
        authMethod: AuthMethod,
        userAgent?: string,
        ip?: string,
        sessionId?: string,
        trustOverride?: UserTrustLevel,
        manager?: EntityManager
    ): Promise<TokenPair> {
        const accessToken = await this.generateAccessToken(userId, authMethod, trustOverride, manager);

        let refreshJWT: string | undefined;
        let refreshToken: string;

        if (sessionLength !== SessionLength.Instant) {
            refreshToken = crypto.randomBytes(16).toString('hex');

            refreshJWT = await this.jwtService.signAsync(new RefreshToken().toPayload(), {
                expiresIn: sessionLength,
                jwtid: refreshToken,
                subject: userId
            });
        }

        const sessionRepo = manager?.getRepository(LwpUserSession) ?? this.sessionRepository;

        if (sessionId) {
            await sessionRepo.update(sessionId, {
                refreshToken,
                sessionLength,
                previousRefreshToken: () => '"refreshToken"'
            });
        } else {
            const session = new LwpUserSession();

            session.userId = userId;
            session.authMethod = authMethod;
            session.refreshToken = refreshToken;
            session.userAgent = userAgent;
            session.ip = ip;
            session.sessionLength = sessionLength;

            await sessionRepo.save(session);
        }

        newrelic.recordCustomEvent('issuedRefreshToken', { token: refreshToken, userId });

        return { accessToken, refreshToken: refreshJWT };
    }

    /**
     * getRefreshSession gets a user session from a refresh token ID
     * and a user ID.
     *
     * @private
     * @param {number} userId the ID of the user whose session we are fetching
     * @param {string} jti the refresh token ID
     * @param {EntityManager} manager the manager if in a transaction
     * @throws {ForbiddenException} if the refresh session is invalid or doesn't exist
     * @return {Promise<LwpUserSession>} the session
     * @memberof AuthenticationService
     */
    private async getRefreshSession(userId: string, jti: string, manager?: EntityManager): Promise<LwpUserSession> {
        const findProps: FindOneOptions<LwpUserSession> = {
            where: { userId, refreshToken: jti }
        };

        if (manager)
            findProps['lock'] = {
                mode: 'for_no_key_update'
            };

        try {
            const session = await (manager?.getRepository(LwpUserSession) ?? this.sessionRepository).findOne(findProps);

            if (!session) {
                throw new ForbiddenException('invalid refresh session');
            }

            return session;
        } catch (err) {
            newrelic.addCustomAttributes({
                refreshSession_userId: userId,
                refreshSession_jti: jti
            });

            throw err;
        }
    }

    /**
     * Generates an access token for a given user.
     *
     * @private
     * @param {string} userId the user ID to generate a token for
     * @param {AuthMethod} authMethod the auth method for the user
     * @param {UserTrustLevel} [trustOverride] a UserTrustLevel override, if one is needed
     * @return {string} A JWT access token for the user
     * @memberof AuthenticationService
     */
    private async generateAccessToken(
        userId: string,
        authMethod: AuthMethod,
        trustOverride?: UserTrustLevel,
        manager?: EntityManager
    ): Promise<string> {
        // school is loaded here in order to prepopulate the auth token.
        const user = await this.usersService.findById(userId, ['school'], manager);

        if (!user) throw new AuthenticationFailedError('Invalid user ID');

        if (!STATUSES_ALLOWED_FOR_SIGN_IN.includes(user.userStatus) || (user.type === UserType.TEACHER && user.school.inactive))
            throw new AuthenticationFailedError("Looks like you aren't permitted to sign in right now. Please contact support.");

        const jwtContents = await this.usersService.getAuthTokenForUser(user, manager);

        const trustLevel = trustOverride ?? (authMethod === AuthMethod.MagicLink ? UserTrustLevel.Limited : UserTrustLevel.Full);

        return await this.jwtService.signAsync(jwtContents.trustAs(trustLevel).toPayload(), {
            expiresIn: '5 minutes',
            subject: user.id.toString()
        });
    }

    /**
     * withLoginLogging runs a callback that might result in a login, and logs the results.
     *
     * @private
     * @param {() => Promise<TokenPair & { user?: LwpUser }>} cb the login attempt code
     * @param {string} emailOrPhone the email address or phone number used for auth
     * @param {AuthMethod} authMethod the auth method being used
     * @param {string} [userAgent] the user agent of the user
     * @param {string} [ipAddr] the IP address of the user
     * @return {Promise<TokenPair>} the callback result being passed through
     * @memberof AuthenticationService
     */
    private async withLoginLogging(
        cb: () => Promise<TokenPair & { user?: LwpUser }>,
        emailOrPhone: string,
        authMethod: AuthMethod,
        userAgent?: string,
        ipAddr?: string
    ): Promise<TokenPair> {
        const rateLimitCount = await this.logLoginService.countFailedLogins(emailOrPhone);

        if (rateLimitCount >= 5) {
            const nextLoginAllowed = await this.logLoginService.nextLoginAllowedAt(emailOrPhone);
            const timeToNextLogin = new Intl.RelativeTimeFormat('en-GB', {
                style: 'long'
            }).format(Math.ceil((nextLoginAllowed.valueOf() - Date.now()) / 60_000), 'minutes');

            newrelic.addCustomAttribute('excludeFromErrorGroup', timeToNextLogin);

            throw new ForbiddenException(`Your account is temporarily locked. Please try again ${timeToNextLogin}.`);
        }

        const logLoginInput = new LogLoginInput();

        logLoginInput.userAgent = userAgent;
        logLoginInput.browser = userAgent ? new UAParser(userAgent)?.getBrowser()?.name : null;
        logLoginInput.ipAddress = ipAddr;
        logLoginInput.loginType = authMethod;

        if (emailOrPhone.includes('@')) {
            logLoginInput.userEmail = emailOrPhone;
        } else {
            logLoginInput.userPhoneNumber = emailOrPhone;
        }

        try {
            const tokens = await cb();

            logLoginInput.result = LogResults.SUCCESS;

            if (tokens.user) {
                logLoginInput.userType = tokens.user.type;
            }

            return tokens;
        } catch (e) {
            switch (e.constructor) {
                case NotFoundException:
                    logLoginInput.result = LogResults.USERNOTFOUND;
                    break;

                case UnauthorizedException:
                    logLoginInput.result = LogResults.WRONGPASSWORD;
                    break;

                default:
                    logLoginInput.result = LogResults.ERROR;
            }

            throw e;
        } finally {
            await this.logLoginService.addLoginLog(logLoginInput);
        }
    }

    /**
     * isTestTokenInTestEnv validates that the NODE_ENV
     * is test, and that the token passed in is a test
     * token.
     *
     * @private
     * @param {string} token the token to use
     * @return {boolean} true if this is a test token in a test env; false otherwise
     * @memberof AuthenticationService
     */
    private isTestTokenInTestEnv(token: string): boolean {
        return process.env.NODE_ENV === 'test' && token === 'testing';
    }
}
