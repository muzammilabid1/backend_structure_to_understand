import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { StaticLwpYearGroup } from '../entities/year_group';

export type DomainAndYearGroup = {
    domain: StaticLwpTopicDomain;
    yearGroup: StaticLwpYearGroup;
};
