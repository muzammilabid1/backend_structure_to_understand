/* eslint-disable @typescript-eslint/no-misused-promises */
import crypto from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import moment from 'moment';
import { ConfigService } from 'nestjs-config';
import newrelic from 'newrelic/index';
import { WondeReImportFrequency } from 'src/api/model';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { HelperService } from 'src/api/service/helper.service';
import { LogLwpAccessService } from 'src/api/service/log_lwp_access.service';
import { LwpDataQueryService } from 'src/api/service/lwp_data_query.service';
import { LwpFeedbackReplyService } from 'src/api/service/lwp_feedback_reply.service';
import { LwpNotificationService } from 'src/api/service/lwp_notification.service';
import { LwpPupilFeedbackService } from 'src/api/service/lwp_pupil_feedback.service';
import { ParameterService } from 'src/api/service/parameter.service';
import { PupilTopicService } from 'src/api/service/pupil_topic.service';
import { SchoolService } from 'src/api/service/school.service';
import { SchoolClassService } from 'src/api/service/school_class.service';
import { StaticLwpInterstitialService } from 'src/api/service/static_lwp_interstitial.service';
import { TrophyService } from 'src/api/service/trophy.service';

@Injectable()
export class EmailTask {
    constructor(
        private parameterService: ParameterService,
        private helperService: HelperService,
        private trophyService: TrophyService,
        private schedulerRegistry: SchedulerRegistry,
        private pupilTopicService: PupilTopicService,
        private classTopicService: ClassTopicService,
        private schoolClassService: SchoolClassService,
        private schoolService: SchoolService,
        private logLwpAccessService: LogLwpAccessService,
        private dataQueryService: LwpDataQueryService,
        private staticLwpInterstitialService: StaticLwpInterstitialService,
        private lwpNotificationService: LwpNotificationService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private feedbackRepliesService: LwpFeedbackReplyService,
        private readonly configService: ConfigService
    ) {}

    CRONJOB_RUNNING_PARAM = 'RUNNING_CRONJOB';

    async onModuleInit(): Promise<void> {
        Logger.verbose('Initialising email task module...');
        if (process.env.ALLOW_SCHEDULING === 'true') {
            await this.setCronRunningSiteParam(false);

            Logger.verbose('Scheduling cronjobs...');
            this.runRegularCronJobs();
            this.runDailyCronJobs();
        }

        Logger.verbose('Initialised email task module');
    }

    // Log the current promise error and proceed with next instead of stopping the whole block
    private async proceedWithNextOnError<T>(p: Promise<T>, which: string): Promise<T | void> {
        const startAt = new Date();

        newrelic.recordCustomEvent('startCronTask', { taskName: which });

        try {
            await p;
            newrelic.recordCustomEvent('finishCronTask', { taskName: which, status: 'SUCCESS' });
            console.log(
                `Status - Success: ${which}, Start at: ${moment(startAt).format('DD/MM/YYYY HH:mm:ss')}, End at: ${moment().format(
                    'DD/MM/YYYY HH:mm:ss'
                )}.`
            );
        } catch (e) {
            newrelic.recordCustomEvent('finishCronTask', { taskName: which, status: 'FAILURE', error: e });
            console.log(
                `Status - Failed: ${which}, Start at: ${moment(startAt).format('DD/MM/YYYY HH:mm:ss')}, End at: ${moment().format(
                    'DD/MM/YYYY HH:mm:ss'
                )}.`
            );
            newrelic.noticeError(e, { caught: true, handled: false });
            console.log('ERROR hit when processing ' + which);
            console.log(e);
        }
    }

    public async teacherTopicsToBeReleasedTomorrow(): Promise<void> {
        await this.classTopicService.teacherTopicsToBeReleasedTomorrow();
    }

    public async teacherTopicsToBeReleasedNextWeek(): Promise<void> {
        await this.classTopicService.teacherTopicsToBeReleasedNextWeek();
    }

    public async teacherMoneySkillsFirstTopicScheduled(): Promise<void> {
        await this.classTopicService.teacherMoneySkillsFirstTopicScheduled();
    }

    public async sendTeacherReadingTopicEnd(): Promise<void> {
        await this.classTopicService.sendTeacherReadingTopicEnd();
    }

    public async topicReminderAfter7Days(): Promise<void> {
        await this.pupilTopicService.topicReminderAfter7Days();
    }

    public async readingTopicReminders(): Promise<void> {
        await this.pupilTopicService.readingTopicReminders();
    }

    public async releasePupilTopics(): Promise<void> {
        const date = moment().toDate();

        await this.helperService.releasePupilTopicsHelper(date);
    }

    public async sendReleasedPupilTopicNotifications(): Promise<void> {
        await this.pupilTopicService.sendReleasedPupilTopicNotifications();
    }

    public async notifyNewRelicWhenPupilInMultipleClasses(): Promise<void> {
        await this.schoolClassService.notifyNewRelicWhenPupilInMultipleClasses();
    }

    public async updateNoLinkedParentStatusOfPupils(): Promise<void> {
        await this.schoolClassService.updateNoLinkedParentStatusOfPupils();
    }

