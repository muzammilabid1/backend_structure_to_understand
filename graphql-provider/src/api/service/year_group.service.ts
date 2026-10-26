import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { StaticLwpYearGroup } from '../entities/year_group';
import { ErrorStatusCodeEnum, OperationStatus, UpdateYearGroupInput, YearGroupInput } from '../model';

@Injectable()
export class YearGroupService {
    constructor(
        @InjectRepository(StaticLwpYearGroup)
        private yearGroupRepository: Repository<StaticLwpYearGroup>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addYearGroup(input: YearGroupInput, userId: string): Promise<StaticLwpYearGroup> {
        const { year, shortName, mathscotThemes, hiddenFromLists, id } = input;

        const yearGroupExist = await this.yearGroupRepository.findOne({ where: { id } });

        if (yearGroupExist) throw new HttpException('Year group already exist', ErrorStatusCodeEnum._535);

        const yearGroup = new StaticLwpYearGroup();

        if (id) yearGroup.id = id;
        yearGroup.year = year;
        yearGroup.shortName = shortName;
        yearGroup.mathscotThemes = mathscotThemes;
        yearGroup.hiddenFromLists = hiddenFromLists;

        const shallowUser = this.shallowUserService.newShallowUser(userId);

        yearGroup.logCreatedBy = shallowUser;
        yearGroup.logUpdatedBy = shallowUser;

        const savedYearGroup = await this.yearGroupRepository.save(yearGroup);

        await savedYearGroup.reload();

        return savedYearGroup;
    }

    public async updateYearGroup(input: UpdateYearGroupInput, userId: string): Promise<StaticLwpYearGroup> {
        const yearGroup = await this.yearGroupRepository.findOne({ where: { id: input.id }, relations: ['logCreatedBy'] });

        if (!yearGroup) throw new HttpException('Year group does not exist', ErrorStatusCodeEnum._535);

        yearGroup.hiddenFromLists = input?.hiddenFromLists;
        if (input?.year) yearGroup.year = input?.year;
        if (input?.shortName) yearGroup.shortName = input?.shortName;
        if (input?.mathscotThemes) yearGroup.mathscotThemes = input?.mathscotThemes;
        yearGroup.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return await this.yearGroupRepository.save(yearGroup);
    }

    public async allYearGroup(showHiddenYearGroup = false): Promise<StaticLwpYearGroup[]> {
        const yearGroups = await this.yearGroupRepository.find({
            where: showHiddenYearGroup ? {} : { hiddenFromLists: false },
            relations: ['logCreatedBy', 'logUpdatedBy'],
            order: { year: 'ASC' }
        });

        return yearGroups;
    }

    public async getYearGroups(ids: string[]): Promise<StaticLwpYearGroup[]> {
        const yearGroups = await this.yearGroupRepository.findByIds(ids);

        return yearGroups?.length > 0 ? yearGroups : [];
    }

    public async getTopicYearGroups(topicId: string): Promise<StaticLwpYearGroup[]> {
        const topicYearGroups = await this.yearGroupRepository
            .createQueryBuilder('yearGroup')
            .leftJoinAndSelect('yearGroup.topicsAndDomains', 'topicsAndDomains')
            .leftJoinAndSelect('topicsAndDomains.topic', 'topic')
            .where('topic.id = :topicId', { topicId })
            .orderBy('yearGroup.id', 'ASC')
            .getMany();

        return topicYearGroups?.length > 0 ? topicYearGroups : [];
    }

    /**
     * Batch method for DataLoader: Get year groups for multiple topic IDs
     */
    public async getTopicYearGroupsByTopicIds(topicIds: readonly string[]): Promise<StaticLwpYearGroup[][]> {
        if (topicIds.length === 0) return [];

        const topicYearGroups = await this.yearGroupRepository
            .createQueryBuilder('yearGroup')
            .leftJoinAndSelect('yearGroup.topicsAndDomains', 'topicsAndDomains')
            .leftJoinAndSelect('topicsAndDomains.topic', 'topic')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .orderBy('yearGroup.id', 'ASC')
            .getMany();

        const yearGroupsByTopicId = {} as Record<string, StaticLwpYearGroup[]>;

        topicYearGroups.forEach((yearGroup) => {
            yearGroup.topicsAndDomains.forEach((tad) => {
                const topicId = tad.topic.id;

                if (topicIds.includes(topicId)) {
                    if (!yearGroupsByTopicId[topicId]) {
                        yearGroupsByTopicId[topicId] = [];
                    }

                    if (!yearGroupsByTopicId[topicId].some((yg) => yg.id === yearGroup.id)) {
                        yearGroupsByTopicId[topicId].push(yearGroup);
                    }
                }
            });
        });

        const result: StaticLwpYearGroup[][] = [];

        topicIds.forEach((topicId) => {
            result.push(yearGroupsByTopicId[topicId] || []);
        });

        return result;
    }

    public async getYearGroup(id: string): Promise<StaticLwpYearGroup> {
        const yearGroup = await this.yearGroupRepository.findOne({ where: { id }, relations: ['logCreatedBy', 'logUpdatedBy'] });

        return yearGroup;
    }

    public async getYearGroupByName(year: string): Promise<StaticLwpYearGroup> {
        const yearGroup = await this.yearGroupRepository.findOne({
            where: { year },
            relations: ['logCreatedBy', 'logUpdatedBy']
        });

        return yearGroup;
    }

    public async deleteYearGroup(id: string): Promise<OperationStatus> {
        const res = await this.yearGroupRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
