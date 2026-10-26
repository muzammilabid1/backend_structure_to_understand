import { HttpException, Injectable } from '@nestjs/common';
import { Context } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';
import { UAParser } from 'ua-parser-js';

import { StaticLwpActivity } from '../entities/activity';
import { LwpDemoActivityFeedback } from '../entities/demo_activity_feedback';
import { DemoActivityFeedbackInput, ErrorStatusCodeEnum, OperationStatus } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class DemoActivityFeedbackService {
    constructor(
        @InjectRepository(LwpDemoActivityFeedback)
        private demoActivityFeedbackRepository: Repository<LwpDemoActivityFeedback>,
        @InjectRepository(StaticLwpActivity)
        private staticActivityRepository: Repository<StaticLwpActivity>,
        private helperService: HelperService,
        private shallowUserService: ShallowUserService
    ) {}

    public async saveDemoActivityFeedback(
        input: DemoActivityFeedbackInput,
        file: FileUpload[],
        @Context() context
    ): Promise<LwpDemoActivityFeedback> {
        const staticActivity = await this.staticActivityRepository.findOne({ where: { id: input.staticActivityId } });

        if (!staticActivity) throw new HttpException('Static activity not found.', ErrorStatusCodeEnum._535);

        const demoActivityFeedback = new LwpDemoActivityFeedback();

        const parser = new UAParser(context?.headers?.['user-agent'] ?? this.helperService.extractUserAgentFromContext(context));
        const browser = parser.getBrowser().name;
        const ipAddress = context?.req?.ip ?? 'unknown';

        demoActivityFeedback.browser = browser;
        demoActivityFeedback.ipAddress = ipAddress;
        demoActivityFeedback.activity = staticActivity;
        demoActivityFeedback.sharingAllowed = input.sharingAllowed;

        if (input.rating) demoActivityFeedback.rating = input.rating;
        if (input.parentComment) demoActivityFeedback.parentComment = input.parentComment;
        if (input.pupilComment) demoActivityFeedback.pupilComment = input.pupilComment;
        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);
            const filename = `${this.helperService.generateId()}_${fileUploads[0].filename}`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.usermedia.uploadedImages}/${filename}`, fileUploads[0]);
            demoActivityFeedback.photo = filename;
        }

        return await this.demoActivityFeedbackRepository.save(demoActivityFeedback);
    }

    public async deleteDemoFeedback(id: string, deletedById: string): Promise<OperationStatus> {
        const pupilActivityFeedback = await this.demoActivityFeedbackRepository.findOne({ where: { id } });

        if (!pupilActivityFeedback) throw new HttpException('Feedback does not exist', ErrorStatusCodeEnum._535);

        const res = await this.demoActivityFeedbackRepository.update(id, {
            deletedBy: this.shallowUserService.newShallowUser(deletedById)
        });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async saveDemoActivityPhotoRating(id: string, photoRating: number): Promise<LwpDemoActivityFeedback> {
        const demoActivityFeedback = await this.demoActivityFeedbackRepository.findOne({ where: { id } });

        if (!demoActivityFeedback) throw new HttpException('Demo activity not found.', ErrorStatusCodeEnum._535);

        demoActivityFeedback.photoRating = photoRating;

        return await this.demoActivityFeedbackRepository.save(demoActivityFeedback);
    }
}
