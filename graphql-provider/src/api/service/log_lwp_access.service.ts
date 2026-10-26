import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { Pagination } from 'src/paginate';
import { LessThan, Repository } from 'typeorm';

import { LogLwpLogin } from '../entities/log_login';
import { LogLwpAccess } from '../entities/log_lwp_access';
import { LwpNotification } from '../entities/lwp_notification';
import { LwpMagicLink } from '../entities/magic_link';
import { LogLwpAccessInput } from '../model';

@Injectable()
export class LogLwpAccessService {
    constructor(
        @InjectRepository(LogLwpAccess)
        private logLwpAccessRepository: Repository<LogLwpAccess>,
        @InjectRepository(LogLwpLogin)
        private logLwpLoginRepository: Repository<LogLwpLogin>,
        @InjectRepository(LwpNotification)
        private lwpNotificationRepository: Repository<LwpNotification>,
        @InjectRepository(LwpMagicLink)
        private magicLinkRepository: Repository<LwpMagicLink>
    ) {}

    async addLogLwpAccess(input: LogLwpAccessInput): Promise<LogLwpAccess> {
        const logLwpAccess = new LogLwpAccess();

        logLwpAccess.mutationOrQueryName = input.mutationOrQueryName;
        logLwpAccess.page = input.page;
        logLwpAccess.info = input.info;
        logLwpAccess.userId = input.userId;

        return await this.logLwpAccessRepository.save(logLwpAccess);
    }

    async getLogLwpAccessHistory(userId: string, limit = 10, offset = 0): Promise<Pagination<LogLwpAccess>> {
        const [results, total] = await this.logLwpAccessRepository
            .createQueryBuilder('log')
            .where('log.userId = :userId', { userId })
            .orderBy('log.logCreatedAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        const accessLogs: LogLwpAccess[] = (results?.length > 0
            ? results.map((result) => ({ ...result, info: JSON.stringify(result?.info) }))
            : []) as unknown[] as LogLwpAccess[];

        return new Pagination<LogLwpAccess>({
            results: accessLogs,
            total,
            limit,
            offset
        });
    }

    public async logsCleanUp(): Promise<void> {
        const dateAfter72Hours = moment().subtract(72, 'hour').toDate();
        const dateAfter30Days = moment().subtract(30, 'day').toDate();
        const dateAfter90Days = moment().subtract(90, 'day').toDate();

        await this.logLwpAccessRepository.update({ logCreatedAt: LessThan(dateAfter72Hours) }, { info: null });

        await this.logLwpAccessRepository.delete({ logCreatedAt: LessThan(dateAfter30Days) });

        await this.logLwpLoginRepository.delete({ logCreatedAt: LessThan(dateAfter90Days) });

        //?!?!??
        await this.magicLinkRepository.delete({ logCreatedAt: LessThan(dateAfter90Days) });

        await this.lwpNotificationRepository.delete({ logCreatedAt: LessThan(dateAfter90Days) });
    }
}