    public async sendTrophyMailToPupil(): Promise<void> {
        await this.trophyService.sendTrophyMailToPupil();
    }

    public async sendTrophyMailToTeacher(): Promise<void> {
        await this.schoolClassService.sendTrophyMailToTeacher();
    }

    public async sendTrophyMailToSchoolLeader(): Promise<void> {
        await this.schoolClassService.sendTrophyMailToSchoolLeader();
    }

    public async logsCleanUp(): Promise<void> {
        await this.logLwpAccessService.logsCleanUp();
    }

    public hasNumber(str: string): void {
        /\d/.test(str);
    }

    public async createReadingTopics(): Promise<void> {
        await this.classTopicService.createReadingTopics();
    }

    public async trophiesAssignedToPupils(): Promise<void> {
        await this.trophyService.trophiesAssignedToPupils();
    }

    public async updateAllGroupAcrossClassesLicenseDetails(): Promise<void> {
        await this.schoolClassService.updateAllGroupAcrossClassesLicenseDetails();
    }

    public async reimportSchoolsWondeData(): Promise<void> {
        const wondeReImportParameter = await this.parameterService.getParameterByKey('WONDE_REIMPORT_FREQUENCY');

        if (wondeReImportParameter?.value === WondeReImportFrequency.DAILY) {
            await this.schoolService.reimportSchoolsWondeData();
        }

        if (wondeReImportParameter?.value === WondeReImportFrequency.WEEKLY) {
            const dayName = moment().format('dddd');

            if (dayName === 'Saturday') {
                await this.schoolService.reimportSchoolsWondeData();
            }
        }
    }

    public async refreshAllAdminQueries(): Promise<void> {
        await this.dataQueryService.refreshAllDataQueries();
    }

    public async refreshPpasView(): Promise<void> {
        await this.dataQueryService.refreshPpasView();
    }

    public async runHourlySqlQueries(): Promise<void> {
        await this.dataQueryService.runHourlySqlQueries();
    }

    public async runNightlySqlQueries(): Promise<void> {
        await this.dataQueryService.runNightlySqlQueries();
    }

    public async updateAllInterstitialFormsContext(): Promise<void> {
        await this.staticLwpInterstitialService.updateAllInterstitialFormsContext();
    }

    public async sendAllPendingNotifications(): Promise<void> {
        await this.lwpNotificationService.sendAllPendingNotifications();
    }

    public async sendParentNotificationOfTeacherReadingComment(): Promise<void> {
        await this.pupilFeedbackService.sendParentNotificationOfTeacherReadingComment();
    }

    public async sendParentNotificationOfTeacherFeedbackReply(): Promise<void> {
        await this.feedbackRepliesService.sendParentNotificationOfTeacherFeedbackReply();
    }

    isTimeWithinRange(startTimeInHours: string, endTimeInHours: string): boolean {
        const currentTime = moment();
        const startTime = moment(startTimeInHours, 'HH:mm');
        const endTime = moment(endTimeInHours, 'HH:mm');

        return currentTime.isBetween(startTime, endTime);
    }

    async getNotificationTimes(): Promise<{
        teacherNotificationTime: { startTime: string; endTime: string };
        parentNotificationTime: { startTime: string; endTime: string };
    }> {
        const daysOfWeekend: string[] = ['Saturday', 'Sunday'];
        const dayName = moment().format('dddd');
        let key = 'WEEKDAY_PARENT_NOTIFICATION_TIME';

        if (daysOfWeekend.includes(dayName)) {
            key = 'WEEKEND_PARENT_NOTIFICATION_TIME';
        }

        const sendNotificationsParameters = await this.parameterService.getParameters(['TEACHER_NOTIFICATION_TIME', key]);
        const teacherNotificationTimeValue = sendNotificationsParameters.find((p) => p.key === 'TEACHER_NOTIFICATION_TIME').value;
        const parentNotificationTimeValue = sendNotificationsParameters.find((p) => p.key === key).value;

        const teacherNotificationTime = JSON.parse(teacherNotificationTimeValue);
        const parentNotificationTime = JSON.parse(parentNotificationTimeValue);

        return { teacherNotificationTime, parentNotificationTime };
    }

