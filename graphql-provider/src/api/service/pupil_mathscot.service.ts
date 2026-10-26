import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LwpPupil } from '../entities/pupil';
import { LwpPupilMathscot } from '../entities/pupil_mathscot';
import { StaticLwpPeriod } from '../entities/static_period';
import { AddPupilMathscotInput, ErrorStatusCodeEnum, UpdatePupilMathscotInput } from '../model';
@Injectable()
export class PupilMathscotService {
    constructor(
        @InjectRepository(LwpPupilMathscot)
        private pupilMathscotRepository: Repository<LwpPupilMathscot>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addPupilMathscot(input: AddPupilMathscotInput, userId: string): Promise<LwpPupilMathscot> {
        const pupil = await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('pupil.id = :pupilId', { pupilId: input.pupilId })
            .select(['pupil.id as "pupilId"', 'schoolPeriod.index as "schoolPeriodIndex"'])
            .getRawOne<{ pupilId: string; schoolPeriodIndex: number }>();

        const periodIndex = input.periodIndex || pupil?.schoolPeriodIndex;

        if (!pupil?.pupilId) throw new HttpException('Pupil does not exist.', ErrorStatusCodeEnum._535);

        const existingPupilMathscot = await this.pupilMathscotRepository
            .createQueryBuilder('pupilMathscot')
            .leftJoin('pupilMathscot.pupil', 'pupil')
            .leftJoin('pupilMathscot.period', 'period')
            .where('pupil.id = :pupilId', { pupilId: input.pupilId })
            .andWhere('period.index = :periodIndex', { periodIndex })
            .getOne();

        if (existingPupilMathscot) {
            throw new HttpException('Mathscot for this pupil already exists.', ErrorStatusCodeEnum._535);
        }

        const pupilMathscot = new LwpPupilMathscot();

        pupilMathscot.items = input.itemIds;
        pupilMathscot.pupil = { id: pupil.pupilId } as LwpPupil;

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        pupilMathscot.logCreatedBy = shallowUser;
        pupilMathscot.logUpdatedBy = shallowUser;

        pupilMathscot.period = { index: periodIndex } as StaticLwpPeriod;
        pupilMathscot.character = input.character;
        pupilMathscot.colour = input.colour;

        return await this.pupilMathscotRepository.save(pupilMathscot);
    }

    public async updatePupilMathscot(input: UpdatePupilMathscotInput): Promise<LwpPupilMathscot> {
        const pupilMathscot = await this.pupilMathscotRepository.findOne({ where: { id: input.id } });

        if (!pupilMathscot) throw new HttpException('Pupil Mathscot does not exist.', ErrorStatusCodeEnum._535);

        if (input.itemIds) pupilMathscot.items = input.itemIds;
        pupilMathscot.character = input.character;
        pupilMathscot.colour = input.colour;

        return await this.pupilMathscotRepository.save(pupilMathscot);
    }

    public async getPupilCurrentPupilMathscot(pupilId: string): Promise<LwpPupilMathscot> {
        return await this.pupilMathscotRepository
            .createQueryBuilder('pupilMathscot')
            .leftJoin('pupilMathscot.pupil', 'pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .leftJoin('pupilMathscot.period', 'mathscotPeriod')
            .where('pupil.id = :id', { id: pupilId })
            .andWhere('mathscotPeriod.index >= schoolPeriod.index')
            .orderBy('pupilMathscot.logCreatedAt', 'DESC')
            .getOne();
    }
}
