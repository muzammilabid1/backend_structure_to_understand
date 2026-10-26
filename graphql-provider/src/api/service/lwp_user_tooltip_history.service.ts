import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LwpUserTooltipHistory } from '../entities/lwp_user_tooltip_history';
import { StaticLwpFeatureTooltip } from '../entities/static_lwp_feature_tooltip';

@Injectable()
export class LwpUserTooltipHistoryService {
    constructor(
        @InjectRepository(LwpUserTooltipHistory)
        private userTooltipHistoryRepository: Repository<LwpUserTooltipHistory>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addUserTooltipHistory(tooltipId: string, userId: string): Promise<LwpUserTooltipHistory> {
        const user = this.shallowUserService.newShallowUser(userId);

        const userTooltip = new LwpUserTooltipHistory();

        userTooltip.user = user;
        userTooltip.featureTooltip = { id: tooltipId } as StaticLwpFeatureTooltip;

        userTooltip.logCreatedBy = user;
        userTooltip.logUpdatedBy = user;

        return await this.userTooltipHistoryRepository.save(userTooltip);
    }
}
