import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DomainAndYearGroup } from '../dtos/DomainAndYearGroup';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from '../entities/static_topic_domain_year_group';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { LwpUser } from '../entities/user';
import { StaticLwpYearGroup } from '../entities/year_group';
import { DomainAndYearGroupInput } from '../model';

@Injectable()
export class StaticLwpTopicDomainYearGroupService {
    constructor(
        @InjectRepository(StaticLwpTopicDomainYearGroup)
        private lwpTopicDomainYearGroupRepository: Repository<StaticLwpTopicDomainYearGroup>,
        @InjectRepository(StaticLwpTopicDomain)
        private lwpTopicDomainRepository: Repository<StaticLwpTopicDomain>,
        @InjectRepository(StaticLwpYearGroup)
        private lwpYearGroupRepository: Repository<StaticLwpYearGroup>
    ) {}

    public async getDomainsAndYearGroups(input: DomainAndYearGroupInput[]): Promise<DomainAndYearGroup[]> {
        const domainAndYearGroups: DomainAndYearGroup[] = [];
        const domains = await this.lwpTopicDomainRepository.find({
            where: { id: In(input.map((domainAndYearGroupIds) => domainAndYearGroupIds?.domainId)) }
        });
        const yearGroups = await this.lwpYearGroupRepository.find({
            where: { id: In(input.map((domainAndYearGroupIds) => domainAndYearGroupIds?.yearGroupId)) }
        });

        for (const domainAndYearGroupId of input) {
            const domain = domains.find((domain) => domain.id === domainAndYearGroupId.domainId);
            const yearGroup = yearGroups.find((yearGroup) => yearGroup.id === domainAndYearGroupId.yearGroupId);

            if (domain && yearGroup) {
                domainAndYearGroups.push({
                    domain,
                    yearGroup
                });
            }
        }

        return domainAndYearGroups;
    }

    public async getDomainsAndYearGroupsForTopic(id: string): Promise<StaticLwpTopicDomainYearGroup[]> {
        return await this.lwpTopicDomainYearGroupRepository.find({
            where: { topic: id }
        });
    }

    public async addDomainAndYearGroupInTopic(topic: StaticLwpTopic, input: DomainAndYearGroup[], user: LwpUser): Promise<void> {
        const topicWithDomainAndYearGroups: StaticLwpTopicDomainYearGroup[] = [];

        for (const domainAndYearGroup of input) {
            const topicWithDomainAndYearGroup = new StaticLwpTopicDomainYearGroup();

            topicWithDomainAndYearGroup.topic = topic;
            topicWithDomainAndYearGroup.domain = domainAndYearGroup.domain;
            topicWithDomainAndYearGroup.yearGroup = domainAndYearGroup.yearGroup;
            topicWithDomainAndYearGroup.logCreatedBy = user;
            topicWithDomainAndYearGroup.logUpdatedBy = user;

            topicWithDomainAndYearGroups.push(topicWithDomainAndYearGroup);
        }

        await this.lwpTopicDomainYearGroupRepository.save(topicWithDomainAndYearGroups);
    }

    public async updateDomainAndYearGroupInTopic(topic: StaticLwpTopic, input: DomainAndYearGroupInput[], user: LwpUser): Promise<void> {
        const topicWithDomainAndYearGroupsInDb = await this.lwpTopicDomainYearGroupRepository.find({
            where: { topic: topic.id },
            relations: ['domain', 'yearGroup']
        });

        const inputAsStringSet = new Set(input.map((item) => `${item.domainId}_${item.yearGroupId}`));

        const topicWithDomainAndYearGroupsToRemove = topicWithDomainAndYearGroupsInDb.filter(
            (association) => !inputAsStringSet.has(`${association.domain.id}_${association.yearGroup.id}`)
        );

        if (topicWithDomainAndYearGroupsToRemove.length) {
            await this.lwpTopicDomainYearGroupRepository.remove(topicWithDomainAndYearGroupsToRemove);
        }

        const topicWithDomainAndYearGroupsToAddOrUpdate = input.filter(
            (item) =>
                !topicWithDomainAndYearGroupsInDb.some(
                    (existing) => existing.domain.id === item.domainId && existing.yearGroup.id === item.yearGroupId
                )
        );

        const topicWithDomainAndYearGroups = topicWithDomainAndYearGroupsToAddOrUpdate.map((item) => {
            const topicWithDomainAndYearGroup = new StaticLwpTopicDomainYearGroup();

            topicWithDomainAndYearGroup.topic = topic;
            topicWithDomainAndYearGroup.domain = { id: item.domainId } as StaticLwpTopicDomain;
            topicWithDomainAndYearGroup.yearGroup = { id: item.yearGroupId } as StaticLwpYearGroup;
            topicWithDomainAndYearGroup.logCreatedBy = user;
            topicWithDomainAndYearGroup.logUpdatedBy = user;

            return topicWithDomainAndYearGroup;
        });

        await this.lwpTopicDomainYearGroupRepository.save(topicWithDomainAndYearGroups);
    }

    public async getTopicOfStaticTopicDomainYearGroup(id: string): Promise<StaticLwpTopic> {
        const staticTopicDomainYearGroup = await this.lwpTopicDomainYearGroupRepository.findOne({
            where: { id },
            relations: ['topic']
        });

        return staticTopicDomainYearGroup?.topic;
    }

    public async getDomainOfStaticTopicDomainYearGroup(id: string): Promise<StaticLwpTopicDomain> {
        const staticTopicDomainYearGroup = await this.lwpTopicDomainYearGroupRepository.findOne({
            where: { id },
            relations: ['domain']
        });

        return staticTopicDomainYearGroup?.domain;
    }

    public async getYearGroupOfStaticTopicDomainYearGroup(id: string): Promise<StaticLwpYearGroup> {
        const staticTopicDomainYearGroup = await this.lwpTopicDomainYearGroupRepository.findOne({
            where: { id },
            relations: ['yearGroup']
        });

        return staticTopicDomainYearGroup?.yearGroup;
    }
}
