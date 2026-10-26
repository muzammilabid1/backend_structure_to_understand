import { BadRequestException, ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import newrelic from 'newrelic/index';
import { LwpBuildType } from 'src/api/dtos/LwpBuildType';
import { ImportedContact } from 'src/api/entities/imported_contact';
import { LogLwpLogin } from 'src/api/entities/log_login';
import { LwpUserInterstitial } from 'src/api/entities/lwp_user_interstitial';
import { LwpMagicLink } from 'src/api/entities/magic_link';
import { LwpPupilParent } from 'src/api/entities/pupil_parent';
import { LwpSchool } from 'src/api/entities/school';
import { LwpSchoolClass } from 'src/api/entities/school_class';
import { LwpUser } from 'src/api/entities/user';
import { LwpUserAssociatedLogin } from 'src/api/entities/user_associated_login';
import { HelperService } from 'src/api/service/helper.service';
import { LogLoginService } from 'src/api/service/log_login.service';
import { MagicLinkService } from 'src/api/service/magic_link.service';
import { NotificationService } from 'src/api/service/notification.service';
import { ParameterService } from 'src/api/service/parameter.service';
import { PupilParentService } from 'src/api/service/pupil_parent.service';
import { StaticLwpInterstitialService } from 'src/api/service/static_lwp_interstitial.service';
import { Brackets, type EntityManager, FindConditions, Repository, UpdateResult } from 'typeorm';
import { UAParser } from 'ua-parser-js';

import {
    AcceptUserInvitationInput,
    DeviceType,
    ErrorStatusCodeEnum,
    LastLoginOptions,
    LogResults,
    MagicLinkType,
    NotProductionIndicatorOutput,
    OperationStatus,
    RegisterUserEmailInput,
    ResetPasswordInput,
    UndoRejectConfirmationOutput,
    UserAssociatedLoginType,
    UserSignUpInput,
    // VerifyEmailAndPhoneByIdInput,
    VerifyUserEmailInput,
    VerifyUserPhoneInput
} from '../../api/model';
import { AuthenticationFailedError } from '../types/AuthenticationFailedError';
import { AuthMethod } from '../types/AuthMethod';
import { AuthToken } from '../types/AuthToken';
import { IdpJwtOutput } from '../types/IdpJwtOutput';
import { UserType } from '../types/UserType';
import { validateGoogleJwt } from './idps/google';
import { validateMicrosoftJwt } from './idps/microsoft';
import { ShallowUserService } from './shallowuser.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpUserAssociatedLogin)
        private userAssociatedLoginRepository: Repository<LwpUserAssociatedLogin>,
        @InjectRepository(LwpUserInterstitial)
        private userInterstitialRepository: Repository<LwpUserInterstitial>,
        @InjectRepository(LogLwpLogin)
        private logLoginRepository: Repository<LogLwpLogin>,
        @InjectRepository(LwpMagicLink)
        private magicLinkRepository: Repository<LwpMagicLink>,
        @InjectRepository(LwpPupilParent)
        private lwpPupilParentRepository: Repository<LwpPupilParent>,
        @InjectRepository(LwpSchoolClass)
        private lwpSchoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(LwpSchool)
        private lwpSchoolRepository: Repository<LwpSchool>,
        private helperService: HelperService,
        private logLoginService: LogLoginService,
        private notificationService: NotificationService,
        private magicLinkService: MagicLinkService,
        private pupilParentService: PupilParentService,
        private parameterService: ParameterService,
        private staticLwpInterstitialService: StaticLwpInterstitialService,
        private shallowUserService: ShallowUserService
    ) {}

    async findOne(emailOrPhone: string, emailOnly = false): Promise<LwpUser | undefined> {
        const matchers: FindConditions<LwpUser>[] = [{ email: emailOrPhone }];

        if (!emailOnly) matchers.push({ phoneNumber: this.helperService.formatPhoneNumber(emailOrPhone) });

        return this.userRepository.findOne({
            where: matchers,
            relations: ['school']
        });
    }

    async findById(id: string, relations?: string[], manager?: EntityManager): Promise<LwpUser | undefined> {
        return (manager?.getRepository(LwpUser) ?? this.userRepository).findOne({ where: { id: id }, relations });
    }

    async create(userInput: UserSignUpInput): Promise<LwpUser> {
        const { email, phoneNumber } = userInput;
        let invitedUser: LwpUser;
        let clashType: string;

        // signup user validation

        if (email) {
            invitedUser = await this.userRepository.findOne({ where: { email }, relations: ['school'] });
            if (invitedUser) {
                clashType = 'email';
            }
        }

        if (!invitedUser && phoneNumber) {
            invitedUser = await this.userRepository.findOne({
                where: [{ phoneNumber }, { phoneNumber: this.helperService.formatPhoneNumber(phoneNumber) }],
                relations: ['school']
            });
            if (invitedUser) {
                clashType = 'mobile';
            }
        }

        if (invitedUser) {
            if (
                !invitedUser.lastInvitationEmailSent ||
                this.helperService.getDiffInHoursFromNow(invitedUser.lastInvitationEmailSent) >= 1
            ) {
                const pupilId = await this.magicLinkService.getPupilIdFromMagicLink(invitedUser?.id);
                const magicLink = await this.magicLinkService.generateMagicLink({
                    userId: invitedUser?.id,
                    pupilTopicId: null,
                    pupilId,
                    trophyId: null,
                    topicId: null,
                    schoolId: null,
                    termId: null,
                    reportType: null,
                    type: MagicLinkType.INVITATION
                });
                const rejectMagicLink = await this.magicLinkService.generateMagicLink({
                    userId: invitedUser.id,
                    pupilTopicId: null,
                    pupilId,
                    trophyId: null,
                    topicId: null,
                    schoolId: null,
                    termId: null,
                    reportType: null,
                    type: MagicLinkType.REJECT_INVITATION
                });

                if ([UserType.PARENT, UserType.TOPICACCESS, UserType.MAGICPARENT].includes(invitedUser?.type)) {
                    await this.notificationService.userRequestedSignUpLink(
                        invitedUser,
                        magicLink?.url,
                        rejectMagicLink.url,
                        null,
                        false,
                        true
                    );
                } else if (invitedUser?.type === UserType.TEACHER) {
                    if (invitedUser.isSchoolLeader) {
                        await this.notificationService.schoolLeaderInvitationEmail(
                            invitedUser,
                            invitedUser?.school,
                            magicLink?.url,
                            rejectMagicLink?.url,
                            null,
                            true
                        );
                    } else {
                        await this.notificationService.teacherInvitationEmail(
                            invitedUser,
                            invitedUser?.school,
                            magicLink?.url,
                            rejectMagicLink?.url,
                            null,
                            true
                        );
                    }
                } else {
                    await this.notificationService.adminInvitationEmail(invitedUser, magicLink?.url, rejectMagicLink.url, true);
                }

                invitedUser.lastInvitationEmailSent = new Date();
                invitedUser.userStatus = invitedUser.userStatus === UserStatus.IMPORTED ? UserStatus.INVITED : invitedUser.userStatus;
                await this.userRepository.save(invitedUser);
            }

            if (
                invitedUser?.userStatus === UserStatus.INVITED ||
                invitedUser?.userStatus === UserStatus.IMPORTED ||
                invitedUser?.userStatus === UserStatus.ACCOUNTLESS
            ) {
                if (clashType === 'mobile') {
                    throw new HttpException(
                        `We’ve already sent an invitation to the mobile ${invitedUser?.phoneNumber}. Please check your mobile for the link you need to use to sign up.`,
                        ErrorStatusCodeEnum._538
                    );
                } else {
                    throw new HttpException(
                        `We’ve already sent an invitation to the email ${invitedUser.email}. Please check your email for the link you need to use to sign up.`,
                        ErrorStatusCodeEnum._537
                    );
                }
            } else if (clashType === 'mobile') {
                throw new HttpException(
                    `The mobile number ${invitedUser?.phoneNumber} is already registered. Please try logging in instead.`,
                    ErrorStatusCodeEnum._535
                );
            } else {
                throw new HttpException(
                    `The email address ${invitedUser.email} is already registered. Please try logging in instead.`,
                    ErrorStatusCodeEnum._535
                );
            }
        }

        const user: LwpUser = new LwpUser();

        // if user will not have email or phone number then we can not register the user
        if (!userInput.email && !userInput.phoneNumber) {
            throw new HttpException('Email or mobile number is required.', ErrorStatusCodeEnum._535);
        }

        if (userInput.email) {
            user.email = userInput.email;
            user.emailVerificationCode = this.helperService.generateId(4, '');
        }

        if (userInput.phoneNumber) {
            user.phoneNumber = this.helperService.formatPhoneNumber(userInput.phoneNumber);
            user.phoneVerificationCode = this.helperService.generateId(4, '');
        }

        user.microsoftAuth = userInput.microsoftAuth;
        user.password = userInput.microsoftAuth ? null : await bcrypt.hash(userInput.password, 10);
        user.firstname = userInput.firstname;
        user.lastname = userInput.lastname;
        user.isGoogleAccount = false;
        user.type = UserType.PARENT;
        user.userStatus = UserStatus.ACTIVE;

        // getting user by email for user validation
        const existingUser = await this.userRepository.findOne({ where: [{ email: userInput.email }, { phoneNumber: user.phoneNumber }] });

        // validating if this email is already registered and it is not invited then throw an Error
        if (
            existingUser?.email === userInput.email &&
            existingUser?.userStatus !== UserStatus.INVITED &&
            existingUser?.userStatus !== UserStatus.ACCOUNTLESS
        )
            throw new HttpException('Email already registered', ErrorStatusCodeEnum._535);

        // validating if this phone number is already registered and it is not invited then throw an Error
        if (
            existingUser?.phoneNumber === userInput.phoneNumber &&
            existingUser?.userStatus !== UserStatus.INVITED &&
            existingUser?.userStatus !== UserStatus.ACCOUNTLESS
        )
            throw new HttpException('Mobile number already registered', ErrorStatusCodeEnum._535);

        // If user exist but the status is invited.
        if (existingUser?.userStatus === UserStatus.INVITED || existingUser?.userStatus === UserStatus.ACCOUNTLESS)
            throw new HttpException(
                `We’ve sent an invitation to this email address or mobile number. Please check your messages for the link you need to use to sign up.`,
                ErrorStatusCodeEnum._535
            );

        return await this.userRepository.save(user);
    }

    // async verifyEmailAndPhoneById(input: VerifyEmailAndPhoneByIdInput): Promise<boolean> {
    //     const { id, verificationCode } = input;

    //     const user = await this.userRepository.findOne({ where: { id } });

    //     if (verificationCode === user?.emailVerificationCode) {
    //         user.isEmailVerified = true;
    //         user.emailVerificationCode = null;
    //         await this.userRepository.save(user);

    //         return true;
    //     }

    //     if (verificationCode === user?.phoneVerificationCode) {
    //         user.isPhoneVerified = true;
    //         user.phoneVerificationCode = null;
    //         await this.userRepository.save(user);

    //         return true;
    //     }

    //     return false;
    // }

    async verifyUserEmail(input: VerifyUserEmailInput): Promise<boolean> {
        const { email, emailVerificationCode } = input;
        const user = await this.userRepository.findOne({ where: { email } });

        if (user?.emailVerificationCode === emailVerificationCode) {
            user.isEmailVerified = true;
            user.emailVerificationCode = null;
            await this.userRepository.save(user);

            return true;
        }

        return false;
    }

    public async deleteUser(id: string, deletedBy: string | LwpUser): Promise<OperationStatus> {
        const user = await this.userRepository.findOne({ where: { id }, relations: ['pupils'] });
        let res: UpdateResult;

        if (user) {
            res = await this.userRepository.update(
                { id },
                {
                    email: null,
                    phoneNumber: null,
                    userStatus: UserStatus.DEACTIVATED,
                    deletedEmail: user?.email,
                    deletedPhoneNumber: user?.phoneNumber,
                    deletedUserStatus: user?.userStatus,
                    deletedBy: this.shallowUserService.newShallowUser(deletedBy)
                }
            );

            await this.userAssociatedLoginRepository.delete({ user });

            for (const pupilParent of user.pupils) {
                await this.pupilParentService.deletePupilParentRelation(pupilParent?.parentId, pupilParent?.pupilId, deletedBy);
            }
        }

        if (res?.affected > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async changeOptedOutStatus(id: string, optedOut: boolean): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) throw new HttpException('User not found', ErrorStatusCodeEnum._535);

        const userInterstitial = await this.staticLwpInterstitialService.getUserInterstitialForm(user?.id);

        await this.userInterstitialRepository.update({ id: userInterstitial?.id }, { optedOut });

        return true;
    }

    public async disconnectSocialAccount(userId: string, accountId: string): Promise<OperationStatus> {
        const userSocialAccount = await this.userAssociatedLoginRepository.findOne({ where: { accountId, user: { id: userId } } });
        let res = {};

        if (!userSocialAccount) throw new HttpException('Account not found', ErrorStatusCodeEnum._535);

        res = await this.userAssociatedLoginRepository.delete(userSocialAccount?.id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    /**
     * connectSocialAccount connects an account with an ID and email contained
     * in the {@link idpData} to the specified {@link user}, with the login type
     * {@link accountType}.
     *
     * @param {string | LwpUser} user the user to attach to
     * @param {UserAssociatedLoginType} accountType the type of account to attach
     * @param {IdpJwtOutput} idpData the data to attach from the IDP
     * @return {Promise<LwpUserAssociatedLogin>} a promise containing the UserAssociatedLogin created
     * @memberof UsersService
     */
    public async connectSocialAccount(
        user: string | LwpUser,
        accountType: UserAssociatedLoginType,
        idpData: IdpJwtOutput
    ): Promise<LwpUserAssociatedLogin> {
        const assocLogin = new LwpUserAssociatedLogin();

        assocLogin.user = this.shallowUserService.newShallowUser(user);
        assocLogin.accountType = accountType;
        assocLogin.accountId = idpData.id;
        assocLogin.email = idpData.email;
        assocLogin.firstname = idpData.firstName;
        assocLogin.lastname = idpData.lastName;

        return this.userAssociatedLoginRepository.save(assocLogin);
    }

    async verifyUserPhone(input: VerifyUserPhoneInput): Promise<boolean> {
        const { phoneNumber, phoneVerificationCode } = input;
        const user = await this.userRepository.findOne({ where: { phoneNumber } });

        if (user?.phoneVerificationCode === phoneVerificationCode) {
            user.isPhoneVerified = true;
            user.phoneVerificationCode = null;
            await this.userRepository.save(user);

            return true;
        }

        return false;
    }

    async createGoogle(type: string, email: string, firstname: string, lastname: string): Promise<LwpUser> {
        const user: LwpUser = new LwpUser();

        user.email = email;
        // user.type = type;
        user.firstname = firstname;
        user.lastname = lastname;
        user.isGoogleAccount = true;

        return await this.userRepository.save(user);
    }

    async getImportedContacts(userId: string): Promise<ImportedContact[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['importedContacts', 'importedContacts.importedStudentContacts']
        });

        if (user?.importedContacts) {
            return user?.importedContacts;
        }

        return null;
    }

    async getUserSocialAccounts(userId: string): Promise<LwpUserAssociatedLogin[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['socialAccounts']
        });

        if (user?.socialAccounts) {
            return user?.socialAccounts;
        }

        return null;
    }

    async getUserActivePupils(userId: string): Promise<LwpPupilParent[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['pupils']
        });

        return user?.pupils?.length > 0 ? user?.pupils.filter((pupilParent) => pupilParent?.status === PupilParentStatus.ACTIVE) : [];
    }

    async userHasPassword(userId: string): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        });

        if (user?.password) {
            return true;
        }

        return false;
    }

    async getSocialLoginPermissionsOfUser(user: LwpUser): Promise<Omit<Record<AuthMethod, boolean>, AuthMethod.MagicLink>> {
        if (user?.type === UserType.ADMIN) {
            const adminSocialLoginPermissions = await this.parameterService.getParameterByKey('ADMIN_SOCIAL_LOGIN_PERMISSIONS');
            const adminSocialLoginPermissionsParsed = JSON.parse(adminSocialLoginPermissions?.value);

            return {
                [AuthMethod.Password]: adminSocialLoginPermissionsParsed?.email === 'true',
                [AuthMethod.Google]: adminSocialLoginPermissionsParsed?.google === 'true',
                [AuthMethod.Microsoft]: adminSocialLoginPermissionsParsed?.microsoft === 'true'
            };
        }

        if (user?.type === UserType.PARENT) {
            const parentSocialLoginPermissions = await this.parameterService.getParameterByKey('PARENT_SOCIAL_LOGIN_PERMISSIONS');
            const parentSocialLoginPermissionsParsed = JSON.parse(parentSocialLoginPermissions?.value || '{}');

            return {
                [AuthMethod.Password]: true,
                [AuthMethod.Google]: parentSocialLoginPermissionsParsed?.google === 'true',
                [AuthMethod.Microsoft]: parentSocialLoginPermissionsParsed?.microsoft === 'true'
            };
        }

        if (user?.type === UserType.TEACHER) {
            // Lazy load the user's school if we don't have it already
            user.school ||= await this.lwpSchoolRepository
                .createQueryBuilder('ls')
                .innerJoin(LwpUser, 'lu', 'lu."schoolId" = ls.id')
                .where('lu.id = :id', { id: user.id })
                .getOne();

            if (user.school.socialLoginPermissions) {
                return {
                    [AuthMethod.Password]: user.school.socialLoginPermissions.email,
                    [AuthMethod.Google]: user.school.socialLoginPermissions.google,
                    [AuthMethod.Microsoft]: user.school.socialLoginPermissions.microsoft
                };
            }
        }

        return null;
    }

    async getlastLoginInfoOfUser(email?: string, phoneNumber?: string): Promise<LastLoginOptions> {
        const lastLogin = await this.logLoginRepository
            .createQueryBuilder('log')
            .where('log.result = :result', { result: LogResults.SUCCESS })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('log.userEmail = :email', { email }).orWhere('log.userPhoneNumber = :phoneNumber', { phoneNumber });
                })
            )
            .orderBy('log.logCreatedAt', 'DESC')
            .getOne();

        if (!lastLogin?.id) return null;

        const user = await this.userRepository.findOne({
            where: [{ email: lastLogin?.userEmail }, { phoneNumber: lastLogin?.userPhoneNumber }]
        });

        if (!user) return null;

        const parser = new UAParser();
        const result = parser.setUA(lastLogin?.userAgent).getResult();

        return {
            date: lastLogin?.logCreatedAt,
            browserName: `${result.browser.name} ${result.browser.version}`,
            osName: result.os.name,
            deviceType: result?.device?.type === 'mobile' || result?.device?.type === 'tablet' ? DeviceType.MOBILE : DeviceType.DESKTOP,
            userAgent: result?.ua,
            userType: lastLogin?.userType,
            loginType: lastLogin?.loginType
        };
    }

    getServerUptime(): NotProductionIndicatorOutput {
        const serverUpTimeInSeconds = Math.floor(process.uptime());
        let buildType;

        switch (process.env.LWP_ENV) {
            case LwpBuildType.DEV:
                buildType = LwpBuildType.DEV;
                break;

            case LwpBuildType.LOCAL:
                buildType = LwpBuildType.LOCAL;
                break;

            case LwpBuildType.PRODUCTION:
                buildType = LwpBuildType.PRODUCTION;
                break;

            case LwpBuildType.STAGE:
                buildType = LwpBuildType.STAGE;
                break;

            default:
                buildType = LwpBuildType.DEV;
                break;
        }

        return {
            buildType,
            serverUptime: this.helperService.secondsToDDHHMMSS(serverUpTimeInSeconds)
        };
    }

    async changeUserPassword(id: string, password: string, oldPassword?: string): Promise<LwpUser> {
        const user = await this.userRepository.findOne({ where: { id } });

        if (!user) throw new HttpException('User does not exist', ErrorStatusCodeEnum._535);

        if (user.password != null && !(await bcrypt.compare(oldPassword, user.password))) {
            throw new ForbiddenException("That doesn't look like the right current password.");
        }

        if (password === oldPassword) throw new BadRequestException('The old and new passwords should not be the same');

        user.password = await bcrypt.hash(password, 10);

        return await this.userRepository.save(user);
    }

    async forgotPassword(email: string, phoneNumber: string, userAgent: string, ipAddress: string): Promise<boolean> {
        const condition = email ? { email } : [{ phoneNumber }, { phoneNumber: this.helperService.formatPhoneNumber(phoneNumber) }];
        const user = await this.userRepository.findOne({ where: condition, relations: ['school'] });
        const browser = new UAParser(userAgent).getBrowser().name;

        if (!user || user?.userStatus === UserStatus.IMPORTED) throw new HttpException('User does not exist', ErrorStatusCodeEnum._535);

        // A teacher at an inactive school cannot sign in, so, as in preLogin, they are treated as unknown.
        if (user.type === UserType.TEACHER && user.school?.inactive)
            throw new HttpException('User does not exist', ErrorStatusCodeEnum._535);

        if (user?.userStatus === UserStatus.DEACTIVATED) {
            throw new HttpException('Account is deactivated. Password reset is not allowed.', ErrorStatusCodeEnum._535);
        }

        if (
            (user?.userStatus === UserStatus.INVITED || user?.userStatus === UserStatus.ACCOUNTLESS) &&
            (!user.lastInvitationEmailSent || this.helperService.getDiffInHoursFromNow(user.lastInvitationEmailSent) >= 1)
        ) {
            if (!user?.emailVerificationCode) {
                user.emailVerificationCode = this.helperService.generateId(4, '');
            }

            if (!user?.phoneVerificationCode) {
                user.phoneVerificationCode = this.helperService.generateId(4, '');
            }

            user.lastInvitationEmailSent = new Date();
            await this.userRepository.save(user);
            const pupilId = await this.magicLinkService.getPupilIdFromMagicLink(user?.id);
            const magicLink = await this.magicLinkService.generateMagicLink({
                userId: user?.id,
                pupilTopicId: null,
                pupilId,
                schoolId: null,
                termId: null,
                reportType: null,
                topicId: null,
                trophyId: null,
                type: MagicLinkType.INVITATION
            });
            const rejectMagicLink = await this.magicLinkService.generateMagicLink({
                userId: user.id,
                pupilTopicId: null,
                pupilId,
                schoolId: null,
                termId: null,
                reportType: null,
                trophyId: null,
                topicId: null,
                type: MagicLinkType.REJECT_INVITATION
            });

            if ([UserType.PARENT, UserType.TOPICACCESS, UserType.MAGICPARENT].includes(user?.type)) {
                await this.notificationService.userRequestedSignUpLink(user, magicLink?.url, rejectMagicLink.url, null, false, true);
            } else if (user?.type === UserType.TEACHER) {
                if (user.isSchoolLeader) {
                    await this.notificationService.schoolLeaderInvitationEmail(
                        user,
                        user?.school,
                        magicLink?.url,
                        rejectMagicLink?.url,
                        null,
                        true
                    );
                } else {
                    await this.notificationService.teacherInvitationEmail(
                        user,
                        user?.school,
                        magicLink?.url,
                        rejectMagicLink?.url,
                        null,
                        true
                    );
                }
            } else {
                await this.notificationService.adminInvitationEmail(user, magicLink?.url, rejectMagicLink.url, true);
            }
        }

        // if user want to login with email and he is invited
        if ((user?.userStatus === UserStatus.INVITED || user?.userStatus === UserStatus.ACCOUNTLESS) && user.email && email) {
            throw new HttpException(
                `We’ve already sent an invitation to the email ${user.email}. Please check your email for the link you need to use to sign up.`,
                ErrorStatusCodeEnum._537
            );
        }

        // if user want to login with phone number and he is invited
        if ((user?.userStatus === UserStatus.INVITED || user?.userStatus === UserStatus.ACCOUNTLESS) && user.phoneNumber) {
            throw new HttpException(
                `We’ve already sent an invitation to the mobile ${user.phoneNumber}. Please check your mobile for the link you need to use to sign up.`,
                ErrorStatusCodeEnum._538
            );
        }

        const magicLink = await this.magicLinkService.generateMagicLink({
            type: MagicLinkType.RESETPASSWORD,
            pupilTopicId: null,
            pupilId: null,
            topicId: null,
            reportType: null,
            schoolId: null,
            termId: null,
            trophyId: null,
            userId: user.id
        });

        await this.notificationService.sendResetPasswordEmail(user, magicLink.url, phoneNumber ? 'phone' : 'email', true, !!user?.password);

        await this.logLoginService.addLoginLog({
            browser,
            ipAddress,
            result: LogResults.FORGOTPASSWORD,
            userAgent: userAgent,
            userEmail: email ? email : null,
            userPhoneNumber: phoneNumber ? phoneNumber : null,
            userType: user.type,
            loginType: null
        });

        await this.userRepository.save(user);

        return true;
    }

    async resetPasswordByToken(input: ResetPasswordInput): Promise<LwpUser> {
        const { email, resetPassToken, password, phoneNumber } = input;
        const condition = email ? { email } : { phoneNumber };
        const user = await this.userRepository.findOne({ where: condition, select: ['id', 'userStatus'] });

        if (!user) throw new HttpException('Invalid email or token', ErrorStatusCodeEnum._535);

        if (user.userStatus === UserStatus.DEACTIVATED) {
            throw new HttpException('Account is deactivated. Password reset is not allowed.', ErrorStatusCodeEnum._535);
        }

        const magicLink = await this.magicLinkService.verifyMagicLink(resetPassToken, user);

        if (!magicLink) throw new HttpException('Invalid email or token', ErrorStatusCodeEnum._535);

        user.password = await bcrypt.hash(password, 10);
        user.userStatus = UserStatus.ACTIVE;
        user.badLoginAttempts = 0;
        user.unlockAccountTime = null;

        await this.userRepository.save(user);

        await this.magicLinkService.utilizedMagicLink(resetPassToken);

        return user;
    }

    async registerUserEmail(input: RegisterUserEmailInput): Promise<LwpUser> {
        const user = await this.magicLinkService.getUserFromMagicLink(input?.resetPassToken);

        if (!user) throw new HttpException('Invalid  token', ErrorStatusCodeEnum._535);
        user.email = input.email;

        const savedUser = await this.userRepository.save(user);

        await this.magicLinkService.utilizedMagicLink(input?.resetPassToken);

        return savedUser;
    }

    async IsUserDeactivated(id: string): Promise<boolean> {
        const isUserActive = await this.userRepository
            .createQueryBuilder('user')
            .where('user.id = :id', { id })
            .andWhere('user.userStatus = :userStatus', { userStatus: UserStatus.DEACTIVATED })
            .getCount();

        return isUserActive > 0;
    }

    async getDataByToken(token: string): Promise<LwpUser> {
        const user = await this.magicLinkService.getUserFromMagicLink(token);

        if (!user)
            throw new HttpException(
                'Could not find your information, this one-time link may have already been used',
                ErrorStatusCodeEnum.INVALID_MAGIC_LINK
            );

        return user;
    }

    async undoRejectInviteConfirmation(token: string): Promise<UndoRejectConfirmationOutput> {
        const magicLink = await this.magicLinkRepository.findOne({
            where: { url: token, type: MagicLinkType.REJECT_INVITATION },
            relations: ['user', 'user.pupils']
        });
        let userStatus: UserStatus = magicLink?.user?.userStatus;

        if (!magicLink?.url) throw new HttpException(`Invalid token`, ErrorStatusCodeEnum._535);

        if (!magicLink?.user?.id)
            throw new HttpException(
                'Could not find your information, this one-time link may have already been used',
                ErrorStatusCodeEnum._535
            );

        const pupilParent = magicLink?.user?.pupils?.find((pupilParent) => pupilParent?.pupilId === magicLink?.pupilId);

        if (pupilParent?.status === PupilParentStatus.ACTIVE)
            throw new HttpException(`You have already accepted invitation for this pupil`, ErrorStatusCodeEnum._535);

        if (pupilParent?.id) await this.lwpPupilParentRepository.update({ id: pupilParent?.id }, { status: PupilParentStatus.INVITED });

        if (magicLink?.user?.userStatus !== UserStatus.ACTIVE) {
            userStatus = magicLink?.user?.userStatus === UserStatus.ACCOUNTLESS ? UserStatus.ACCOUNTLESS : UserStatus.INVITED;
            await this.userRepository.update({ id: magicLink?.user?.id }, { userStatus });
        }

        await this.magicLinkRepository.update({ url: magicLink?.url }, { isUsed: false });

        return { userStatus, pupilParentId: pupilParent?.id ?? null };
    }

    async acceptUserInvitation(input: AcceptUserInvitationInput): Promise<LwpUser> {
        const {
            email,
            resetPassToken,
            password,
            firstname,
            lastname,
            phoneNumber,
            nameForChildren,
            verificationCode,
            socialLoginProvider,
            socialLoginJwt
        } = input;
        const verifiedUser = await this.magicLinkService.getUserFromMagicLink(resetPassToken, MagicLinkType.INVITATION);

        if (!verifiedUser) throw new HttpException('Error: Could not find user', ErrorStatusCodeEnum._535);
        const user = await this.userRepository.findOne({
            where: { id: verifiedUser?.id },
            relations: ['school', 'pupils', 'pupils.pupil']
        });

        if (!user) throw new HttpException('Error: Could not find user', ErrorStatusCodeEnum._535);
        const emailUser = email ? await this.userRepository.findOne({ where: { email } }) : null;
        const phoneUser = phoneNumber
            ? await this.userRepository.findOne({ where: { phoneNumber: this.helperService.formatPhoneNumber(phoneNumber) } })
            : null;

        if (emailUser && emailUser.id !== verifiedUser?.id)
            throw new HttpException(`This email address is in use by another user account`, ErrorStatusCodeEnum._535);
        if (phoneUser && phoneUser.id !== verifiedUser?.id)
            throw new HttpException(`This phone number is in use by another user account`, ErrorStatusCodeEnum._535);

        if (user.userStatus === UserStatus.REJECTED)
            throw new HttpException(`This user account has already been rejected`, ErrorStatusCodeEnum._535);

        if (user.userStatus !== UserStatus.INVITED && user.userStatus !== UserStatus.ACCOUNTLESS)
            throw new HttpException(`This user account has already been activated`, ErrorStatusCodeEnum._535);

        let socialAccountToConnect: false | IdpJwtOutput = false;

        if (socialLoginProvider && socialLoginJwt) {
            if (process.env.NODE_ENV === 'test') {
                socialAccountToConnect = {
                    id: user?.id,
                    email: email,
                    firstName: firstname,
                    lastName: lastname
                };
            } else {
                switch (socialLoginProvider) {
                    case UserAssociatedLoginType.GOOGLE:
                        socialAccountToConnect = await validateGoogleJwt(socialLoginJwt, user.school?.tenantDomain);
                        break;

                    case UserAssociatedLoginType.MICROSOFT:
                        socialAccountToConnect = await validateMicrosoftJwt(socialLoginJwt, user.school?.msTenantIssuer);
                }
            }

            if (!socialAccountToConnect)
                throw new AuthenticationFailedError(
                    "That account doesn't look valid for your school or setting. Please try a different one."
                );
        }

        user.firstname = firstname;
        user.lastname = lastname;
        user.email = email;
        user.phoneNumber = phoneNumber ? this.helperService.formatPhoneNumber(phoneNumber) : null;
        user.phoneVerificationCode = phoneNumber && (user.phoneVerificationCode ?? this.helperService.generateId(4, ''));
        user.emailVerificationCode = email && (user.emailVerificationCode ?? this.helperService.generateId(4, ''));
        user.nameForChildren = nameForChildren;
        user.password = password ? await bcrypt.hash(password, 10) : user?.password;
        user.userStatus = UserStatus.ACTIVE;
        if (verificationCode === user?.emailVerificationCode) {
            user.isEmailVerified = true;
            user.emailVerificationCode = null;
        }

        if (verificationCode === user?.phoneVerificationCode) {
            user.isPhoneVerified = true;
            user.phoneVerificationCode = null;
        }

        delete user['pupils'];

        if (socialAccountToConnect) {
            try {
                await this.connectSocialAccount(user, socialLoginProvider, socialAccountToConnect);
            } catch (err) {
                newrelic.noticeError(err, { caught: true, handled: false });
                throw new AuthenticationFailedError("Whoops! Looks like we couldn't link that social account. Please try a different one.");
            }
        }

        const savedUser = await this.userRepository.save(user);

        await this.magicLinkService.utilizedMagicLink(resetPassToken);

        if ([UserType.PARENT, UserType.TEACHER].includes(savedUser?.type)) {
            await this.staticLwpInterstitialService.assignReleasedInterstitials(savedUser?.id, savedUser?.type);
        }

        return savedUser;
    }

    /**
     * getAuthTokenForUser returns the contents of the user's auth token,
     * ready to be signed by the AuthService.
     *
     * @param {LwpUser} user the user to return auth details for
     * @return {Promise<LwpJwt>} a Promise for the auth token contents
     * @memberof UsersService
     */
    async getAuthTokenForUser(user: LwpUser, manager?: EntityManager): Promise<AuthToken> {
        // Hydrate the school if it isn't already hydrated
        const school =
            user.school ||
            (await (manager?.getRepository(LwpSchool) ?? this.lwpSchoolRepository)
                .createQueryBuilder('ls')
                // .schoolLeaders is, in fact, all teachers, not just school leaders
                .innerJoin('ls.schoolLeaders', 'lu')
                .where('lu.id = :id', { id: user.id })
                .getOne());

        return new AuthToken({
            firstName: user.firstname,
            lastName: user.lastname,
            userType: user.type,
            status: user.userStatus,
            adminRestrictions: user.adminRestrictions,
            pupilIds:
                user.type === UserType.PARENT
                    ? (
                          await (manager?.getRepository(LwpPupilParent) ?? this.lwpPupilParentRepository).find({ where: { parent: user } })
                      ).map((p) => p.pupilId)
                    : undefined,
            schoolId: user.type === UserType.TEACHER ? school.id : undefined,
            schoolName: user.type === UserType.TEACHER ? school.schoolName : undefined,
            classIds:
                user.type === UserType.TEACHER && !user.isSchoolLeader
                    ? (
                          await (manager?.getRepository(LwpSchoolClass) ?? this.lwpSchoolClassRepository)
                              .createQueryBuilder('schoolClass')
                              .leftJoin('schoolClass.teachers', 'teacher')
                              .leftJoin('schoolClass.parentClass', 'mainClass')
                              .leftJoin('mainClass.teachers', 'mainClassTeacher')
                              .where(`teacher.id = :id`, { id: user.id })
                              .orWhere(`mainClassTeacher.id = :id`, { id: user.id })
                              .select('schoolClass.id')
                              .distinctOn(['schoolClass.id'])
                              .getRawMany<{ schoolClass_id: string }>()
                      ).map((i) => i.schoolClass_id)
                    : undefined,
            isSchoolLeader: user.isSchoolLeader,
            email: user.email,
            phoneNumber: user.phoneNumber
        });
    }

    /**
     * Sends a user invitation email as part of the auth flow.
     *
     * @param {LwpUser} user the user to send to
     * @return {Promise<void>}
     * @memberof UsersService
     */
    async sendInvitationEmailForUser(user: LwpUser): Promise<void> {
        if (!user?.emailVerificationCode) {
            user.emailVerificationCode = this.helperService.generateId(4, '');
        }

        if (!user?.phoneVerificationCode) {
            user.phoneVerificationCode = this.helperService.generateId(4, '');
        }

        user.lastInvitationEmailSent = new Date();
        await this.userRepository.save(user);
        const pupilId = await this.magicLinkService.getPupilIdFromMagicLink(user?.id);
        const magicLink = await this.magicLinkService.generateMagicLink({
            userId: user?.id,
            pupilTopicId: null,
            pupilId,
            schoolId: null,
            reportType: null,
            termId: null,
            topicId: null,
            trophyId: null,
            type: MagicLinkType.INVITATION
        });
        const rejectMagicLink = await this.magicLinkService.generateMagicLink({
            userId: user.id,
            pupilTopicId: null,
            pupilId,
            schoolId: null,
            reportType: null,
            termId: null,
            topicId: null,
            trophyId: null,
            type: MagicLinkType.REJECT_INVITATION
        });

        if ([UserType.PARENT, UserType.TOPICACCESS, UserType.MAGICPARENT].includes(user?.type)) {
            await this.notificationService.userRequestedSignUpLink(user, magicLink?.url, rejectMagicLink.url, null, false, true);
        } else if (user?.type === UserType.TEACHER) {
            if (user.isSchoolLeader) {
                await this.notificationService.schoolLeaderInvitationEmail(
                    user,
                    user?.school,
                    magicLink?.url,
                    rejectMagicLink?.url,
                    null,
                    true
                );
            } else {
                await this.notificationService.teacherInvitationEmail(user, user?.school, magicLink?.url, rejectMagicLink?.url, null, true);
            }
        } else {
            await this.notificationService.adminInvitationEmail(user, magicLink?.url, rejectMagicLink.url, true);
        }
    }

    /**
     * findUserFromSocialLogin finds a user based on a given {@link accountId}
     * for a specific {@link accountType}.
     *
     * @param {UserAssociatedLoginType} accountType the type of account the ID corresponds to
     * @param {string} accountId the ID for that type of account
     * @return {Promise<LwpUser | undefined>} a promise for either a found user or undefined if none were found
     * @memberof UsersService
     */
    async findUserFromSocialLogin(accountType: UserAssociatedLoginType, accountId: string): Promise<LwpUser | undefined> {
        return (await this.userAssociatedLoginRepository.findOne({ where: { accountType, accountId }, relations: ['user'] }))?.user;
    }

    async getUsersByKey(key: string): Promise<LwpUser[]> {
        const users = await this.userRepository
            .createQueryBuilder('user')
            .select(['user.email', 'user.phoneNumber'])
            .where('user.email ILIKE :key OR user.phoneNumber ILIKE :key', {
                key: `%${key.includes('@') ? key : this.helperService.formatPhoneNumber(key)}%`
            })
            .limit(50)
            .getMany();

        return users;
    }

    /**
     * getAssociatedAuthMethodsForUser gets a list of AuthMethods that correspond
     * to UserAssociatedLogins a user has.
     *
     * @param {LwpUser} user the user
     * @return {Promise<AuthMethod[]>} the user's auth methods available
     * @memberof UsersService
     */
    async getAssociatedAuthMethodsForUser(user: LwpUser): Promise<AuthMethod[]> {
        return (
            await this.userAssociatedLoginRepository
                .createQueryBuilder('userAssociatedLogin')
                .leftJoin('userAssociatedLogin.user', 'user')
                .where('user.id = :userId', { userId: user.id })
                .select(['userAssociatedLogin.accountType'])
                .distinctOn(['userAssociatedLogin.accountType'])
                .getMany()
        )?.map((userAssociatedLogin: LwpUserAssociatedLogin) => userAssociatedLogin?.accountType.toLowerCase() as AuthMethod);
    }

    async refreshUserLastAccess(userId: string, manager?: EntityManager): Promise<void> {
        await (manager?.getRepository(LwpUser) ?? this.userRepository).update({ id: userId }, { lastAccess: new Date() });
    }
}
