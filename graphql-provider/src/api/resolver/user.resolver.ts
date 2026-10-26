import { HttpException } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { UsersService } from 'src/auth/service/user.service';
import { OpType } from 'src/auth/types/OpType';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { IsNull, Not, Repository } from 'typeorm';

import { ShowInterstitialOutput } from '../dtos/ShowInterstitialOutput';
import { UserAnnouncementContextOutput } from '../dtos/UserAnnouncementContext';
import { ImportedContact } from '../entities/imported_contact';
import { LogLwpEntityStatusChange } from '../entities/log_lwp_entity_status_change';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilParent } from '../entities/pupil_parent';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPageAnnouncement } from '../entities/static_lwp_page_announcement';
import { LwpUser, selfAndOtherUserAuth } from '../entities/user';
import { LwpUserAssociatedLogin } from '../entities/user_associated_login';
import {
    ErrorStatusCodeEnum,
    LastLoginOptions,
    notificationPreferenceEnum,
    NotificationSettingsInput,
    NotProductionIndicatorOutput,
    OperationStatus
} from '../model';
import { LogLwpEntityStatusChangeService } from '../service/log_lwp_user_status_change.service';
import { LwpPupilFeedbackService } from '../service/lwp_pupil_feedback.service';
import { LwpUserPageAnnouncementService } from '../service/lwp_user_page_announcement.service';
import { MagicLinkService } from '../service/magic_link.service';
import { SchoolService } from '../service/school.service';
import { SchoolClassService } from '../service/school_class.service';
import { StaticLwpInterstitialService } from '../service/static_lwp_interstitial.service';
import { StaticLwpPageAnnouncementService } from '../service/static_lwp_page_announcement.service';

