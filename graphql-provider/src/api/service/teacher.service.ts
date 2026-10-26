import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InviteMode, UserStatus } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { In, Repository } from 'typeorm';

import { LwpSchool } from '../entities/school';
import { LwpUser } from '../entities/user';
import {
    ErrorStatusCodeEnum,
    InviteTeacherInput,
    MagicLinkType,
    OperationStatus,
    TeacherInput,
    TeacherRole,
    UpdateTeacherInput
} from './../model';
import { HelperService } from './helper.service';
import { MagicLinkService } from './magic_link.service';
import { NotificationService } from './notification.service';
import { QueryBaseService } from './query_base.service';

@Injectable()
export class TeacherService {
    constructor(
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        private helperService: HelperService,
        private queryBaseService: QueryBaseService,
        private notificationService: NotificationService,
        private magicLinkService: MagicLinkService,
        private shallowUserService: ShallowUserService
    ) {}

    public async addTeacher(input: TeacherInput, invitedBy: string | LwpUser): Promise<LwpUser> {
        if (typeof invitedBy === 'string') {
            invitedBy = await this.userRepository.findOne(invitedBy);
        }

        const user = new LwpUser();

        // Transitional shim: prefer the new `inviteMode`, but fall back to the legacy `sendInvite` boolean for
        // callers not yet updated. TODO(LEA-6305): remove once all call sites send `inviteMode` and the feature
        // is in production.
        const inviteMode = input.inviteMode ?? (input.sendInvite ? InviteMode.SEND_NOW : InviteMode.DO_NOT_SEND);
        const sendNow = inviteMode === InviteMode.SEND_NOW;

        user.firstname = input.firstname;
        user.lastname = input.lastname;
        user.email = input.email;
        user.type = UserType.TEACHER;
        user.inviteMode = inviteMode;
        user.userStatus = sendNow ? UserStatus.INVITED : UserStatus.IMPORTED;
        user.nameForChildren = input.nameForChildren;
        user.emailVerificationCode = input.email ? this.helperService.generateId(4, '') : null;
        user.school = await this.schoolRepository.findOne({ where: { id: input.schoolId } });
        if (!user.school) throw new HttpException(`${input.schoolId} school not found.`, 404);
        user.isSchoolLeader = input.role === TeacherRole.SCHOOL_LEADER;

        try {
            const teacher = await this.userRepository.save(user);

            if (sendNow) {
                const magicLink = await this.magicLinkService.generateMagicLink({
                    userId: teacher?.id,
                    pupilTopicId: null,
                    pupilId: null,
                    schoolId: null,
                    termId: null,
                    topicId: null,
                    reportType: null,
                    trophyId: null,
                    type: MagicLinkType.INVITATION
                });
                const rejectMagicLink = await this.magicLinkService.generateMagicLink({
                    userId: teacher.id,
                    pupilTopicId: null,
                    pupilId: null,
                    schoolId: null,
                    termId: null,
                    topicId: null,
                    reportType: null,
                    trophyId: null,
                    type: MagicLinkType.REJECT_INVITATION
                });

                if (teacher.isSchoolLeader) {
                    await this.notificationService.schoolLeaderInvitationEmail(
                        teacher,
                        teacher?.school,
                        magicLink?.url,
                        rejectMagicLink?.url,
                        invitedBy,
                        true
                    );
                } else {
                    await this.notificationService.teacherInvitationEmail(
                        teacher,
                        teacher?.school,
                        magicLink?.url,
                        rejectMagicLink?.url,
                        invitedBy,
                        true
                    );
                }
            }

            return teacher;
        } catch (error) {
            if (error.code === '23505') {
                throw new HttpException(`Email address is already registered.`, ErrorStatusCodeEnum._535);
            } else {
                throw new HttpException(`${error}`, 400);
            }
        }
    }

