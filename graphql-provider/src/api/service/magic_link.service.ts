import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import moment from 'moment';
import { nanoid } from 'nanoid';
import { UserType } from 'src/auth/types/UserType';
import { Brackets, EntityManager, FindConditions, MoreThan, Repository } from 'typeorm';

import { LwpMagicLink } from '../entities/magic_link';
import { StaticLwpParameter } from '../entities/parameter';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpUser } from '../entities/user';
import {
    DefaultParameters,
    ErrorStatusCodeEnum,
    MagicLinkInput,
    MagicLinkType,
    RejectMagicLinkOutput,
    UndoRejectConfirmationOutput
} from '../model';
import { NotificationService } from './notification.service';

@Injectable()
export class MagicLinkService {
    constructor(
        @InjectRepository(LwpMagicLink)
        private magicLinkRepository: Repository<LwpMagicLink>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpPupilTrophy)
        private pupilTrophyRepository: Repository<LwpPupilTrophy>,
        @InjectRepository(LwpPupilParent)
        private lwpPupilParentRepository: Repository<LwpPupilParent>,
        @InjectRepository(StaticLwpParameter)
        private parameterRepository: Repository<StaticLwpParameter>,
        private notificationService: NotificationService
    ) {}

    public async generateMagicLink(input: MagicLinkInput, manager?: EntityManager): Promise<LwpMagicLink> {
        const {
            userId,
            type,
            pupilTopicId,
            pupilId,
            trophyId,
            topicId,
            schoolId = null,
            termId = null,
            reportType = null,
            expiryTime = null
        } = input;
        const userRepository: Repository<LwpUser> = manager ? manager.getRepository(LwpUser) : this.userRepository;
        const magicLinkRepository: Repository<LwpMagicLink> = manager ? manager.getRepository(LwpMagicLink) : this.magicLinkRepository;

        const defaultExpiryTime = await this.getDefaultExpiryTime(type, manager);
        const magicLink = new LwpMagicLink();

        magicLink.url = nanoid();
        magicLink.type = type;
        magicLink.lastRegeneratedAt = new Date();

        if (userId) {
            magicLink.user = await userRepository.findOne({ where: { id: userId } });
        }

        magicLink.expiryTime = this.resolveExpiryTime(type, expiryTime, defaultExpiryTime);
        magicLink.pupilId = pupilId;
        magicLink.context = { trophyId, pupilTopicId, topicId, schoolId, termId, reportType, periodIndex: null };

        return await magicLinkRepository.save(magicLink);
    }

    /**
     * getDefaultExpiryTime returns the expiry a magic link of {@link type} would be
     * given right now, based on the MAGIC_LINK_TIMEOUT parameter.
     *
     * @param {MagicLinkType} type the type of magic link
     * @param {EntityManager} manager an optional transaction manager
     * @return {Promise<Date>} the expiry
     * @memberof MagicLinkService
     */
    public async getDefaultExpiryTime(type: MagicLinkType, manager?: EntityManager): Promise<Date> {
        const magicLinkTimeout = await this.getMagicLinkTimeout(type, manager);

        return new Date(moment().add(magicLinkTimeout, 'hours').toString());
    }

    /**
     * resolveExpiryTime decides which expiry a new magic link is saved with.
     *
     * An admin generating a demo topic link chooses when it expires, so that a link
     * printed on promotional material can outlive the usual 90 days, and a link shared
     * for a one-off demonstration can die the same day. MAGIC_LINK_TIMEOUT still supplies
     * the expiry whenever no choice is made. Demo topic links are the only type a caller
     * may set an expiry for, and it may not already be in the past.
     *
     * @param {MagicLinkType} type the type of magic link being generated
     * @param {Date} requestedExpiryTime the expiry the caller asked for, if any
     * @param {Date} defaultExpiryTime the expiry MAGIC_LINK_TIMEOUT gives this type
     * @return {Date} the expiry to save
     * @memberof MagicLinkService
     */
    private resolveExpiryTime(type: MagicLinkType, requestedExpiryTime: Date, defaultExpiryTime: Date): Date {
        if (!requestedExpiryTime) return defaultExpiryTime;

        if (type !== MagicLinkType.DEMOTOPIC)
            throw new HttpException('An expiry time can only be set for demo topic links', ErrorStatusCodeEnum._535);

        if (moment(requestedExpiryTime).isBefore(moment()))
            throw new HttpException('An expiry time cannot be in the past', ErrorStatusCodeEnum._535);

        return requestedExpiryTime;
    }

    public async getMagicLinkTimeout(type: MagicLinkType, manager?: EntityManager): Promise<string> {
        const parameterRepository: Repository<StaticLwpParameter> = manager
            ? manager.getRepository(StaticLwpParameter)
            : this.parameterRepository;

        try {
            const magicLinkTimeoutParameter = await parameterRepository.findOne({
                where: { key: 'MAGIC_LINK_TIMEOUT' },
                select: ['value']
            });

            const magicLinkTimeoutParameterValue = JSON.parse(magicLinkTimeoutParameter?.value || DefaultParameters.MAGIC_LINK_TIMEOUT);

            return magicLinkTimeoutParameterValue?.[type] || JSON.parse(DefaultParameters.MAGIC_LINK_TIMEOUT)[type];
        } catch (e) {
            throw new HttpException(e?.message, ErrorStatusCodeEnum.INTERNAL_SERVER_ERROR);
        }
    }

    public async reGenerateMagicLink(token: string): Promise<LwpMagicLink> {
        // STEP 1: getting old magic link
        const magicLink = await this.magicLinkRepository.findOne({
            relations: ['user', 'user.school'],
            where: {
                url: token
            }
        });

        if (!magicLink) throw new HttpException('Invalid token', ErrorStatusCodeEnum.INVALID_MAGIC_LINK);

        // A teacher at an inactive school cannot sign in, so a fresh link would be no use to them.
        if (magicLink.user?.type === UserType.TEACHER && magicLink.user?.school?.inactive)
            throw new HttpException('Invalid token', ErrorStatusCodeEnum.INVALID_MAGIC_LINK);

        // STEP 2:  regenerating magic link
        const savedMagicLink = await this.generateMagicLink({
            userId: magicLink.user?.id,
            pupilTopicId: magicLink?.context?.pupilTopicId,
            pupilId: magicLink.pupilId,
            topicId: magicLink?.context?.topicId,
            trophyId: magicLink?.context?.trophyId,
            termId: null,
            schoolId: null,
            reportType: null,
            type: magicLink.type !== MagicLinkType.REJECT_INVITATION ? magicLink.type : MagicLinkType.INVITATION
        });

        // STEP 3: updating last regenerated time in expired token
        await this.magicLinkRepository.update({ url: magicLink.url }, { lastRegeneratedAt: new Date() });

        // INVITATION REJECT LINK HANDLING
        let rejectMagicLink = new LwpMagicLink();

        if (magicLink.type === MagicLinkType.INVITATION || magicLink.type === MagicLinkType.REJECT_INVITATION) {
            rejectMagicLink = await this.generateMagicLink({
                userId: magicLink.user?.id,
                pupilTopicId: magicLink?.context?.pupilTopicId,
                pupilId: magicLink.pupilId,
                topicId: magicLink?.context?.topicId,
                trophyId: magicLink?.context?.trophyId,
                termId: null,
                schoolId: null,
                reportType: null,
                type: MagicLinkType.REJECT_INVITATION
            });
        }

        // STEP 4: sending email
        await this.sendEmailAfterRegenerateMagicLink(savedMagicLink, rejectMagicLink, magicLink.url);

        return savedMagicLink;
    }

    public async verifyMagicLink(token: string, user?: LwpUser): Promise<LwpMagicLink> {
        const condition = user?.id ? { url: token, user: { id: user?.id } } : { url: token };
        const magicLink = await this.magicLinkRepository.findOne({
            where: condition,
            relations: ['user']
        });

        if (!magicLink) throw new HttpException(`Invalid ${user?.id ? 'email or' : ''} token`, ErrorStatusCodeEnum.INVALID_MAGIC_LINK);
        if (magicLink?.isUsed)
            throw new HttpException(
                'Could not find your information, this one-time link may have already been used',
                ErrorStatusCodeEnum.INVALID_MAGIC_LINK
            );

        const isValid = moment().isBefore(magicLink.expiryTime);

        if (!isValid)
            throw new HttpException(
                {
                    message: 'token expired',
                    token,
                    magicLinkType: magicLink?.type,
                    schoolId: magicLink?.type === MagicLinkType.SCHOOL_IMPACT_REPORT ? magicLink?.context?.schoolId : null
                },
                ErrorStatusCodeEnum.EXPIRED_MAGIC_LINK
            );

        return magicLink;
    }

    public async getUserFromMagicLink(token: string, type?: FindConditions<LwpMagicLink>['type']): Promise<LwpUser> {
        const findConditions: FindConditions<LwpMagicLink> = {
            url: token
        };

        if (type) findConditions['type'] = type;

        const magicLink = await this.magicLinkRepository.findOne({
            relations: ['user'],
            where: findConditions
        });

        if (!magicLink) throw new HttpException('Invalid token', ErrorStatusCodeEnum.INVALID_MAGIC_LINK);

        await this.verifyMagicLink(token, magicLink.user);

        return magicLink.user;
    }

    public async getPupilTopicFromMagicLink(token: string): Promise<LwpPupilTopic> {
        const magicLink = await this.magicLinkRepository.findOne({
            relations: ['user'],
            where: {
                url: token
            }
        });

        if (!magicLink) throw new HttpException('Invalid token', ErrorStatusCodeEnum.INVALID_MAGIC_LINK);

        await this.verifyMagicLink(token, magicLink?.user);

        return this.pupilTopicRepository.findOne({ where: { id: magicLink.context?.pupilTopicId } });
    }

    public async getActiveMagicLink(type: MagicLinkType, userId: string, pupilTopicId?: string, pupilId?: string): Promise<LwpMagicLink> {
        let magicLink: LwpMagicLink = await this.magicLinkRepository.findOne({
            where: { type, user: { id: userId }, isUsed: false, expiryTime: MoreThan(new Date()) },
            relations: ['user'],
            order: { logCreatedAt: 'DESC' }
        });

        if (pupilTopicId) {
            magicLink = await this.magicLinkRepository
                .createQueryBuilder('magicLink')
                .leftJoinAndSelect('magicLink.user', 'user')
                .where('magicLink.context ::jsonb @> :context', {
                    context: {
                        pupilTopicId
                    }
                })
                .orderBy('magicLink.logCreatedAt', 'DESC')
                .limit(1)
                .getOne();
        }

        if (!magicLink || !moment().isBefore(magicLink?.expiryTime)) {
            magicLink = await this.generateMagicLink({
                userId,
                type,
                topicId: null,
                termId: null,
                schoolId: null,
                reportType: null,
                pupilTopicId,
                trophyId: magicLink?.context?.trophyId,
                pupilId
            });
        }

        await this.verifyMagicLink(magicLink.url, magicLink?.user);

        return magicLink;
    }

    public async utilizedMagicLink(token: string): Promise<boolean> {
        const result = await this.magicLinkRepository
            .createQueryBuilder()
            .update({
                isUsed: true
            })
            .where({
                url: token
            })
            .returning('*')
            .execute();

        return result.affected ? true : false;
    }

    async sendEmailAfterRegenerateMagicLink(
        magic_link: LwpMagicLink,
        reject_magic_link?: LwpMagicLink,
        expiredMagicToken?: string
    ): Promise<boolean> {
        const { url: token, pupilId, user, type, context } = magic_link;
        const { pupilTopicId, trophyId } = context;

        switch (type) {
            case MagicLinkType.RESETPASSWORD:
                await this.notificationService.sendResetPasswordEmail(user, token, null, true);
                break;

            case MagicLinkType.INVITATION:

            // eslint-disable-next-line no-fallthrough
            case MagicLinkType.REJECT_INVITATION:
                if (user?.type === UserType.PARENT) {
                    await this.notificationService.userRequestedSignUpLink(user, token, reject_magic_link.url, null, false, true);
                }

                if (user?.type === UserType.TEACHER) {
                    if (user?.isSchoolLeader) {
                        await this.notificationService.schoolLeaderInvitationEmail(
                            user,
                            user?.school,
                            token,
                            reject_magic_link.url,
                            null,
                            true
                        );
                    } else {
                        await this.notificationService.teacherInvitationEmail(user, user?.school, token, reject_magic_link.url, null, true);
                    }
                }

                if (user?.type === UserType.ADMIN)
                    await this.notificationService.adminInvitationEmail(user, token, reject_magic_link.url, true);

                break;

            case MagicLinkType.TROPHY:
                const pupil = await this.pupilRepository.findOne({ where: { id: pupilId }, relations: ['school'] });
                const pupilTrophy = await this.pupilTrophyRepository.findOne({ where: { id: trophyId }, relations: ['trophy'] });

                await this.notificationService.sendTrophyMailToParent(
                    user,
                    pupil,
                    'Congratulations',
                    pupilTrophy?.trophy.title,
                    token,
                    true
                );
                break;

            case MagicLinkType.TOPICACCESS:
            case MagicLinkType.READING:
                const pupilTopic = await this.pupilTopicRepository.findOne({
                    where: { id: pupilTopicId },
                    relations: [
                        'classTopic',
                        'pupil',
                        'pupil.parents',
                        'pupil.parents.parent',
                        'classTopic.class',
                        'classTopic.topic',
                        'classTopic.class.school'
                    ]
                });

                const pupil_parent: LwpPupilParent = pupilTopic?.pupil?.parents?.find(
                    (pupilParent) => pupilParent?.parent?.id === user?.id
                );

                let rejectMagicLinkTokenForReading: string = null;

                if (user?.userStatus === UserStatus.INVITED) {
                    const rejectMagicLink = await this.generateMagicLink({
                        userId: user.id,
                        pupilTopicId: null,
                        pupilId: pupilTopic?.pupil?.id,
                        topicId: null,
                        trophyId: null,
                        schoolId: null,
                        termId: null,
                        reportType: null,
                        type: MagicLinkType.REJECT_INVITATION
                    });

                    rejectMagicLinkTokenForReading = rejectMagicLink?.url;
                }

                await this.notificationService.sendUpdatedMagicLink(
                    pupilTopic?.classTopic,
                    user,
                    pupilTopic.pupil,
                    pupil_parent,
                    pupilTopic,
                    token,
                    rejectMagicLinkTokenForReading,
                    expiredMagicToken,
                    true
                );
                break;
        }

        return true;
    }

    public async getMagicLink(token: string): Promise<LwpMagicLink> {
        const magic_link = await this.magicLinkRepository.findOne({ where: { url: token }, relations: ['user'] });

        if (!magic_link) {
            throw new HttpException(
                'Could not find your information, this one-time link may have already been used',
                ErrorStatusCodeEnum.INVALID_MAGIC_LINK
            );
        }

        // If user's account is DeActivated or Rejected, then user cannot login.
        if (
            (magic_link?.user?.id && magic_link?.user?.userStatus === UserStatus.DEACTIVATED) ||
            magic_link?.user?.userStatus === UserStatus.REJECTED
        ) {
            throw new HttpException(
                `The account you have tried to log in with has been deactivated. If you believe this to be a mistake, please contact your school or setting, or email hello@learningwithparents.com`,
                ErrorStatusCodeEnum._535
            );
        }

        return magic_link;
    }

    public async getRejectMagicLink(token: string): Promise<RejectMagicLinkOutput> {
        const magicLink = await this.magicLinkRepository.findOne({ where: { url: token, type: MagicLinkType.REJECT_INVITATION } });

        if (!magicLink) {
            throw new HttpException(
                'Could not find your information, this one-time link may have already been used',
                ErrorStatusCodeEnum.INVALID_MAGIC_LINK
            );
        }

        if (magicLink?.pupilId) {
            const pupil = await this.pupilRepository.findOne({ where: { id: magicLink?.pupilId } });

            if (pupil?.id) {
                return { pupilName: `${pupil.firstname} ${pupil.lastname}` };
            }
        }

        return { pupilName: null };
    }

    async getActiveMagicLinkForUser(user: LwpUser): Promise<LwpMagicLink> {
        if (user.userStatus === UserStatus.INVITED || user.userStatus === UserStatus.ACCOUNTLESS) {
            const magicLink = await this.magicLinkRepository.findOne({
                where: {
                    user: { id: user?.id },
                    isUsed: false,
                    type: MagicLinkType.INVITATION,
                    expiryTime: MoreThan(new Date())
                },
                order: {
                    logCreatedAt: 'DESC'
                }
            });

            return magicLink;
        }

        return null;
    }

    async getPupilIdFromMagicLink(userId: string): Promise<string> {
        const magicLink = await this.magicLinkRepository
            .createQueryBuilder('magicLink')
            .leftJoinAndSelect('magicLink.user', 'user')
            .leftJoinAndSelect('user.pupils', 'pupilParent')
            .leftJoinAndSelect('pupilParent.pupil', 'pupil')
            .where('user.id = :userId', { userId })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('user.type = :userType', { userType: UserType.PARENT })
                        .orWhere('user.type = :userType1', {
                            userType1: UserType.TOPICACCESS
                        })
                        .orWhere('user.type = :userType2', { userType2: UserType.MAGICPARENT });
                })
            )
            .andWhere(
                new Brackets((qb) => {
                    qb.where('pupilParent.status = :pupilParentStatus', { pupilParentStatus: PupilParentStatus.INVITED }).orWhere(
                        'pupilParent.status = :pupilParentStatus1',
                        { pupilParentStatus1: PupilParentStatus.IMPORTED }
                    );
                })
            )
            .orderBy('magicLink.logCreatedAt', 'DESC')
            .getOne();

        return magicLink?.pupilId ?? magicLink?.user?.pupils?.[0]?.pupil?.id;
    }

    async getActiveMagicLinkFromUserEmail(email: string): Promise<string> {
        const magicLink = await this.magicLinkRepository
            .createQueryBuilder('magicLink')
            .leftJoinAndSelect('magicLink.user', 'user')
            .where('user.email = :email', { email })
            .orderBy('magicLink.logCreatedAt', 'DESC')
            .limit(1)
            .getOne();

        return magicLink?.url ? magicLink?.url : null;
    }

    async getPupilOfMagicLink(pupilId: string): Promise<LwpPupil> {
        if (pupilId) return await this.pupilRepository.findOne({ where: { id: pupilId } });

        return null;
    }

    async expireMagicLinkByToken(token: string): Promise<string> {
        const magicLink = await this.magicLinkRepository.findOne({
            where: { url: token },
            select: ['url', 'expiryTime']
        });

        if (!magicLink) return null;

        magicLink.expiryTime = new Date(moment().subtract(20, 'days').toString());

        const savedMagicLink = await this.magicLinkRepository.save(magicLink);

        return savedMagicLink?.url;
    }

    async rejectInviteConfirmation(token: string): Promise<boolean> {
        const magicLink = await this.magicLinkRepository.findOne({
            where: { url: token, type: MagicLinkType.REJECT_INVITATION },
            relations: ['user', 'user.pupils']
        });

        if (!magicLink?.url) throw new HttpException(`Invalid token`, ErrorStatusCodeEnum._535);

        if (!magicLink?.user?.id)
            throw new HttpException(
                'Could not find your information, this one-time link may have already been used',
                ErrorStatusCodeEnum._535
            );

        // If user's account is DeActivated or Rejected, then user cannot login.
        if (magicLink?.user?.userStatus === UserStatus.DEACTIVATED || magicLink?.user?.userStatus === UserStatus.REJECTED) {
            throw new HttpException(
                `The account you have tried to log in with has been deactivated. If you believe this to be a mistake, please contact your school or setting, or email hello@learningwithparents.com`,
                ErrorStatusCodeEnum._535
            );
        }

        const pupilParent = magicLink?.user?.pupils?.find((pupilParent) => +pupilParent?.pupilId === +magicLink?.pupilId);

        if (pupilParent?.status === PupilParentStatus.ACTIVE)
            throw new HttpException(`You have already accepted invitation for this pupil`, ErrorStatusCodeEnum._535);

        if (pupilParent?.id) await this.lwpPupilParentRepository.update({ id: pupilParent?.id }, { status: PupilParentStatus.REJECTED });

        const otherPupilParentRecords = magicLink?.user?.pupils?.filter((pupilParent) => +pupilParent?.pupilId !== +magicLink?.pupilId);
        const userStatus = magicLink?.user?.userStatus;

        if (
            userStatus !== UserStatus.ACTIVE &&
            (otherPupilParentRecords?.length === 0 ||
                otherPupilParentRecords?.every((pupilParent) => pupilParent?.status === PupilParentStatus.REJECTED))
        ) {
            await this.userRepository.update({ id: magicLink?.user?.id }, { userStatus: UserStatus.REJECTED });
        }

        await this.utilizedMagicLink(token);

        return true;
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

        const pupilParent = magicLink?.user?.pupils?.find((pupilParent) => +pupilParent?.pupilId === +magicLink?.pupilId);

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

    /**
     * getRejectMagicLinkForPupilParent takes an {@link LwpPupilParent}
     * and returns an active reject magic link for that pupil parent,
     * if one exists.
     *
     * @param {LwpPupilParent} pupilParent the pupil parent
     * @return {Promise<string | null>} the magic link URL, or null if none exist
     * @memberof MagicLinkService
     */
    async getRejectMagicLinkForPupilParent(pupilParent: LwpPupilParent): Promise<string | null> {
        return (
            await this.magicLinkRepository.findOne({
                where: {
                    type: MagicLinkType.REJECT_INVITATION,
                    user: { id: pupilParent.parentId },
                    pupilId: pupilParent.pupilId,
                    expiryTime: MoreThan(new Date())
                }
            })
        )?.url;
    }
}
