import { MagicLinkType } from 'src/api/model';
import { DbMocks } from 'src/auth/__utils__/DbMocks';
import { mockNest } from 'src/auth/__utils__/ModuleMocks';
import { StubRepositoryContainer } from 'src/auth/__utils__/StubRepositoryContainer';
import { BASE_MODULE_ENTITIES } from 'src/base.module.entities';

import { MagicLinkService } from './magic_link.service';

describe('MagicLinkService', () => {
    let magicLinkService: MagicLinkService;
    let dbMocks: DbMocks;

    const mockedRepos = new StubRepositoryContainer();

    beforeAll(async () => {
        const moduleRef = await mockNest({ providers: [MagicLinkService] }, BASE_MODULE_ENTITIES, mockedRepos);

        magicLinkService = moduleRef.get<MagicLinkService>(MagicLinkService);

        dbMocks = new DbMocks(mockedRepos);
    });

    beforeEach(() => mockedRepos.clearAll());

    afterEach(() => jest.restoreAllMocks());

    describe('reGenerateMagicLink', () => {
        let sendEmail: jest.SpyInstance;

        beforeEach(() => {
            // Generating and stamping links is not under test, and the stub repository cannot update by url.
            jest.spyOn(magicLinkService, 'generateMagicLink').mockImplementation((input) =>
                Promise.resolve({ url: 'new-token', ...input } as never)
            );
            jest.spyOn(mockedRepos.repos().LwpMagicLink, 'update').mockImplementation(() => undefined);
            sendEmail = jest.spyOn(magicLinkService, 'sendEmailAfterRegenerateMagicLink').mockResolvedValue(true);
        });

        const expiredInvitationFor = (inactive: boolean): string => {
            const school = dbMocks.mockSchool();

            school.inactive = inactive;

            const teacher = dbMocks.mockTeacher({ school });

            return dbMocks.mockMagicLink(MagicLinkType.INVITATION, new Date(Date.now() - 60000), dbMocks.mockPupil(school), teacher).url;
        };

        it('sends a teacher at an active school a fresh invitation', async () => {
            await magicLinkService.reGenerateMagicLink(expiredInvitationFor(false));

            expect(sendEmail).toHaveBeenCalledTimes(1);
        });

        // A teacher at an inactive school cannot sign in, so a fresh link would be no use to them.
        it('refuses a teacher at an inactive school and sends nothing', async () => {
            await expect(magicLinkService.reGenerateMagicLink(expiredInvitationFor(true))).rejects.toThrow('Invalid token');
            expect(sendEmail).not.toHaveBeenCalled();
        });
    });
});