    public async updateTeacher(input: UpdateTeacherInput): Promise<LwpUser> {
        const teacher = await this.userRepository.findOne({ where: { id: input.id } });

        teacher.firstname = input.firstname;
        teacher.lastname = input.lastname;
        teacher.email = input.email;
        teacher.nameForChildren = input.nameForChildren;

        if (input.role === TeacherRole.SCHOOL_LEADER) {
            teacher.isSchoolLeader = true;
        } else {
            teacher.isSchoolLeader = false;
        }

        if (input?.isDeactivated) {
            teacher.userStatus = UserStatus.DEACTIVATED;
        }

        if (input?.isDeactivated === false) {
            teacher.userStatus = UserStatus.ACTIVE;
        }

        return await this.userRepository.save(teacher);
    }

    public async inviteTeacher(input: InviteTeacherInput, invitedBy: string | LwpUser): Promise<LwpUser> {
        if (typeof invitedBy === 'string') {
            invitedBy = await this.userRepository.findOne(invitedBy);
        }

        const teacher = await this.userRepository.findOne({ where: { id: input.teacherId }, relations: ['school'] });

        if (!teacher) throw new HttpException(`User not found.`, ErrorStatusCodeEnum._535);

        const magicLink = await this.magicLinkService.generateMagicLink({
            userId: teacher?.id,
            pupilTopicId: null,
            pupilId: null,
            topicId: null,
            schoolId: null,
            reportType: null,
            termId: null,
            trophyId: null,
            type: MagicLinkType.INVITATION
        });
        const rejectMagicLink = await this.magicLinkService.generateMagicLink({
            userId: teacher.id,
            pupilTopicId: null,
            pupilId: null,
            schoolId: null,
            termId: null,
            topicId: null,
            reportType: null,
            trophyId: null,
            type: MagicLinkType.REJECT_INVITATION
        });

        if (teacher.isSchoolLeader) {
            await this.notificationService.schoolLeaderInvitationEmail(
                teacher,
                teacher?.school,
                magicLink?.url,
                rejectMagicLink?.url,
                invitedBy,
                true
            );
        } else {
            await this.notificationService.teacherInvitationEmail(
                teacher,
                teacher?.school,
                magicLink?.url,
                rejectMagicLink?.url,
                invitedBy,
                true
            );
        }

        teacher.userStatus = UserStatus.INVITED;
        teacher.lastInvitationEmailSent = new Date();

        return await this.userRepository.save(teacher);
    }

    /**
     * Sends invitations to a set of already-loaded IMPORTED users (leaders or teachers), sending the correct
     * email per role and flipping each to INVITED. Callers must load the users with their `school` relation
     * and restrict the set to IMPORTED users.
     */
    private async inviteImportedUsers(users: LwpUser[], invitedBy: LwpUser): Promise<void> {
        for (const user of users) {
            const magicLink = await this.magicLinkService.generateMagicLink({
                userId: user?.id,
                pupilTopicId: null,
                pupilId: null,
                schoolId: null,
                termId: null,
                topicId: null,
                trophyId: null,
                reportType: null,
                type: MagicLinkType.INVITATION
            });
            const rejectMagicLink = await this.magicLinkService.generateMagicLink({
                userId: user.id,
                pupilTopicId: null,
                pupilId: null,
                schoolId: null,
                reportType: null,
                termId: null,
                topicId: null,
                trophyId: null,
                type: MagicLinkType.REJECT_INVITATION
            });

            if (user.isSchoolLeader) {
                await this.notificationService.schoolLeaderInvitationEmail(
                    user,
                    user?.school,
                    magicLink?.url,
                    rejectMagicLink?.url,
                    invitedBy,
                    true
                );
            } else {
                await this.notificationService.teacherInvitationEmail(
                    user,
                    user?.school,
                    magicLink?.url,
                    rejectMagicLink?.url,
                    invitedBy,
                    true
                );
            }

            await this.userRepository.update({ id: user?.id }, { userStatus: UserStatus.INVITED, lastInvitationEmailSent: new Date() });
        }
    }

    public async inviteImportedTeachers(ids: string[], schoolId: string, invitedById: string): Promise<boolean> {
        const invitedBy = await this.userRepository.findOne(invitedById);

        const importedTeachers = await this.userRepository.find({
            where: { id: In(ids), userStatus: UserStatus.IMPORTED, school: { id: schoolId } },
            relations: ['school']
        });

        await this.inviteImportedUsers(importedTeachers, invitedBy);

        return true;
    }

