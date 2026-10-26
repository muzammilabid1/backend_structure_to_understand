import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { EntityManager, In, Repository } from 'typeorm';

import { StaticLwpParameter } from '../entities/parameter';
import { DefaultParameters, OperationStatus, ParameterInput } from '../model';

const JSON_PARAMETERS = new Set([
    'ADMIN_SOCIAL_LOGIN_PERMISSIONS',
    'PARENT_SOCIAL_LOGIN_PERMISSIONS',
    'MIN_PASSWORD_LENGTH',
    'WEEKDAY_PARENT_NOTIFICATION_TIME',
    'WEEKEND_PARENT_NOTIFICATION_TIME',
    'TEACHER_NOTIFICATION_TIME',
    'SITE_QUOTA',
    'CLASS_LICENCE_PRICE',
    'MIN_BAD_LOGIN_ALLOWED',
    'USER_LOCKED_ACCOUNT_TIMEOUT',
    'COMMENT_PHOTO_PERMISSIONS',
    'MAGIC_LINK_TIMEOUT'
]);

@Injectable()
export class ParameterService {
    constructor(
        @InjectRepository(StaticLwpParameter)
        private parameterRepository: Repository<StaticLwpParameter>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addParameter(input: ParameterInput, userId: string): Promise<StaticLwpParameter> {
        const param = new StaticLwpParameter();
        const { key, value } = input;

        param.key = key;
        param.value = value;

        const user = this.shallowUserService.newShallowUser(userId);

        param.logCreatedBy = user;
        param.logUpdatedBy = user;

        return this.parameterRepository.save(param);
    }

    public async getParameterByKey(key: string, manager?: EntityManager): Promise<StaticLwpParameter> {
        const parameterRepository: Repository<StaticLwpParameter> = manager
            ? manager.getRepository(StaticLwpParameter)
            : this.parameterRepository;

        const parameter = await parameterRepository.findOne({ where: { key } });
        let value = parameter?.value || DefaultParameters[key];

        // if the parameter is a JSON object, merge the default parameter vlaue with the parameter value in db
        if (JSON_PARAMETERS.has(key)) {
            try {
                const defaultParameter = JSON.parse(DefaultParameters[key]);
                const parseParameter = JSON.parse(value);

                value = JSON.stringify({
                    ...defaultParameter,
                    ...parseParameter
                });
            } catch (e) {
                throw new Error(e?.message);
            }
        }

        return { key, value } as StaticLwpParameter;
    }

    public async updateParameter(input: ParameterInput, userId: string | null): Promise<StaticLwpParameter> {
        let parameter = new StaticLwpParameter();
        const { key, value } = input;
        const param: StaticLwpParameter = await this.parameterRepository.findOne({
            where: { key: input.key },
            relations: ['logCreatedBy']
        });

        if (param) parameter = param;

        parameter['key'] = key;
        parameter['value'] = value;
        parameter['logUpdatedBy'] = userId ? this.shallowUserService.newShallowUser(userId) : null;

        return this.parameterRepository.save(parameter);
    }

    public async allParameters(): Promise<StaticLwpParameter[]> {
        const parameters = await this.parameterRepository.find();
        const allParameters: StaticLwpParameter[] = [];

        for (const key in Object.assign(DefaultParameters)) {
            const param = parameters.find((p) => p.key === key);

            if (key === 'DEFAULT_EMAIL_TEMPLATE_LAYOUT') continue;
            if (param) {
                allParameters.push(param);
            } else {
                allParameters.push({
                    key,
                    value: DefaultParameters[key],
                    logCreatedAt: moment().set('year', 1999).toDate(),
                    logUpdatedAt: moment().set('year', 1999).toDate()
                } as StaticLwpParameter);
            }
        }

        return allParameters;
    }

    public async getParameters(keys: string[]): Promise<StaticLwpParameter[]> {
        const parameters = await this.parameterRepository.find({ where: { key: In(keys) } });

        const requestedParameters: StaticLwpParameter[] = [];

        for (const key of keys) {
            const param = parameters.find((p) => p.key === key);

            if (param) {
                requestedParameters.push(param);
            } else {
                requestedParameters.push({
                    key,
                    value: DefaultParameters[key],
                    logCreatedAt: moment().set('year', 1999).toDate(),
                    logUpdatedAt: moment().set('year', 1999).toDate()
                } as StaticLwpParameter);
            }
        }

        return requestedParameters;
    }

    public async deleteParameter(key: string): Promise<OperationStatus> {
        const res = await this.parameterRepository.delete({ key });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