    public runRegularCronJobs = (): void => {
        const cronTime = this.configService.get('cronJobs.regular.cronTime', '0 */10 * * * *');

        const job = new CronJob(cronTime, async () => {
            if ((await this.parameterService.getParameterByKey(this.CRONJOB_RUNNING_PARAM)).value == 'true') {
                console.log('Previous cronjob running: not running the next one');

                return;
            }

            await this.wrapCronjob('REGULAR', async () => {
                await this.setCronRunningSiteParam(true);

                console.log('------ regular cron job -------');

                await this.proceedWithNextOnError(this.releasePupilTopics(), 'topic release');
                await this.proceedWithNextOnError(this.createReadingTopics(), 'creating reading topics for classes');
                await this.proceedWithNextOnError(this.runHourlySqlQueries(), 'run hourly sql queries');

                const { teacherNotificationTime, parentNotificationTime } = await this.getNotificationTimes();

                // Sending parent emails
                if (this.isTimeWithinRange(parentNotificationTime?.startTime, parentNotificationTime?.endTime)) {
                    await this.proceedWithNextOnError(this.sendReleasedPupilTopicNotifications(), 'notification of released topics');
                    await this.proceedWithNextOnError(this.topicReminderAfter7Days(), 'parent topic reminder after 7 days');
                    await this.proceedWithNextOnError(this.readingTopicReminders(), 'parent reading topic reminder after 2 and 5 days');
                    await this.proceedWithNextOnError(this.sendTrophyMailToPupil(), 'send pupil achievement mail');
                    await this.proceedWithNextOnError(
                        this.sendParentNotificationOfTeacherReadingComment(),
                        'send notifications to parent of teacher reading comment'
                    );
                    await this.proceedWithNextOnError(
                        this.sendParentNotificationOfTeacherFeedbackReply(),
                        'send notifications to parent of teacher feedback reply'
                    );
                }

                // Sending teacher emails
                if (this.isTimeWithinRange(teacherNotificationTime?.startTime, teacherNotificationTime?.endTime)) {
                    await this.proceedWithNextOnError(this.teacherTopicsToBeReleasedTomorrow(), 'teacher notification of upcoming topics');
                    await this.proceedWithNextOnError(
                        this.teacherTopicsToBeReleasedNextWeek(),
                        'teacher notification of topics released next week'
                    );
                    await this.proceedWithNextOnError(
                        this.teacherMoneySkillsFirstTopicScheduled(),
                        'teacher notification of first Money Skills topic scheduled'
                    );
                    await this.proceedWithNextOnError(this.sendTeacherReadingTopicEnd(), 'teacher notification of last week reading topic');
                    await this.proceedWithNextOnError(this.sendTrophyMailToTeacher(), 'send teacher achievement mail');
                }

                // // This function should always call last
                await this.proceedWithNextOnError(this.sendAllPendingNotifications(), 'send all pending emails');

                await this.setCronRunningSiteParam(false);
            });
        });

        this.schedulerRegistry.addCronJob('REGULAR_CRON_JOB', job);
        job.start();
    };

    public runDailyCronJobs = (): void => {
        const cronTime = this.configService.get('cronJobs.daily.cronTime', '0 0 2 * * *');

        const job = new CronJob(cronTime, async () => {
            console.log('------ daily cron job -------');
            await this.wrapCronjob('NIGHTLY', async () => {
                await this.proceedWithNextOnError(this.refreshPpasView(), 'refresh ppas view');
                await this.proceedWithNextOnError(this.refreshAllAdminQueries(), 'refresh all admin queries');
                await this.proceedWithNextOnError(this.logsCleanUp(), 'cleaning old logs');
                await this.proceedWithNextOnError(this.runNightlySqlQueries(), 'run nightly sql queries');
                await this.proceedWithNextOnError(this.updateAllInterstitialFormsContext(), 'update all site forms context');
                await this.proceedWithNextOnError(this.trophiesAssignedToPupils(), 'assign trophies to pupils');
                await this.proceedWithNextOnError(this.reimportSchoolsWondeData(), 'reimporting schools');
                await this.proceedWithNextOnError(
                    this.notifyNewRelicWhenPupilInMultipleClasses(),
                    'notify new relic when a pupil is assigned to multiple registration classes in the same academic year'
                );
                await this.proceedWithNextOnError(
                    this.updateAllGroupAcrossClassesLicenseDetails(),
                    'Update group across classes license details'
                );

                // await this.proceedWithNextOnError(this.updateNoLinkedParentStatusOfPupils(), 'update status of pupils with no linked parents');
            });
        });

        this.schedulerRegistry.addCronJob('DAILY_CRON_JOB', job);
        job.start();
    };

    /**
     * setCronRunningSiteParam sets the RUNNING_CRONJOB parameter.
     * Note that this system **is susceptible to race conditions**
     * if two cronjobs are run at the exact same time: at the time of
     * development, this is considered to not be an issue, as we don't
     * ever anticipate hitting this case.
     *
     * @private
     * @memberof EmailTask
     */
    private async setCronRunningSiteParam(running: boolean): Promise<void> {
        await this.parameterService.updateParameter({ key: this.CRONJOB_RUNNING_PARAM, value: JSON.stringify(running) }, null);
    }

    /**
     * Wraps a cronjob in a New Relic custom event on start and finish.
     *
     * @private
     * @param {('REGULAR' | 'NIGHTLY')} type the type of cronjob
     * @param {() => Promise<void>} callback the actual contents of the job
     * @memberof EmailTask
     */
    private async wrapCronjob(type: 'REGULAR' | 'NIGHTLY', callback: () => Promise<void>): Promise<void> {
        const cronjobId = crypto.randomUUID();

        newrelic.recordCustomEvent('startCron', { type, cronjobId });

        await callback();

        newrelic.recordCustomEvent('finishCron', { type, cronjobId });
    }
}