    /**
     * Admin bulk-invite that is school-agnostic (used by the cross-school and per-school "Send invites" UX).
     * The IMPORTED filter is applied server-side so a stale or hostile client cannot re-invite users who are
     * already active.
     */
    public async sendStaffInvites(userIds: string[], invitedById: string): Promise<boolean> {
        const invitedBy = await this.userRepository.findOne(invitedById);

        // Match the read paths that feed this mutation: only IMPORTED teachers/leaders (not parents, who are
        // also created IMPORTED but have no school) at active schools can be invited, regardless of what a
        // stale or hostile client submits.
        const users = await this.userRepository.find({
            where: { id: In(userIds), userStatus: UserStatus.IMPORTED, type: UserType.TEACHER, school: { inactive: false } },
            relations: ['school']
        });

        await this.inviteImportedUsers(users, invitedBy);

        return true;
    }

    public async deleteTeacher(id: string, userId: string): Promise<OperationStatus> {
        const teacher = await this.userRepository.findOne({
            where: { id: id },
            relations: ['classes', 'classes.mainTeacher', 'classes.period']
        });
        let isMainTeacher = false;
        const teacherClassName: string[] = [];

        if (!teacher) throw new HttpException('Teacher does not exist', ErrorStatusCodeEnum._535);

        for (const schoolClass of teacher.classes) {
            if (schoolClass?.mainTeacher?.id === teacher?.id && !schoolClass?.period?.isPreviousPeriod) {
                isMainTeacher = true;
                teacherClassName.push(
                    schoolClass?.name + schoolClass?.period?.isCurrentPeriod ? '' : ` (in ${schoolClass.period.longName})`
                );
            }
        }

        if (isMainTeacher)
            throw new HttpException(
                `This user is the main teacher for class ${teacherClassName.join(', and class ')}. Please choose a new main teacher first.`,
                ErrorStatusCodeEnum._535
            );

        const res = await this.userRepository.update(id, { deletedBy: this.shallowUserService.newShallowUser(userId) });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getSchoolClassTeachers(schoolClassId: string): Promise<LwpUser[]> {
        const likedFeedbackTeacherBase = await this.queryBaseService.schoolClassTeachersBase(schoolClassId);
        const teachers = await likedFeedbackTeacherBase.select('teachers').getRawMany();

        const classTeachers: LwpUser[] = teachers
            .map((teacher) => Object.assign({}, ...this.helperService.changeObjKeys(teacher, 'teachers_')))
            .filter((teacher) => teacher.id !== null);

        return classTeachers;
    }

    public async getTeacher(teacherId: string): Promise<LwpUser> {
        const teacher = await this.userRepository.findOne({ where: { id: teacherId } });

        if (!teacher) throw new HttpException('Teacher does not exist', ErrorStatusCodeEnum._535);

        return teacher;
    }

    public async getSchoolClassMainTeacher(pupilActivityId: string): Promise<LwpUser> {
        const pupilParentBase = await this.queryBaseService.schoolClassMainTeacherBase(pupilActivityId);
        const mainTeacher = await pupilParentBase.select('mainTeacher').getRawOne();
        const newMainTeacher = Object.assign({}, ...this.helperService.changeObjKeys(mainTeacher, 'mainTeacher_'));

        if (newMainTeacher?.id) return newMainTeacher;

        return null;
    }

    public async getSchoolLeaders(schoolId: string): Promise<LwpUser[]> {
        const schoolLeadersBase = await this.queryBaseService.schoolLeadersBase(schoolId);
        const schoolLeaders = await schoolLeadersBase.select('schoolLeaders').getRawMany();

        const newSchoolleaders: LwpUser[] = schoolLeaders
            .map((teacher) => Object.assign({}, ...this.helperService.changeObjKeys(teacher, 'schoolLeaders_')))
            .filter((teacher) => teacher.id !== null);

        return newSchoolleaders;
    }
}
