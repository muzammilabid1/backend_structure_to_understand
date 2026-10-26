import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { In, Repository } from 'typeorm';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { StaticLwpYearGroup } from '../entities/year_group';
import { ErrorStatusCodeEnum, OperationStatus, TopicDomainInput, UpdateTopicDomainInput } from '../model';

@Injectable()
export class TopicDomainService {
    constructor(
        @InjectRepository(StaticLwpTopicDomain)
        private topicDomainRepository: Repository<StaticLwpTopicDomain>,
        @InjectRepository(StaticLwpYearGroup)
        private yearGroupRepository: Repository<StaticLwpYearGroup>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addTopicDomain(input: TopicDomainInput, userId: string): Promise<StaticLwpTopicDomain> {
        const user = this.shallowUserService.newShallowUser(userId);
        const topicDomain = new StaticLwpTopicDomain();
        const { title, subjectId, yearGroupIds } = input;
        const yearGroups = await this.yearGroupRepository.find({ where: { id: In(yearGroupIds) } });
        const subject = await this.subjectRepository.findOne({ where: { id: subjectId } });

        if (yearGroups?.length === 0) throw new HttpException('Year groups does not exist.', ErrorStatusCodeEnum._535);
        if (!subject.id) throw new HttpException('Subject does not exist.', ErrorStatusCodeEnum._535);

        topicDomain.title = title;
        topicDomain.topicsAndYearGroups = [];
        topicDomain.yearGroups = yearGroups;
        topicDomain.subject = subject;
        topicDomain.logCreatedBy = user;
        topicDomain.logUpdatedBy = user;

        return this.topicDomainRepository.save(topicDomain);
    }

    public async updateTopicDomain(input: UpdateTopicDomainInput, userId: string): Promise<StaticLwpTopicDomain> {
        const user = this.shallowUserService.newShallowUser(userId);
        const topicDomain = await this.topicDomainRepository.findOne({ where: { id: input.id } });

        if (!topicDomain) throw new HttpException('Domain does not exist', ErrorStatusCodeEnum._535);
        const { title, subjectId, yearGroupIds } = input;

        const yearGroups = await this.yearGroupRepository.find({ where: { id: In(yearGroupIds) } });
        const subject = await this.subjectRepository.findOne({ where: { id: subjectId } });

        if (yearGroups?.length === 0) throw new HttpException('Year groups does not exist.', ErrorStatusCodeEnum._535);
        if (!subject.id) throw new HttpException('Subject does not exist.', ErrorStatusCodeEnum._535);

        topicDomain.title = title;
        topicDomain.yearGroups = yearGroups;
        topicDomain.subject = subject;
        topicDomain.logUpdatedBy = user;

        return this.topicDomainRepository.save(topicDomain);
    }

    public async allTopicDomains(): Promise<StaticLwpTopicDomain[]> {
        const topicDomains = await this.topicDomainRepository.find({
            relations: ['logCreatedBy', 'logUpdatedBy', 'subject'],
            order: { title: 'ASC' }
        });

        return topicDomains;
    }

    public async getTopicDomainsOfTopic(topicId: string): Promise<StaticLwpTopicDomain[]> {
        const topicDomains = await this.topicDomainRepository
            .createQueryBuilder('domain')
            .leftJoinAndSelect('domain.topicsAndYearGroups', 'topicsAndYearGroups')
            .leftJoinAndSelect('topicsAndYearGroups.topic', 'staticTopic')
            .where('staticTopic.id = :topicId', { topicId })
            .getMany();

        return topicDomains;
    }

    /**
     * Batch method for DataLoader: Get domains for multiple topic IDs
     */
    public async getTopicDomainsByTopicIds(topicIds: readonly string[]): Promise<StaticLwpTopicDomain[][]> {
        if (topicIds.length === 0) return [];

        const topicDomains = await this.topicDomainRepository
            .createQueryBuilder('domain')
            .leftJoinAndSelect('domain.topicsAndYearGroups', 'topicsAndYearGroups')
            .leftJoinAndSelect('topicsAndYearGroups.topic', 'staticTopic')
            .where('staticTopic.id IN (:...topicIds)', { topicIds })
            .getMany();

        const domainsByTopicId: Record<string, StaticLwpTopicDomain[]> = {};

        topicDomains.forEach((domain) => {
            domain.topicsAndYearGroups.forEach((tayg) => {
                const topicId = tayg.topic.id;

                if (topicIds.includes(topicId)) {
                    if (!domainsByTopicId[topicId]) {
                        domainsByTopicId[topicId] = [];
                    }

                    // deduplicate domains for the same topic
                    if (!domainsByTopicId[topicId].some((d) => d.id === domain.id)) {
                        domainsByTopicId[topicId].push(domain);
                    }
                }
            });
        });

        const result: StaticLwpTopicDomain[][] = [];

        topicIds.forEach((topicId) => {
            result.push(domainsByTopicId[topicId] || []);
        });

        return result;
    }

    public async getDomainsForDomainsOverview(
        yearGroupIds: string[],
        subjectIds: string[],
        search?: string
    ): Promise<StaticLwpTopicDomain[]> {
        let topicDomainsBase = this.topicDomainRepository.createQueryBuilder('domain').leftJoin('domain.subject', 'subject');

        if (yearGroupIds?.length > 0) {
            topicDomainsBase = topicDomainsBase
                .leftJoin('domain.yearGroups', 'yearGroup')
                .andWhere('yearGroup.id IN (:...yearGroupIds)', { yearGroupIds });
        }

        if (subjectIds?.length > 0) {
            topicDomainsBase = topicDomainsBase.andWhere('subject.id IN (:...subjectIds)', { subjectIds });
        }

        if (search) {
            topicDomainsBase = topicDomainsBase.andWhere('domain.title ILIKE :searchTerm', { searchTerm: `%${search}%` });
        }

        return await topicDomainsBase.orderBy('domain.title', 'ASC').getMany();
    }

    public async getTopicDomain(id: string): Promise<StaticLwpTopicDomain> {
        const topicDomain = await this.topicDomainRepository.findOne({ where: { id }, relations: ['logCreatedBy', 'logUpdatedBy'] });

        return topicDomain;
    }

    public async getTopicDomainsByIds(ids: string[]): Promise<StaticLwpTopicDomain[]> {
        return await this.topicDomainRepository.find({ where: { id: In(ids) } });
    }

    public async getDomainYearGroups(id: string): Promise<StaticLwpYearGroup[]> {
        const domain = await this.topicDomainRepository.findOne({ where: { id }, relations: ['yearGroups'] });

        return domain?.yearGroups?.length > 0 ? domain?.yearGroups : [];
    }

    public async getDomainSubject(id: string): Promise<StaticLwpSubject> {
        return await this.subjectRepository
            .createQueryBuilder('subject')
            .leftJoin('subject.topicDomain', 'topicDomain')
            .where('topicDomain.id = :id', { id })
            .getOne();
    }

    public async getSubjectsByDomainIds(domainIds: readonly string[]): Promise<StaticLwpSubject[]> {
        const domains = await this.topicDomainRepository.find({
            where: { id: In(domainIds as string[]) },
            relations: ['subject']
        });
        const subjectMap = new Map<string, StaticLwpSubject>();

        domains.forEach((domain) => {
            if (domain.subject) {
                subjectMap.set(domain.id, domain.subject);
            }
        });

        const result: (StaticLwpSubject | null)[] = [];

        domainIds.forEach((id) => {
            result.push(subjectMap.get(id) || null);
        });

        return result;
    }

    public async getDomainTopics(id: string): Promise<StaticLwpTopic[]> {
        const domain = await this.topicDomainRepository.findOne({
            where: { id },
            relations: ['topicsAndYearGroups', 'topicsAndYearGroups.topic']
        });

        return domain?.topicsAndYearGroups?.length > 0
            ? domain?.topicsAndYearGroups?.map((topicAndYearGroup) => topicAndYearGroup?.topic)
            : [];
    }

    public async deleteTopicDomain(id: string, userId: string): Promise<OperationStatus> {
        const res = await this.topicDomainRepository.update(id, { deletedBy: this.shallowUserService.newShallowUser(userId) });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
