import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DefaultNamingStrategy, Repository, SelectQueryBuilder } from 'typeorm';

import { LogLwpEntityStatusChange, StatusChangeEntity } from '../entities/log_lwp_entity_status_change';

@Injectable()
export class LogLwpEntityStatusChangeService {
    constructor(
        @InjectRepository(LogLwpEntityStatusChange)
        private entityStatusChangeRepository: Repository<LogLwpEntityStatusChange>
    ) {}

    async getStatusChangeLogs(entity: StatusChangeEntity): Promise<LogLwpEntityStatusChange[]> {
        return (await this.getBaseQuery(entity)).getMany();
    }

    async getLastStatusChange(entity: StatusChangeEntity): Promise<LogLwpEntityStatusChange> {
        return (await this.getBaseQuery(entity)).limit(1).getOne();
    }

    async getStatusChange(id: string, type: string): Promise<LogLwpEntityStatusChange[]> {
        const statusChange = await this.entityStatusChangeRepository
            .createQueryBuilder('log')
            .select()
            .where('log.entityId =:id AND log.entityType =:type ', { id, type })
            .orderBy('log.logCreatedAt', 'ASC')
            .getMany();

        return statusChange;
    }

    private async getBaseQuery(entity: StatusChangeEntity): Promise<SelectQueryBuilder<LogLwpEntityStatusChange>> {
        return await this.entityStatusChangeRepository
            .createQueryBuilder('log')
            .select()
            .where({ entityId: entity.id, entityType: new DefaultNamingStrategy().tableName(entity.constructor.name, null) })
            .orderBy('log.logCreatedAt', 'DESC');
    }
}
