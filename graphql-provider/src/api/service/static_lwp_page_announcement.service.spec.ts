import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { constants, PageAnnouncementUserOption } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { StaticLwpPageAnnouncement } from '../entities/static_lwp_page_announcement';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';
import { AddPageAnnouncementInput, UpdatePageAnnouncementInput } from '../model';
import { HelperService } from './helper.service';
import { StaticLwpPageAnnouncementService } from './static_lwp_page_announcement.service';

const { ALL_USERS, ADMIN, PARENT, SCHOOL_LEADER, TEACHER } = PageAnnouncementUserOption;

const SCHOOL_FEED = '/school/[school_id]/feed';
const TEACHER_FEED = '/feed/[user_id]';
const CLASS_PUPILS = '/class/[class_id]/pupils';
const CHILD_HISTORY = '/child/[child_id]/history';
const FAQS = '/faqs';
const ADMIN_ANNOUNCEMENTS = '/admin/announcements';
const LOGIN_SCREEN = constants.LOGIN_SCREEN_ROUTE;

describe('StaticLwpPageAnnouncementService', () => {
    let service: StaticLwpPageAnnouncementService;
    let mockPageAnnouncementRepository: Partial<Repository<StaticLwpPageAnnouncement>>;
    let mockSchoolTagRepository: Partial<Repository<StaticLwpSchoolTag>>;

    const baseInput: AddPageAnnouncementInput = {
        userOptions: [TEACHER],
        schoolTagIds: [],
        targetPages: [],
        title: 'Title',
        includeImage: false,
        priority: 1,
        message: 'Message',
        imageUrl: null
    };

    beforeEach(async () => {
        mockPageAnnouncementRepository = {
            create: jest.fn((entity) => entity) as unknown as Repository<StaticLwpPageAnnouncement>['create'],
            save: jest.fn(),
            findOne: jest.fn()
        };
        mockSchoolTagRepository = { find: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaticLwpPageAnnouncementService,
                { provide: getRepositoryToken(StaticLwpPageAnnouncement), useValue: mockPageAnnouncementRepository },
                { provide: getRepositoryToken(LwpUser), useValue: {} },
                { provide: getRepositoryToken(StaticLwpSchoolTag), useValue: mockSchoolTagRepository },
                { provide: ShallowUserService, useValue: { newShallowUser: jest.fn((id) => ({ id })) } },
                { provide: HelperService, useValue: { uploadFile: jest.fn(), removeFile: jest.fn() } }
            ]
        }).compile();

        service = module.get(StaticLwpPageAnnouncementService);
    });

    describe('validateTargetPages', () => {
        it('treats no pages as every page', () => {
            expect(service.validateTargetPages([], [TEACHER])).toEqual([]);
            expect(service.validateTargetPages(undefined, [TEACHER])).toEqual([]);
        });

        it('rejects a route that is not in the page registry', () => {
            expect(() => service.validateTargetPages(['/not-a-page'], [ALL_USERS])).toThrow(HttpException);
            expect(() => service.validateTargetPages(['/logout'], [ALL_USERS])).toThrow('/logout');
        });

        it('rejects a page none of the chosen user types can open', () => {
            expect(() => service.validateTargetPages([SCHOOL_FEED], [PARENT])).toThrow(SCHOOL_FEED);
            expect(() => service.validateTargetPages([CHILD_HISTORY], [TEACHER])).toThrow(CHILD_HISTORY);
            expect(() => service.validateTargetPages([CHILD_HISTORY], [ADMIN])).toThrow(CHILD_HISTORY);
        });

        it('lets school leaders reach school leader, teacher and general pages, since leaders are teachers', () => {
            expect(service.validateTargetPages([SCHOOL_FEED, CLASS_PUPILS, FAQS], [SCHOOL_LEADER])).toEqual([
                SCHOOL_FEED,
                CLASS_PUPILS,
                FAQS
            ]);
        });

        it('rejects the teacher feed for school leaders, who are always redirected from it to the school feed', () => {
            expect(() => service.validateTargetPages([TEACHER_FEED], [SCHOOL_LEADER])).toThrow(TEACHER_FEED);
        });

        it('accepts the login screen and public pages for ALL_USERS, but not admin pages, which are for Admin', () => {
            expect(service.validateTargetPages([FAQS, LOGIN_SCREEN], [ALL_USERS])).toEqual([FAQS, LOGIN_SCREEN]);
            expect(() => service.validateTargetPages([ADMIN_ANNOUNCEMENTS], [ALL_USERS])).toThrow(ADMIN_ANNOUNCEMENTS);
        });

        it('lets admins reach admin and general pages, but not teacher or parent pages', () => {
            expect(service.validateTargetPages([ADMIN_ANNOUNCEMENTS, FAQS], [ADMIN])).toEqual([ADMIN_ANNOUNCEMENTS, FAQS]);
            expect(() => service.validateTargetPages([TEACHER_FEED], [ADMIN])).toThrow(TEACHER_FEED);
        });

        it('lets teachers reach teacher and general pages, but not school leader pages they cannot open', () => {
            expect(service.validateTargetPages([TEACHER_FEED, FAQS], [TEACHER])).toEqual([TEACHER_FEED, FAQS]);
            expect(() => service.validateTargetPages([SCHOOL_FEED], [TEACHER])).toThrow(SCHOOL_FEED);
            expect(service.validateTargetPages([SCHOOL_FEED, TEACHER_FEED], [TEACHER, SCHOOL_LEADER])).toEqual([SCHOOL_FEED, TEACHER_FEED]);
        });

        it('lets ALL_USERS, or no user types, reach every page', () => {
            expect(service.validateTargetPages([SCHOOL_FEED, CHILD_HISTORY], [ALL_USERS])).toEqual([SCHOOL_FEED, CHILD_HISTORY]);
            expect(service.validateTargetPages([SCHOOL_FEED, CHILD_HISTORY], [])).toEqual([SCHOOL_FEED, CHILD_HISTORY]);
        });

        it('accepts a page when any one of the chosen user types can open it', () => {
            expect(service.validateTargetPages([CHILD_HISTORY, TEACHER_FEED], [PARENT, TEACHER])).toEqual([CHILD_HISTORY, TEACHER_FEED]);
        });

        it('lets only ALL_USERS reach the login screen, since logged-out users get nothing else', () => {
            expect(service.validateTargetPages([LOGIN_SCREEN], [ALL_USERS])).toEqual([LOGIN_SCREEN]);
            expect(() => service.validateTargetPages([LOGIN_SCREEN], [TEACHER, PARENT, SCHOOL_LEADER])).toThrow(LOGIN_SCREEN);
            expect(() => service.validateTargetPages([LOGIN_SCREEN], [])).toThrow(LOGIN_SCREEN);
        });

        it('drops duplicates', () => {
            expect(service.validateTargetPages([TEACHER_FEED, TEACHER_FEED], [TEACHER])).toEqual([TEACHER_FEED]);
        });
    });

    describe('addPageAnnouncement', () => {
        it('saves the target pages', async () => {
            await service.addPageAnnouncement({ ...baseInput, targetPages: [TEACHER_FEED] }, 'admin-id');

            expect(mockPageAnnouncementRepository.create).toHaveBeenCalledWith(expect.objectContaining({ targetPages: [TEACHER_FEED] }));
            expect(mockPageAnnouncementRepository.save).toHaveBeenCalledWith(expect.objectContaining({ targetPages: [TEACHER_FEED] }));
        });

        it('saves no target pages when none are given', async () => {
            await service.addPageAnnouncement({ ...baseInput, targetPages: undefined }, 'admin-id');

            expect(mockPageAnnouncementRepository.save).toHaveBeenCalledWith(expect.objectContaining({ targetPages: [] }));
        });

        it('saves nothing when a target page is invalid', async () => {
            await expect(service.addPageAnnouncement({ ...baseInput, targetPages: [CHILD_HISTORY] }, 'admin-id')).rejects.toThrow(
                HttpException
            );

            expect(mockPageAnnouncementRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('updatePageAnnouncement', () => {
        const updateInput: UpdatePageAnnouncementInput = { ...baseInput, id: '1', hasImage: false };

        beforeEach(() => {
            (mockPageAnnouncementRepository.findOne as jest.Mock).mockResolvedValue({
                id: '1',
                userOptions: [TEACHER],
                targetPages: [TEACHER_FEED]
            });
        });

        it('replaces the target pages', async () => {
            await service.updatePageAnnouncement({ ...updateInput, targetPages: [FAQS] }, 'admin-id');

            expect(mockPageAnnouncementRepository.save).toHaveBeenCalledWith(expect.objectContaining({ targetPages: [FAQS] }));
        });

        it('clears the target pages back to every page', async () => {
            await service.updatePageAnnouncement({ ...updateInput, targetPages: [] }, 'admin-id');

            expect(mockPageAnnouncementRepository.save).toHaveBeenCalledWith(expect.objectContaining({ targetPages: [] }));
        });

        it('rejects a page the new user types cannot open, and saves nothing', async () => {
            await expect(
                service.updatePageAnnouncement({ ...updateInput, userOptions: [PARENT], targetPages: [TEACHER_FEED] }, 'admin-id')
            ).rejects.toThrow(TEACHER_FEED);

            expect(mockPageAnnouncementRepository.findOne).not.toHaveBeenCalled();
            expect(mockPageAnnouncementRepository.save).not.toHaveBeenCalled();
        });
    });
});
