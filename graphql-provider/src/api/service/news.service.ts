import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { UserType } from 'src/auth/types/UserType';
import { Repository } from 'typeorm';

import { StaticLwpNews } from '../entities/news';
import { LwpUser } from '../entities/user';
import { ErrorStatusCodeEnum, NewsInput, OperationStatus, UpdateNewsInput } from '../model';

@Injectable()
export class NewsService {
    constructor(
        @InjectRepository(StaticLwpNews)
        private newsRepository: Repository<StaticLwpNews>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addNews(input: NewsInput, userId: string): Promise<StaticLwpNews> {
        const news = new StaticLwpNews();
        const { title, description, forTeacher, forSchoolLeader, editAsHtml } = input;

        news.title = title;
        news.description = description;
        news.forTeacher = forTeacher;
        news.editAsHtml = editAsHtml;
        news.forSchoolLeader = forSchoolLeader;

        const user = this.shallowUserService.newShallowUser(userId);

        news.logCreatedBy = user;
        news.logUpdatedBy = user;

        return this.newsRepository.save(news);
    }

    public async updateNews(input: UpdateNewsInput, userId: string): Promise<StaticLwpNews> {
        const news = await this.newsRepository.findOne({ where: { id: input.id }, relations: ['logCreatedBy'] });

        if (!news) throw new HttpException('FAQ does not exist', ErrorStatusCodeEnum._535);
        const { title, description, forTeacher, forSchoolLeader, editAsHtml } = input;

        news.title = title;
        news.description = description;
        news.forTeacher = forTeacher;
        news.editAsHtml = editAsHtml;
        news.forSchoolLeader = forSchoolLeader;
        news.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return this.newsRepository.save(news);
    }

    public async allNews(userId: string): Promise<StaticLwpNews[]> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        const condition = user?.type === UserType.ADMIN ? {} : user?.isSchoolLeader ? { forSchoolLeader: true } : { forTeacher: true };

        const news = await this.newsRepository.find({
            relations: ['logCreatedBy', 'logUpdatedBy'],
            where: condition,
            order: { logCreatedAt: 'DESC' }
        });

        return news;
    }

    public async deleteNews(id: string): Promise<OperationStatus> {
        const res = await this.newsRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
