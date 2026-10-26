import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagination } from 'src/paginate';
import { Brackets, MoreThanOrEqual, Repository, SelectQueryBuilder } from 'typeorm';

import { LogLwpLogin } from '../entities/log_login';
import { LogLoginInput, LogResults } from '../model';

@Injectable()
export class LogLoginService {
    constructor(
        @InjectRepository(LogLwpLogin)
        private logLoginRepository: Repository<LogLwpLogin>
    ) {}

    async addLoginLog(logLoginInput: LogLoginInput): Promise<LogLwpLogin> {
        const { userEmail, userPhoneNumber, result, browser, ipAddress, userAgent, userType, loginType } = logLoginInput;
        const log = new LogLwpLogin();

        log.userEmail = userEmail;
        log.userPhoneNumber = userPhoneNumber;
        log.result = result;
        log.browser = browser;
        log.userAgent = userAgent;
        log.ipAddress = ipAddress;
        log.userType = userType;
        log.loginType = loginType;

        return this.logLoginRepository.save(log);
    }

    /**
     * countFailedLogins counts the number of failed logins in the last ten minutes.
     *
     * @param {string} emailOrPhone an email to check the failed login count for
     * @return {Promise<number>} the number of failed logins
     * @memberof LogLoginService
     */
    async countFailedLogins(emailOrPhone: string): Promise<number> {
        return await this.getLoginsForEmailOrPhone(emailOrPhone).getCount();
    }

    /**
     * nextLoginAllowedAt represents the time at which the next login will be permitted.
     *
     * @param {string} emailOrPhone the email or phone for the user who's attempting to log in
     * @return {Promise<Date>} when they will next be allowed to log in
     * @memberof LogLoginService
     */
    async nextLoginAllowedAt(emailOrPhone: string): Promise<Date> {
        return (
            await this.getLoginsForEmailOrPhone(emailOrPhone)
                .select(`lll."logCreatedAt" + interval '10 minutes'`, 'next_login_time')
                .orderBy('lll.logCreatedAt', 'ASC')
                .getRawOne<{ next_login_time: Date }>()
        ).next_login_time;
    }

    /**
     * Sets up a query builder for the logins in the last 10 minutes for this email or phone.
     *
     * @private
     * @param {string} emailOrPhone the email or phone for the user who's attempting to log in
     * @return {SelectQueryBuilder<LogLwpLogin>} the query builder
     * @memberof LogLoginService
     */
    private getLoginsForEmailOrPhone(emailOrPhone: string): SelectQueryBuilder<LogLwpLogin> {
        const tenMinsAgo = new Date();

        tenMinsAgo.setMinutes(tenMinsAgo.getMinutes() - 10);

        return this.logLoginRepository
            .createQueryBuilder('lll')
            .where(
                new Brackets((qb) => {
                    return qb.where({ userEmail: emailOrPhone }).orWhere({ userPhoneNumber: emailOrPhone });
                })
            )
            .andWhere({ result: LogResults.WRONGPASSWORD, logCreatedAt: MoreThanOrEqual(tenMinsAgo) });
    }

    async getLogLwpLoginHistory(userEmail: string, limit = 10, offset = 0): Promise<Pagination<LogLwpLogin>> {
        const [results, total] = await this.logLoginRepository
            .createQueryBuilder('log')
            .where('log.userEmail = :userEmail', { userEmail })
            .orderBy('log.logCreatedAt', 'DESC')
            .skip(offset)
            .take(limit)
            .getManyAndCount();

        return new Pagination<LogLwpLogin>({
            results,
            total,
            limit,
            offset
        });
    }
}
