import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import { LogLwpEntityStatusChangeService } from 'src/api/service/log_lwp_user_status_change.service';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { Not, Repository } from 'typeorm';

import { LwpMagicLink } from '../entities/magic_link';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpUser } from '../entities/user';
import { EntityFields, ErrorStatusCodeEnum, MagicLinkType, UpdateNonActiveParentInput, UpdateParentInput } from '../model';
import { HelperService } from './helper.service';
import { MagicLinkService } from './magic_link.service';
import { NotificationService } from './notification.service';
import { QueryBaseService } from './query_base.service';

@Injectable()
export class ParentService {
    constructor(
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupilParent)
        private pupilParentRepository: Repository<LwpPupilParent>,
        @InjectRepository(LwpMagicLink)
        private magicLinkRepository: Repository<LwpMagicLink>,
        private queryBaseService: QueryBaseService,
        private helperService: HelperService,
        private magicLinkService: MagicLinkService,
        private notificationService: NotificationService,
        private shallowUserService: ShallowUserService,
        private logUserStatusService: LogLwpEntityStatusChangeService
    ) {}

    public async getPupilParents1(pupilId: string, userType: UserType): Promise<LwpPupilParent[]> {
        const pupilParents = this.queryBaseService.pupilParentsBase(pupilId);

        const orderByStatus = `
            CASE pupilParent.status
                WHEN :active THEN 1
                WHEN :invited THEN 2
                WHEN :imported THEN 3
                WHEN :rejected THEN 4
                ELSE 5
            END
        `;

        const query = pupilParents.select('pupilParent').orderBy(orderByStatus, 'ASC').setParameters({
            active: PupilParentStatus.ACTIVE,
            invited: PupilParentStatus.INVITED,
            imported: PupilParentStatus.IMPORTED,
            rejected: PupilParentStatus.REJECTED
        });

        if (userType === UserType.PARENT) {
            return await query
                .andWhere('(pupilParent.status = :active OR pupilParent.status = :invited) AND pupil.id = :pupilId', {
                    active: PupilParentStatus.ACTIVE,
                    invited: PupilParentStatus.INVITED,
                    pupilId: pupilId
                })
                .getMany();
        }

        return await query.getMany();
    }

    public async getNonRejectedParents(pupilId: string): Promise<LwpPupilParent[]> {
        return await this.pupilParentRepository.find({ where: { status: Not(PupilParentStatus.REJECTED), pupil: { id: pupilId } } });
    }

    public async getImportedParents(pupilId: string): Promise<LwpPupilParent[]> {
        return await this.pupilParentRepository.find({ where: { status: PupilParentStatus.IMPORTED, pupil: { id: pupilId } } });
    }

    public async getPupilImportedParents(pupilId: string): Promise<LwpUser[]> {
        const pupilImportedParentsBase = this.queryBaseService.pupilImportedParentsBase(pupilId);
        const importedParents = await pupilImportedParentsBase.select('importedParents').getRawMany();

        const pupilImportedParentsParents: LwpUser[] = importedParents
            .map((pupil) => {
                return Object.assign({}, ...this.helperService.changeObjKeys(pupil, 'importedParents_'));
            })
            .filter((pupil) => pupil.id !== null);

        return pupilImportedParentsParents;
    }

    public async getPupilImportedStudent(pupilId: string): Promise<LwpUser[]> {
        const pupilWondeStudentBase = this.queryBaseService.pupilWondeStudentBase(pupilId);
        const importedStudent = await pupilWondeStudentBase.select('importedStudent').getRawOne();

        if (!importedStudent) return null;

        const pupil = Object.assign({}, ...this.helperService.changeObjKeys(importedStudent, 'importedStudent_'));

        return pupil && pupil.id ? pupil : null;
    }

    public async haveMoreChildren(parentId: string): Promise<boolean> {
        const parent = await this.userRepository.findOne({ where: { id: parentId }, relations: ['pupils'] });

        return parent?.pupils?.length > 1 ? true : false;
    }

    public async checkForExistingParentBeforeUpdate(
        id: string,
        selectFields: EntityFields<LwpUser>,
        email?: string,
        phoneNumber?: string
    ): Promise<LwpUser> {
        const parent = await this.userRepository.findOne({ where: { id }, select: selectFields });

        if (!parent) throw new HttpException('Parent not found.', ErrorStatusCodeEnum._535);

        if (email) {
            const parentWithEmail = await this.userRepository.findOne({ where: { email }, select: ['id'] });

            if (parentWithEmail?.id && parentWithEmail?.id !== parent?.id)
                throw new HttpException(
                    'Email address is already in use. Please double check the phone number/email address and contact hello@learningwithparents.com if you need any support.',
                    ErrorStatusCodeEnum._535
                );
        }

        if (phoneNumber) {
            const parentWithPhone = await this.userRepository.findOne({
                where: { phoneNumber: this.helperService.formatPhoneNumber(phoneNumber) },
                select: ['id']
            });

            if (parentWithPhone?.id && parentWithPhone?.id !== parent?.id)
                throw new HttpException(
                    'Phone number is already in use. Please double check the phone number/email address and contact hello@learningwithparents.com if you need any support.',
                    ErrorStatusCodeEnum._535
                );
        }

        return parent;
    }

    public updateParentEmailAndPhone(parent: LwpUser, email?: string, phoneNumber?: string): LwpUser {
        if (parent?.email !== email) {
            if (email?.trim()?.length) {
                parent.isEmailVerified = false;
                parent.email = email;
            } else {
                parent.email = null;
            }
        }

        if (parent?.phoneNumber !== phoneNumber) {
            parent.isPhoneVerified = false;
            parent.phoneNumber = phoneNumber ? this.helperService.formatPhoneNumber(phoneNumber) : null;
        }

        return parent;
    }

    public async updateParent(input: UpdateParentInput, userId: string): Promise<LwpUser> {
        let parent = await this.checkForExistingParentBeforeUpdate(
            input.id,
            ['id', 'email', 'phoneNumber', 'userStatus'],
            input.email,
            input.phoneNumber
        );

        parent.firstname = input.firstname;
        parent.lastname = input.lastname;

        parent = this.updateParentEmailAndPhone(parent, input.email, input.phoneNumber);

        if (input?.isDeactivated) {
            parent.userStatus = UserStatus.DEACTIVATED;
        }

        if (input?.isDeactivated === false && parent.userStatus === UserStatus.DEACTIVATED) {
            const previousStatus = (await this.logUserStatusService.getLastStatusChange(parent))?.previousStatus ?? UserStatus.ACTIVE;

            parent.userStatus = previousStatus as UserStatus;
        }

        parent.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return await this.userRepository.save(parent);
    }

    public async updateNonActiveParent(input: UpdateNonActiveParentInput, userId: string): Promise<LwpUser> {
        let parent = await this.checkForExistingParentBeforeUpdate(
            input.id,
            ['id', 'email', 'phoneNumber', 'userStatus'],
            input.email,
            input.phoneNumber
        );

        parent.firstname = input.firstname;
        parent.lastname = input.lastname;

        parent = this.updateParentEmailAndPhone(parent, input.email, input.phoneNumber);

        // Invalidate all magic links for this user
        await this.magicLinkRepository.delete({ user: { id: parent.id } });

        parent.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return await this.userRepository.save(parent);
    }

    public async reInviteParentWithEmailOrPhone(username: string, preference: string): Promise<boolean> {
        const user = await this.userRepository.findOne({
            where: [{ email: username }, { phoneNumber: this.helperService.formatPhoneNumber(username) }]
        });

        if (!user) throw new HttpException('User not found', ErrorStatusCodeEnum._535);

        const pupilId = await this.magicLinkService.getPupilIdFromMagicLink(user?.id);

        const magicLink = await this.magicLinkService.generateMagicLink({
            userId: user?.id,
            pupilTopicId: null,
            pupilId,
            trophyId: null,
            schoolId: null,
            termId: null,
            reportType: null,
            topicId: null,
            type: MagicLinkType.INVITATION
        });

        const rejectMagicLink = await this.magicLinkService.generateMagicLink({
            userId: user.id,
            pupilTopicId: null,
            pupilId,
            trophyId: null,
            schoolId: null,
            termId: null,
            reportType: null,
            topicId: null,
            type: MagicLinkType.REJECT_INVITATION
        });

        await this.notificationService.userRequestedSignUpLink(user, magicLink?.url, rejectMagicLink.url, preference, false, true);

        await this.userRepository.update({ id: user?.id }, { lastInvitationEmailSent: new Date() });

        return true;
    }

    public async reInviteParent(parentId: string): Promise<LwpUser> {
        const parent = await this.userRepository.findOne({ where: { id: parentId } });

        if (!parent) throw new HttpException('Invalid parent id', ErrorStatusCodeEnum._535);

        if (parent?.userStatus === UserStatus.INVITED || parent?.userStatus === UserStatus.ACCOUNTLESS) {
            const pupilId = await this.magicLinkService.getPupilIdFromMagicLink(parent?.id);
            const magicLink = await this.magicLinkService.generateMagicLink({
                userId: parent?.id,
                pupilTopicId: null,
                pupilId,
                trophyId: null,
                schoolId: null,
                termId: null,
                reportType: null,
                topicId: null,
                type: MagicLinkType.INVITATION
            });

            const rejectMagicLink = await this.magicLinkService.generateMagicLink({
                userId: parent.id,
                pupilTopicId: null,
                pupilId,
                schoolId: null,
                termId: null,
                reportType: null,
                trophyId: null,
                topicId: null,
                type: MagicLinkType.REJECT_INVITATION
            });

            // we need to track last email invitation time due to resend invitation delay

            await this.notificationService.userRequestedSignUpLink(parent, magicLink?.url, rejectMagicLink.url, null, false, true);

            parent.lastInvitationEmailSent = new Date();

            return await this.userRepository.save(parent);
        }

        if (parent?.userStatus === UserStatus.IMPORTED) {
            const pupilId = await this.magicLinkService.getPupilIdFromMagicLink(parent?.id);
            const magicLink = await this.magicLinkService.generateMagicLink({
                userId: parent?.id,
                pupilTopicId: null,
                schoolId: null,
                termId: null,
                reportType: null,
                pupilId,
                trophyId: null,
                topicId: null,
                type: MagicLinkType.INVITATION
            });

            const rejectMagicLink = await this.magicLinkService.generateMagicLink({
                userId: parent.id,
                pupilTopicId: null,
                pupilId,
                schoolId: null,
                termId: null,
                reportType: null,
                trophyId: null,
                topicId: null,
                type: MagicLinkType.REJECT_INVITATION
            });

            await this.notificationService.userRequestedSignUpLink(parent, magicLink?.url, rejectMagicLink.url, null, false, true);

            parent.lastInvitationEmailSent = new Date();

            parent.userStatus = UserStatus.INVITED;

            return await this.userRepository.save(parent);
        }

        throw new HttpException('Reset password token is not found for this user', ErrorStatusCodeEnum._535);
    }
}
