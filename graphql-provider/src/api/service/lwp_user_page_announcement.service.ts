import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LwpUserPageAnnouncement } from '../entities/lwp_user_page_announcement';
import { StaticLwpPageAnnouncement } from '../entities/static_lwp_page_announcement';
import { ErrorStatusCodeEnum } from '../model';

@Injectable()
export class LwpUserPageAnnouncementService {
    constructor(
        @InjectRepository(LwpUserPageAnnouncement)
        private pageAnnouncementRepository: Repository<LwpUserPageAnnouncement>,
        @InjectRepository(StaticLwpPageAnnouncement)
        private staticPageAnnouncementRepository: Repository<StaticLwpPageAnnouncement>,
        private shallowUserService: ShallowUserService
    ) {}

    public async seenPageAnnouncement(id: string, userId: string): Promise<boolean> {
        const staticPageAnnouncement = await this.staticPageAnnouncementRepository.findOne({ where: { id }, select: ['id'] });

        if (!staticPageAnnouncement) throw new HttpException('Page announcement does not exist', ErrorStatusCodeEnum._535);
        const user = this.shallowUserService.newShallowUser(userId);

        await this.pageAnnouncementRepository.upsert(
            {
                pageAnnouncement: staticPageAnnouncement,
                user,
                seenAt: new Date(),
                logCreatedBy: user,
                logUpdatedBy: user
            },
            ['pageAnnouncement', 'user']
        );

        return true;
    }
}