@Resolver(() => LwpUser)
export class UserResolver {
    constructor(
        @InjectRepository(LwpUser) private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpPupil) private pupilRepository: Repository<LwpPupil>,
        private schoolClassService: SchoolClassService,
        private schoolService: SchoolService,
        private userService: UsersService,
        private staticLwpInterstitialService: StaticLwpInterstitialService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private magicLinkService: MagicLinkService,
        private userStatusChangeService: LogLwpEntityStatusChangeService,
        private staticLwpPageAnnouncementService: StaticLwpPageAnnouncementService,
        private userPageAnnouncementService: LwpUserPageAnnouncementService
    ) {}

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'id'])
    @Query(() => LwpUser)
    async getUser(@Args('id') id: string): Promise<LwpUser> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['importedContacts']
        });

        if (!user) throw new HttpException('user does not exist', ErrorStatusCodeEnum._535);

        return user;
    }

    // @UseGuards(AzureADGuard)
    @Query(() => NotProductionIndicatorOutput)
    @Public()
    async getServerUptime(): Promise<NotProductionIndicatorOutput> {
        return await this.userService.getServerUptime();
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => OperationStatus)
    async deleteUser(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.userService.deleteUser(id, userId);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'id'])
    @Mutation(() => Boolean)
    async changeOptedOutStatus(@Args('id') id: string, @Args('optedOut') optedOut: boolean): Promise<boolean> {
        return await this.userService.changeOptedOutStatus(id, optedOut);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'userId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => OperationStatus)
    async disconnectSocialAccount(@Args('userId') userId: string, @Args('accountId') accountId: string): Promise<OperationStatus> {
        return await this.userService.disconnectSocialAccount(userId, accountId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async removeImportedUsers(): Promise<boolean> {
        const users = await this.userRepository.find({
            where: { importedContactId: Not(IsNull()) }
        });

        const pupils = await this.pupilRepository.find({ where: { importedStudentId: Not(IsNull()) } });

        for (const user of users) {
            await this.userRepository.delete(user.id);
        }

        for (const pupil of pupils) {
            if (pupil.importedStudentId) {
                await this.pupilRepository.delete(pupil.id);
            }
        }

        return true;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpUser])
    async getUsersByKey(@Args('key') key: string): Promise<LwpUser[]> {
        return this.userService.getUsersByKey(key);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'notificationSettingsInput.userId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpUser)
    async changeNotificationSettings(
        @Args('notificationSettingsInput') notificationSettingsInput: NotificationSettingsInput
    ): Promise<LwpUser> {
        const { forEmail, forTextMessage, userId } = notificationSettingsInput;

        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) throw new HttpException('user does not exist', ErrorStatusCodeEnum._535);

        if (forEmail && forTextMessage) {
            user.notificationPreference = notificationPreferenceEnum.BOTH;
        } else if (!forEmail && !forTextMessage) {
            user.notificationPreference = notificationPreferenceEnum.NOREMINDER;
        } else if (forEmail && !forTextMessage) {
            user.notificationPreference = notificationPreferenceEnum.EMAILREMINDER;
        } else {
            user.notificationPreference = notificationPreferenceEnum.SMSREMINDER;
        }

        return await this.userRepository.save(user);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Write, 'id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpUser)
    async changeUserPassword(
        @Args('id') id: string,
        @Args('password') password: string,
        @Args('oldPassword', { nullable: true }) oldPassword?: string
    ): Promise<LwpUser> {
        return await this.userService.changeUserPassword(id, password, oldPassword);
    }

    @ResolveField(() => [LwpSchoolClass])
    async classes(@Parent() teacher: LwpUser): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getTeacherClasses(teacher.id);
    }

    @ResolveField(() => ShowInterstitialOutput, { nullable: true })
    @AuthorizeField(selfAndOtherUserAuth(UnrestrictedField, TeacherField))
    async showInterstitial(@Parent() user: LwpUser): Promise<ShowInterstitialOutput> {
        return await this.staticLwpInterstitialService.getUserInterstitialFormData(user.id);
    }

    @ResolveField(() => [LwpSchoolClass])
    async mainClasses(@Parent() teacher: LwpUser): Promise<LwpSchoolClass[]> {
        return await this.schoolClassService.getTeacherMainClasses(teacher.id);
    }

    @ResolveField(() => [LwpPupilFeedback])
    async likedActivities(@Parent() teacher: LwpUser): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getTeacherLikedActivityFeeds(teacher.id);
    }

    @ResolveField(() => LwpSchool)
    async school(@Parent() teacher: LwpUser): Promise<LwpSchool> {
        return await this.schoolService.getTeacherSchool(teacher.id);
    }

    @ResolveField(() => [ImportedContact])
    async importedContacts(@Parent() parent: LwpUser): Promise<ImportedContact[]> {
        return await this.userService.getImportedContacts(parent.id);
    }

    @ResolveField(() => [LwpUserAssociatedLogin])
    async socialAccounts(@Parent() user: LwpUser, @AuthInfo('sub') userId: string): Promise<LwpUserAssociatedLogin[]> {
        if (userId !== user.id) return null;

        return await this.userService.getUserSocialAccounts(user.id);
    }

    @ResolveField(() => [LwpPupilParent])
    async activePupils(@Parent() user: LwpUser, @AuthInfo('sub') userId: string): Promise<LwpPupilParent[]> {
        if (userId !== user.id) return null;

        return await this.userService.getUserActivePupils(user.id);
    }

    @ResolveField(() => Boolean)
    async hasPassword(@Parent() user: LwpUser, @AuthInfo('sub') userId: string): Promise<boolean> {
        if (userId !== user.id) return null;

        return await this.userService.userHasPassword(user.id);
    }

    @ResolveField(() => Boolean)
    restrictSiteData(@Parent() user: LwpUser): boolean {
        return user?.adminRestrictions?.siteData ? true : false;
    }

    @ResolveField(() => String)
    async socialLoginPermissions(@Parent() user: LwpUser): Promise<string> {
        return JSON.stringify(await this.userService.getSocialLoginPermissionsOfUser(user));
    }

    @ResolveField(() => LastLoginOptions)
    async lastLoginInfo(@Parent() user: LwpUser, @AuthInfo('userType') userType: UserType): Promise<LastLoginOptions> {
        if (userType !== UserType.ADMIN) return null;

        return await this.userService.getlastLoginInfoOfUser(user?.email, user?.phoneNumber);
    }

    @ResolveField(() => [LogLwpEntityStatusChange])
    async userStatusChangeLogs(@Parent() user: LwpUser, @AuthInfo('userType') userType: UserType): Promise<LogLwpEntityStatusChange[]> {
        if (userType !== UserType.ADMIN) return null;

        return await this.userStatusChangeService.getStatusChangeLogs(user);
    }

    @ResolveField(() => Boolean)
    async hasClassesThisYear(@Parent() user: LwpUser): Promise<boolean> {
        return await this.schoolClassService.hasClassesThisYear(user?.id);
    }

    @ResolveField(() => [StaticLwpPageAnnouncement])
    async unSeenPageAnnouncements(@Parent() user: LwpUser): Promise<StaticLwpPageAnnouncement[]> {
        return await this.staticLwpPageAnnouncementService.getUnseenPageAnnouncementsForUser(user.id);
    }

    @ResolveField(() => UserAnnouncementContextOutput, { nullable: true })
    async userAnnouncementContext(@Parent() user: LwpUser): Promise<UserAnnouncementContextOutput> {
        return await this.staticLwpPageAnnouncementService.getUserAnnouncementContext(user.id, user.type, user.isSchoolLeader);
    }
}
