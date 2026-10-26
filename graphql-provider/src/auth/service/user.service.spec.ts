import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserStatus } from 'lwp-shared';
import { UserAssociatedLoginType } from 'src/api/model';
import { MagicLinkService } from 'src/api/service/magic_link.service';
import { NotificationService } from 'src/api/service/notification.service';
import { UserType } from 'src/auth/types/UserType';
import { BASE_MODULE_ENTITIES } from 'src/base.module.entities';

import { DbMocks } from '../__utils__/DbMocks';
import { mockNest } from '../__utils__/ModuleMocks';
import { StubRepositoryContainer } from '../__utils__/StubRepositoryContainer';
import { AuthToken } from '../types/AuthToken';
import { UsersService } from './user.service';

describe('UsersService', () => {
    let moduleRef: TestingModule;
    let usersService: UsersService;
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(async () => {
        moduleRef = await mockNest({ providers: [UsersService] }, BASE_MODULE_ENTITIES, mockedRepos);

        usersService = moduleRef.get<UsersService>(UsersService);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    describe('getJwtForUser', () => {
        it('should return correctly for a parent with no children', async () => {
            const user = dbMocks.mockParent();

            expect(await usersService.getAuthTokenForUser(user)).toEqual(
                new AuthToken({
                    firstName: 'First',
                    lastName: 'Last',
                    userType: UserType.PARENT,
                    status: UserStatus.ACTIVE,
                    adminRestrictions: undefined,
                    pupilIds: [],
                    email: user.email,
                    phoneNumber: undefined
                })
            );
        });

        it('should return correctly for a parent with children', async () => {
            const user = dbMocks.mockParent({ pupils: 2 });

            expect(await usersService.getAuthTokenForUser(user)).toEqual(
                new AuthToken({
                    firstName: 'First',
                    lastName: 'Last',
                    userType: UserType.PARENT,
                    status: UserStatus.ACTIVE,
                    adminRestrictions: undefined,
                    pupilIds: user.pupils.map((p) => p.pupilId),
                    email: user.email,
                    phoneNumber: undefined
                })
            );
        });

        it('should return correctly for a parent with children, an email and phone number', async () => {
            const user = dbMocks.mockParent({ pupils: 2, options: { phoneNumber: '0123456789' } });

            expect(await usersService.getAuthTokenForUser(user)).toEqual(
                new AuthToken({
                    firstName: 'First',
                    lastName: 'Last',
                    userType: UserType.PARENT,
                    status: UserStatus.ACTIVE,
                    adminRestrictions: undefined,
                    pupilIds: user.pupils.map((p) => p.pupilId),
                    email: user.email,
                    phoneNumber: '0123456789'
                })
            );
        });

        it('should return correctly for a teacher', async () => {
            const user = dbMocks.mockTeacher({ classes: 3 });

            expect(await usersService.getAuthTokenForUser(user)).toEqual(
                new AuthToken({
                    firstName: 'First',
                    lastName: 'Last',
                    userType: UserType.TEACHER,
                    status: UserStatus.ACTIVE,
                    adminRestrictions: undefined,
                    schoolId: user.school.id,
                    schoolName: user.school.schoolName,
                    classIds: user.classes.map((c) => c.id),
                    isSchoolLeader: false,
                    email: user.email,
                    phoneNumber: undefined
                })
            );
        });

        it('should return correctly for a teacher with groups', async () => {
            const user = dbMocks.mockTeacher({ classes: 3 });

            const group = dbMocks.mockClass(user.school, { parentClass: user.classes[0] });

            const allClasses = user.classes.map((c) => c.id);

            allClasses.push(group.id);

            expect(await usersService.getAuthTokenForUser(user)).toEqual(
                new AuthToken({
                    firstName: 'First',
                    lastName: 'Last',
                    userType: UserType.TEACHER,
                    status: UserStatus.ACTIVE,
                    adminRestrictions: undefined,
                    schoolId: user.school.id,
                    schoolName: user.school.schoolName,
                    classIds: allClasses,
                    isSchoolLeader: false,
                    email: user.email,
                    phoneNumber: undefined
                })
            );
        });

        it('should return correctly for a leader', async () => {
            const user = dbMocks.mockTeacher({ classes: 3, leader: true });

            expect(await usersService.getAuthTokenForUser(user)).toEqual(
                new AuthToken({
                    firstName: 'First',
                    lastName: 'Last',
                    userType: UserType.TEACHER,
                    status: UserStatus.ACTIVE,
                    adminRestrictions: undefined,
                    schoolId: user.school.id,
                    schoolName: user.school.schoolName,
                    isSchoolLeader: true,
                    email: user.email,
                    phoneNumber: undefined
                })
            );
        });
    });

    describe('findUserFromSocialLogin', () => {
        it('behaves correctly when no user is found', async () => {
            expect(await usersService.findUserFromSocialLogin(UserAssociatedLoginType.GOOGLE, 'notexist')).toBe(undefined);
        });

        it('behaves correctly when a user is found', async () => {
            const user = dbMocks.mockTeacher();

            dbMocks.mockUserAssociatedLogin(user, 'exists', UserAssociatedLoginType.GOOGLE);

            const foundUser = await usersService.findUserFromSocialLogin(UserAssociatedLoginType.GOOGLE, 'exists');

            expect(foundUser).toBe(user);
        });
    });

    describe('changeUserPassword', () => {
        it('should set a password when a user has none', async () => {
            const user = dbMocks.mockParent();

            await usersService.changeUserPassword(user.id, 'test');

            expect(bcrypt.compareSync('test', user.password)).toBeTruthy();
        });

        it('should set a password when the current one is correctly entered', async () => {
            const user = dbMocks.mockParent({ options: { password: bcrypt.hashSync('testPassword', 10) } });

            await usersService.changeUserPassword(user.id, 'testNewPassword', 'testPassword');

            expect(bcrypt.compareSync('testNewPassword', user.password)).toBeTruthy();
        });

        it('should error when the current password is the same as the new one', () => {
            const user = dbMocks.mockParent({ options: { password: bcrypt.hashSync('testPassword', 10) } });

            expect(() => usersService.changeUserPassword(user.id, 'testPassword', 'testPassword')).rejects.toThrow(BadRequestException);
        });

        it('should not set a password when the current one is incorrectly entered', () => {
            const user = dbMocks.mockParent({ options: { password: bcrypt.hashSync('testPassword', 10) } });

            expect(() => usersService.changeUserPassword(user.id, 'testNewPassword', 'wrongCurrentPassword')).rejects.toThrow(
                ForbiddenException
            );
        });
    });

    describe('forgotPassword', () => {
        let notificationService: jest.Mocked<NotificationService>;

        beforeEach(() => {
            notificationService = moduleRef.get(NotificationService);
            // These mocks come from mockNest's own ModuleMocker, which jest.clearAllMocks does not reach.
            notificationService.sendResetPasswordEmail.mockClear();

            const magicLinkService: jest.Mocked<MagicLinkService> = moduleRef.get(MagicLinkService);

            magicLinkService.generateMagicLink.mockResolvedValue({ url: 'reset-token' } as never);
        });

        it('sends a reset email to a teacher at an active school', async () => {
            const teacher = dbMocks.mockTeacher();

            await usersService.forgotPassword(teacher.email, null, 'jest', '127.0.0.1');

            expect(notificationService.sendResetPasswordEmail).toHaveBeenCalledTimes(1);
        });

        // A teacher at an inactive school cannot sign in, so preLogin treats them as unknown; this matches it.
        it('treats a teacher at an inactive school as unknown and sends nothing', async () => {
            const school = dbMocks.mockSchool();

            school.inactive = true;

            const teacher = dbMocks.mockTeacher({ school });

            await expect(usersService.forgotPassword(teacher.email, null, 'jest', '127.0.0.1')).rejects.toThrow('User does not exist');
            expect(notificationService.sendResetPasswordEmail).not.toHaveBeenCalled();
        });
    });
});
