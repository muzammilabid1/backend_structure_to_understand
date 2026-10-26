import { HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createObjectCsvStringifier } from 'csv-writer';
import * as fs from 'fs';
import moment from 'moment';
import { MINIO_CONNECTION } from 'nestjs-minio';
import newrelic from 'newrelic/index';
import path from 'path';
import { Pool, QueryResult } from 'pg';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import media from 'src/config/media';
import { appConstants } from 'src/constants';
import { defaultConfig } from 'src/ormconfig';
import { TlsOptions } from 'tls';
import { Connection, Repository, SelectQueryBuilder } from 'typeorm';

import { StaticLwpDataQuery } from '../entities/static_lwp_data_query';
import { LwpUser } from '../entities/user';
import {
    ErrorStatusCodeEnum,
    LwpStaticDataQueryType,
    LwpStaticQueryCatergory,
    LwpStaticQueryStatus,
    SchoolSubjectType,
    UpdateDataQueryInput
} from '../model';
import { HelperService } from './helper.service';
import { StaticLwpPeriodService } from './static_period.service';

@Injectable()
export class LwpDataQueryService {
    constructor(
        @Inject(MINIO_CONNECTION) private readonly minioClient,
        @InjectRepository(StaticLwpDataQuery)
        private dataQueryRepository: Repository<StaticLwpDataQuery>,
        private periodService: StaticLwpPeriodService,
        private helperService: HelperService,
        private connection: Connection,
        private shallowUserService: ShallowUserService
    ) {}

    private getCSVUrlByFilename(filename: string): string {
        return `${appConstants.minioPaths.usermedia.queryData}/${filename}`;
    }

    public async updateDataQuery(input: UpdateDataQueryInput, user: LwpUser | string): Promise<StaticLwpDataQuery> {
        const adminQuery = await this.dataQueryRepository.findOne({ where: { id: input.id } });

        if (!adminQuery) throw new HttpException('Query does not exist', ErrorStatusCodeEnum._535);

        const { description, status, order } = input;

        adminQuery.description = description ? description : null;
        adminQuery.order = order;
        adminQuery.status = status;

        adminQuery.lastCsvGenerated = null;
        adminQuery.logUpdatedBy = this.shallowUserService.newShallowUser(user);

        try {
            return await this.dataQueryRepository.save(adminQuery);
        } catch (error) {
            if (error.code === '23505') {
                throw new HttpException('Duplicate entry detected', ErrorStatusCodeEnum._535);
            } else {
                throw new HttpException('Update query failed!', ErrorStatusCodeEnum._535);
            }
        }
    }

    public async allDataQueries(type: LwpStaticDataQueryType, status: LwpStaticQueryStatus): Promise<StaticLwpDataQuery[]> {
        const where = {};

        if (type) where['type'] = type;
        if (status) where['status'] = status;

        const adminQueries = await this.dataQueryRepository.find({ where, order: { order: 'ASC' } });

        for (const adminQuery of adminQueries) {
            adminQuery.csvFileLocation = adminQuery.csvFileLocation
                ? await this.helperService.getUsermediaUrl(this.getCSVUrlByFilename(adminQuery.csvFileLocation))
                : null;
        }

        return adminQueries;
    }

    public async refreshDataQuery(id: string): Promise<boolean> {
        const adminQuery = await this.dataQueryRepository.findOne({
            where: { id, status: LwpStaticQueryStatus.PUBLISHED, type: LwpStaticDataQueryType.ADMIN },
            select: ['query', 'csvFileLocation', 'lastCsvGenerated']
        });

        if (!adminQuery) throw new HttpException('Query does not exist', ErrorStatusCodeEnum._535);

        const minutes = moment.duration(moment().diff(adminQuery.lastCsvGenerated)).asMinutes();

        if (minutes < 10)
            throw new HttpException(
                'The data has been refreshed within the last 10 minutes. Please wait before trying again.',
                ErrorStatusCodeEnum._535
            );

        if (adminQuery?.csvFileLocation) {
            await this.helperService.removeFile(this.getCSVUrlByFilename(adminQuery?.csvFileLocation));
        }

        const csvFileLocation = await this.getCsvFromQuery(adminQuery?.query);

        await this.dataQueryRepository.update({ id }, { csvFileLocation, lastCsvGenerated: new Date() });

        return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async generateCsvFile(data: any[], filename: string, noDataMessage?: string): Promise<void> {
        let csvContent = '';

        if (!data?.length) {
            csvContent = noDataMessage ?? 'No data';
        } else {
            const headers = data?.length ? (this.helperService.getHeadersForCsv(data[0]) ?? []) : [];

            const csvStringifier = createObjectCsvStringifier({
                header: headers
            });

            csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);
        }

        const buffer = Buffer.from(csvContent);

        await this.minioClient.putObject(`${media.bucket_usermedia}`, this.getCSVUrlByFilename(filename), buffer);
    }

