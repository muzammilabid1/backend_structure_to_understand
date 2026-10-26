import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { StaticLwpActivitySteps } from '../entities/activity';
import { StaticLwpModal } from '../entities/modal';
import { UpdateModalInput } from '../model';
import { HelperService } from './helper.service';
import { ModalService } from './modal.service';

describe('ModalService', () => {
    let service: ModalService;
    let mockModalRepository: Partial<Repository<StaticLwpModal>>;
    let mockStepsRepository: Partial<Repository<StaticLwpActivitySteps>>;

    beforeEach(async () => {
        mockModalRepository = {
            findOne: jest.fn(),
            save: jest.fn().mockImplementation((modal) => Promise.resolve(modal))
        };
        mockStepsRepository = {
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn()
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ModalService,
                { provide: getRepositoryToken(StaticLwpModal), useValue: mockModalRepository },
                { provide: getRepositoryToken(StaticLwpActivitySteps), useValue: mockStepsRepository },
                { provide: HelperService, useValue: {} },
                { provide: ShallowUserService, useValue: {} }
            ]
        }).compile();

        service = module.get(ModalService);
    });

    describe('updateModal nameForContentDev', () => {
        const updateWith = async (input: Partial<UpdateModalInput>, stored: string | null): Promise<StaticLwpModal> => {
            (mockModalRepository.findOne as jest.Mock).mockResolvedValue({ id: '1', name: 'Modal', nameForContentDev: stored });

            return await service.updateModal({ id: '1', ...input } as UpdateModalInput, []);
        };

        it('keeps the stored title when the field is left out', async () => {
            expect((await updateWith({ name: 'Renamed' }, 'Rationale title')).nameForContentDev).toBe('Rationale title');
        });

        it('saves a new title with the spaces trimmed off', async () => {
            expect((await updateWith({ nameForContentDev: '  New title  ' }, 'Old title')).nameForContentDev).toBe('New title');
        });

        it.each([
            ['null', null],
            ['an empty string', ''],
            ['only spaces', '   ']
        ])('clears the stored title when it is sent as %s', async (_label, value) => {
            expect((await updateWith({ nameForContentDev: value }, 'Old title')).nameForContentDev).toBeNull();
        });
    });
});
