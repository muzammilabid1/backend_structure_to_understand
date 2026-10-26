import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { StaticLwpTopicTag } from '../entities/static_lwp_topic_tag';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpUser } from '../entities/user';
import { ErrorStatusCodeEnum, LwpTopicTagInput, LwpTopicTagUpdateInput, OperationStatus } from '../model';
import { StaticLwpTagService } from './static_lwp_tag.service';

@Injectable()
export class StaticLwpTopicTagService extends StaticLwpTagService<StaticLwpTopicTag, LwpTopicTagInput, LwpTopicTagUpdateInput> {
    constructor(
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        @InjectRepository(StaticLwpTopicTag)
        private staticLwpTopicTagRepository: Repository<StaticLwpTopicTag>
    ) {
        super();
    }

    public async getTagsByIds(ids: string[]): Promise<StaticLwpTopicTag[]> {
        return await this.staticLwpTopicTagRepository.findByIds(ids);
    }

    public async addNewTag(input: LwpTopicTagInput, user: LwpUser): Promise<StaticLwpTopicTag> {
        const topics = await this.topicRepository.findByIds(input?.topicIds);

        const tag = new StaticLwpTopicTag();

        tag.name = input.name;
        tag.color = input.color;
        tag.logCreatedBy = user;
        tag.logUpdatedBy = user;
        tag.topics = topics;

        return await this.staticLwpTopicTagRepository.save(tag);
    }

    public async getTagsForAdmin(): Promise<StaticLwpTopicTag[]> {
        return await this.staticLwpTopicTagRepository.createQueryBuilder('tags').orderBy('tags.name', 'ASC').getMany();
    }

    public async updateTag(input: LwpTopicTagUpdateInput, updatedBy: LwpUser): Promise<StaticLwpTopicTag> {
        const tag = await this.staticLwpTopicTagRepository.findOne({ where: { id: input.id } });

        if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);

        tag.name = input.name;
        tag.color = input.color;
        tag.topics = await this.topicRepository.findByIds(input?.topicIds);
        tag.logUpdatedBy = updatedBy;

        return await this.staticLwpTopicTagRepository.save(tag);
    }

    public async deleteTag(id: string, deletedBy: LwpUser): Promise<OperationStatus> {
        const tag = await this.staticLwpTopicTagRepository.findOne({ where: { id } });

        if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);

        const res = await this.staticLwpTopicTagRepository.update({ id }, { deletedBy });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getTopicTags(topicId: string): Promise<StaticLwpTopicTag[]> {
        return await this.staticLwpTopicTagRepository
            .createQueryBuilder('tag')
            .leftJoinAndSelect('tag.topics', 'topics')
            .where('topics.id = :topicId', { topicId })
            .orderBy('tag.id', 'ASC')
            .getMany();
    }

    /**
     * Batch method for DataLoader: Get tags for multiple topic IDs
     */
    public async getTopicTagsByTopicIds(topicIds: readonly string[]): Promise<StaticLwpTopicTag[][]> {
        if (topicIds.length === 0) return [];

        const tags = await this.staticLwpTopicTagRepository
            .createQueryBuilder('tag')
            .leftJoinAndSelect('tag.topics', 'topic')
            .where('topic.id IN (:...topicIds)', { topicIds })
            .orderBy('tag.id', 'ASC')
            .getMany();

        const tagsByTopicId: Record<string, StaticLwpTopicTag[]> = {};

        tags.forEach((tag) => {
            tag.topics.forEach((topic) => {
                const topicId = topic.id;

                if (topicIds.includes(topicId)) {
                    if (!tagsByTopicId[topicId]) {
                        tagsByTopicId[topicId] = [];
                    }

                    tagsByTopicId[topicId].push(tag);
                }
            });
        });

        const result: StaticLwpTopicTag[][] = [];

        topicIds.forEach((topicId) => {
            result.push(tagsByTopicId[topicId] || []);
        });

        return result;
    }

    private getTagTopicsQuery(tagId: string): SelectQueryBuilder<StaticLwpTopic> {
        return this.topicRepository
            .createQueryBuilder('topic')
            .leftJoin('topic.tags', 'tags')
            .where('tags.id = :id', { id: tagId })
            .orderBy('topic.teacherTopicName', 'ASC')
            .addOrderBy('topic.parentTopicName', 'ASC');
    }

    public async getTagTopics(tagId: string): Promise<StaticLwpTopic[]> {
        const query = this.getTagTopicsQuery(tagId);
        const tagTopics = await query.getMany();

        return tagTopics;
    }

    public async getTagTopicsCount(tagId: string): Promise<number> {
        const query = this.getTagTopicsQuery(tagId);
        const tagTopicsCount = await query.getCount();

        return tagTopicsCount;
    }
}