    public async generateCSVForLeaderQuery(id: string, schoolId: string, periodIndex: number): Promise<string> {
        const dataQuery = await this.dataQueryRepository.findOne({
            where: { id, type: LwpStaticDataQueryType.LEADER, status: LwpStaticQueryStatus.PUBLISHED },
            select: ['name', 'query', 'csvFileLocation', 'lastCsvGenerated', 'isAvailableForPreviousYear']
        });

        if (!dataQuery) throw new HttpException('Query does not exist', ErrorStatusCodeEnum._535);

        const currentPeriod = await this.periodService.getSchoolPeriod(schoolId);

        const isCurrentYear = +periodIndex === +currentPeriod.index;
        const isPreviousYear = +periodIndex === +currentPeriod.index - 1;

        // Only this year, plus last year for the reports marked for it. The UI enforces both, but
        // don't rely on that.
        if (!isCurrentYear && !(isPreviousYear && dataQuery.isAvailableForPreviousYear))
            throw new HttpException('This report is not available for that academic year.', ErrorStatusCodeEnum._535);

        const period = isCurrentYear ? currentPeriod : await this.periodService.getStaticPeriod(periodIndex);

        try {
            const result = await this.queryWithQueryExecutorPool(dataQuery.query, schoolId, period.index);

            const data = result?.rows;

            const currentTimeStr = new Date().toISOString();

            // The year tells this download apart from last year's.
            const filename = `${dataQuery.name} ${schoolId} ${period.shortName} (${currentTimeStr
                .substring(0, currentTimeStr.length - 5)
                .replace(/:/g, '_')}).csv`;

            await this.helperService.removeFile(this.getCSVUrlByFilename(filename));
            const noDataMessage = 'There is no available data for your school at this time.';

            await this.generateCsvFile(data, filename, noDataMessage);

            await this.dataQueryRepository.update({ id }, { csvFileLocation: 'schooldata', lastCsvGenerated: new Date() });

            return await this.helperService.getUsermediaUrl(this.getCSVUrlByFilename(filename));
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });
        }

        throw new HttpException('Query failed!', ErrorStatusCodeEnum._535);
    }

    /**
     * Returns a CSV filename for the usermedia bucket for a given query,
     * or null if the query is empty. Throws an exception if the query
     * errored.
     *
     * @param {string} query the query to run in full SQL
     * @return {(Promise<string | null>)} the filename, or null
     * @memberof AdminQueryService
     */
    public async getCsvFromQuery(query: string): Promise<string> {
        try {
            const result = await this.queryWithQueryExecutorPool(query);

            const data = result?.rows;

            if (data.length > 0) {
                const filename = `admincsv_${new Date().getTime()}.csv`;

                await this.generateCsvFile(data, filename);

                return filename;
            }

            return null;
        } catch (err) {
            newrelic.noticeError(err, { caught: true, handled: false });
        }

        throw new HttpException('Query failed!', ErrorStatusCodeEnum._535);
    }

    public async refreshPpasView(): Promise<void> {
        await this.connection.transaction(async (manager) => {
            // 10 minute session timeout
            await manager.query(`SELECT set_config('statement_timeout', '600000', true);`);

            // Don't refresh concurrently if the view is currently populated with no data
            const isPopulated: { relispopulated: boolean } = (
                await manager.query(`SELECT relispopulated FROM pg_class WHERE relname = 'lwp_view_parent_pupil_action_stats'`)
            )?.[0];

            await manager.query(
                `REFRESH MATERIALIZED VIEW${isPopulated.relispopulated ? ' CONCURRENTLY' : ''} lwp_view_parent_pupil_action_stats`
            );
        });
    }

    public async refreshAllDataQueries(): Promise<boolean> {
        const adminQueries = await this.dataQueryRepository.find({
            where: { status: LwpStaticQueryStatus.PUBLISHED, type: LwpStaticDataQueryType.ADMIN },
            order: { order: 'ASC' }
        });

        if (adminQueries?.length > 0) {
            for (const adminQuery of adminQueries) {
                const minutes = moment.duration(moment().diff(adminQuery.lastCsvGenerated)).asMinutes();

                if (minutes < 10) continue;

                try {
                    if (adminQuery?.csvFileLocation) {
                        await this.helperService.removeFile(this.getCSVUrlByFilename(adminQuery?.csvFileLocation));
                    }

                    const csvFileLocation = await this.getCsvFromQuery(adminQuery?.query);

                    await this.dataQueryRepository.update({ id: adminQuery?.id }, { csvFileLocation, lastCsvGenerated: new Date() });
                } catch (error) {
                    console.error('error in processing %s: %s', adminQuery.name, error);
                    newrelic.noticeError(error, { caught: true, handled: false, queryName: adminQuery.name });
                }
            }

            return true;
        }

        return false;
    }

    private readSqlFile = (folderName: string, filepath: string): string => {
        try {
            if (fs.existsSync(folderName)) {
                return fs.readFileSync(path.join(__dirname, `../../../../${folderName}/${filepath}`)).toString();
            } else return null;
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });

            return null;
        }
    };

    private getFilenamesFromFolder = (folderName: string): string[] => {
        try {
            if (fs.existsSync(folderName)) {
                const files = fs.readdirSync(path.join(__dirname, `../../../../${folderName}`));

                return files;
            } else return [];
        } catch (error) {
            newrelic.noticeError(error, { caught: true, handled: false });

            return [];
        }
    };

    private async runSqlQueries(folderName: string): Promise<boolean> {
        const fileNames = this.getFilenamesFromFolder(folderName);

        for (const fileName of fileNames.filter((fileName) => fileName.split('.')[fileName.split('.').length - 1] === 'sql')) {
            const sqlQuery = this.readSqlFile(folderName, fileName);

            if (sqlQuery) {
                await this.connection.transaction(async (manager) => {
                    await manager.query('SET LOCAL statement_timeout = 600000');

                    await manager.query(sqlQuery).catch((error) => {
                        newrelic.noticeError(error, { caught: true, handled: false });
                    });
                });
            }
        }

        return true;
    }

    public async runHourlySqlQueries(): Promise<boolean> {
        await this.runSqlQueries('hourly');

        return true;
    }

    public async runNightlySqlQueries(): Promise<boolean> {
        await this.runSqlQueries('nightly');

        return true;
    }

    public getSchoolLeaderBaseQueryBuilder(subjectType: SchoolSubjectType): SelectQueryBuilder<StaticLwpDataQuery> {
        const categories = [LwpStaticQueryCatergory.BOTH];

        switch (subjectType) {
            case SchoolSubjectType.BOTH:
                categories.push(LwpStaticQueryCatergory.READING, LwpStaticQueryCatergory.TOPICS);
                break;

            case SchoolSubjectType.READING:
                categories.push(LwpStaticQueryCatergory.READING);
                break;

            case SchoolSubjectType.TOPIC:
                categories.push(LwpStaticQueryCatergory.TOPICS);
                break;
        }

        return this.dataQueryRepository
            .createQueryBuilder('data_query')
            .where('data_query.type = :type', { type: LwpStaticDataQueryType.LEADER })
            .andWhere('data_query.category IN (:...categories)', { categories })
            .andWhere('data_query.status = :status', { status: LwpStaticQueryStatus.PUBLISHED })
            .orderBy('data_query.order', 'ASC');
    }

    /**
     * Runs an SQL query with a query executor pool newly-created for it,
     * optionally with a school ID scope.
     *
     * @private
     * @param {string} query the query to run
     * @param {string} [schoolId] optionally, a school ID to specify the set_config scope to
     * @param {number} [periodIndex] optionally, an academic year to scope the query to. Queries read it back
     * with `current_setting('lwp.period_index', true)`, falling back to the school's current year when unset.
     * @return {Promise<QueryResult>} the result of the query - or, the last result from the queries, if multiple are in the string
     * @memberof LwpDataQueryService
     */
    private async queryWithQueryExecutorPool(query: string, schoolId?: string | number, periodIndex?: number): Promise<QueryResult> {
        const client = new Pool({
            host: process.env.PGHOST,
            user: process.env.PGAPPUSER,
            database: process.env.PGDATABASE,
            password: process.env.PGAPPPASSWORD,
            port: parseInt(process.env.PGPORT, 10),
            ssl: defaultConfig.ssl
                ? Object.fromEntries(Object.entries(defaultConfig.ssl as TlsOptions).filter(([k]) => k !== 'pskCallback'))
                : false
        });

        // Query timeout errors are thrown asynchronously from the postgres driver level,
        // so we need to add an error listener to the pool client in order to catch them
        // (otherwise an uncaught exception will be thrown and our process will crash).
        client.on('error', (err) => {
            console.error('Error executing data query: ', err);
        });

        try {
            await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');
            // N.B. Admin queries have a 15m timeout; school queries have a 5 minute timeout.
            // FIXME: These queries are becoming a scaling problem as our volume of data grows.
            // We really should try to identify and optimise the worst of them before long.
            await client.query(`SELECT set_config('statement_timeout', $1, false);`, [(schoolId ? 15 : 5 * 60) * 1000]);
            if (schoolId) await client.query(`SELECT set_config('lwp.school_id', $1, false)`, [schoolId]);

            if (periodIndex) await client.query(`SELECT set_config('lwp.period_index', $1, false)`, [String(periodIndex)]);

            const result = await client.query(query);

            if (Array.isArray(result)) {
                return result[result.length - 1];
            }

            return result;
        } finally {
            await client.end();
        }
    }
}
