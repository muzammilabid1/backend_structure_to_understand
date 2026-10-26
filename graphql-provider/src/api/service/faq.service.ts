import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { StaticLwpFAQ } from '../entities/faq';
import { ErrorStatusCodeEnum, FAQInput, OperationStatus, UpdateFAQInput } from '../model';

@Injectable()
export class FAQService {
    constructor(
        @InjectRepository(StaticLwpFAQ)
        private faqRepository: Repository<StaticLwpFAQ>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addFAQ(input: FAQInput, userId: string): Promise<StaticLwpFAQ> {
        const user = this.shallowUserService.newShallowUser(userId);
        const faq = new StaticLwpFAQ();
        const { question, answer, forParent, forTeacher, forSchoolLeader, forBeforeLogin, editAsHtml } = input;

        faq.question = question;
        faq.answer = answer;
        faq.editAsHtml = editAsHtml;
        faq.forParent = forParent;
        faq.forTeacher = forTeacher;
        faq.forBeforeLogin = forBeforeLogin;
        faq.forSchoolLeader = forSchoolLeader;
        faq.logCreatedBy = user;
        faq.logUpdatedBy = user;

        return this.faqRepository.save(faq);
    }

    public async updateFAQ(input: UpdateFAQInput, userId: string): Promise<StaticLwpFAQ> {
        const user = this.shallowUserService.newShallowUser(userId);

        const faq = await this.faqRepository.findOne({ where: { id: input.id }, relations: ['logCreatedBy'] });

        if (!faq) throw new HttpException('FAQ does not exist', ErrorStatusCodeEnum._535);
        const { question, answer, forParent, forTeacher, forSchoolLeader, forBeforeLogin, editAsHtml } = input;

        faq.question = question;
        faq.answer = answer;
        faq.logUpdatedBy = user;
        faq.forParent = forParent;
        faq.editAsHtml = editAsHtml;
        faq.forTeacher = forTeacher;
        faq.forSchoolLeader = forSchoolLeader;
        faq.forBeforeLogin = forBeforeLogin;

        return this.faqRepository.save(faq);
    }

    public async allFAQs(): Promise<StaticLwpFAQ[]> {
        const FAQs = await this.faqRepository.find({ relations: ['logCreatedBy', 'logUpdatedBy'] });

        return FAQs;
    }

    public async getTeacherFAQs(forSchoolLeader = false): Promise<StaticLwpFAQ[]> {
        const FAQs = await this.faqRepository.find({
            where: [{ forTeacher: true }, { forSchoolLeader: forSchoolLeader, forParent: false }]
        });

        return FAQs;
    }

    public async getParentFAQs(): Promise<StaticLwpFAQ[]> {
        const FAQs = await this.faqRepository.find({
            where: { forParent: true }
        });

        return FAQs;
    }

    public async getBeforeLoginFAQs(): Promise<StaticLwpFAQ[]> {
        const FAQs = await this.faqRepository.find({
            where: { forBeforeLogin: true }
        });

        return FAQs;
    }

    public async deleteFAQ(id: string): Promise<OperationStatus> {
        const res = await this.faqRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
