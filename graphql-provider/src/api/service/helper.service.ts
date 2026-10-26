import { HttpService } from '@nestjs/axios';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { Context, Info } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { cloneDeep, sum } from 'lodash';
import { SetByTeacherDataType } from 'lwp-shared';
import moment from 'moment';
import { ConfigService } from 'nestjs-config';
import { MINIO_CONNECTION } from 'nestjs-minio';
import { UserType } from 'src/auth/types/UserType';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import media from 'src/config/media';
import { appConstants } from 'src/constants';
import { Connection, EntityManager, In, QueryRunner, Repository } from 'typeorm';
import { UAParser } from 'ua-parser-js';

import { LwpBuildType } from '../dtos/LwpBuildType';
import { StaticLwpActivity, StaticLwpActivitySteps } from '../entities/activity';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpSchoolHoliday } from '../entities/lwp_school_holiday';
import { LwpSetByTeacherStepMedia } from '../entities/lwp_set_by_teacher_step_media';
import { StaticLwpMathscotItem } from '../entities/mathscot_item';
import { StaticLwpModal } from '../entities/modal';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchoolClass } from '../entities/school_class';
import { LwpUser } from '../entities/user';
import { CarouselData, carouselType, CSVHeaders, DeviceType, LogParentPupilActionInput, SocialLoginParameters } from '../model';
import {
    ActivityStepInput,
    ActivityStepType,
    CertificatePdfDataForTrophy,
    ErrorStatusCodeEnum,
    FieldData,
    TrophyCertificateFieldName,
    UpdateActivityStepInput
} from '../model';
import { LogParentPupilActionService } from './log_parent_pupil_action.service';
import { ParameterService } from './parameter.service';

export enum DiceType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE'
}
export interface DiceProperty {
    inputArray?: string;
    width?: string;
    isInfant?: boolean;
    diceType: DiceType;
    images?: string[];
    fileNames?: string[];
    fileIds?: string[];
}

export interface TextDiceProperties {
    diceProperties?: DiceProperty[];
    height?: string;
    longTextFontSize?: string;
    maxDicePerLine?: string;
    expression?: string;
    btnText?: string;
}

@Injectable()
export class HelperService {
    constructor(
        @Inject(MINIO_CONNECTION) private readonly minioClient,
        @InjectRepository(LwpSchoolClass) private schoolClassRepository: Repository<LwpSchoolClass>,
        @InjectRepository(StaticLwpMathscotItem)
        private staticLwpMathscotItemRepository: Repository<StaticLwpMathscotItem>,
        @InjectRepository(StaticLwpActivitySteps)
        private staticLwpActivityStepsRepository: Repository<StaticLwpActivitySteps>,
        @InjectRepository(LwpPupilTopic)
        private pupilTopicRepository: Repository<LwpPupilTopic>,
        @InjectRepository(LwpPupilActivity)
        private pupilActivityRepository: Repository<LwpPupilActivity>,
        @InjectRepository(LwpSchoolHoliday)
        private schoolHolidayRepository: Repository<LwpSchoolHoliday>,
        @InjectRepository(LwpUser)
        private userRepository: Repository<LwpUser>,
        @InjectRepository(LwpSetByTeacherStepMedia)
        private setByTeacherStepMediaRepository: Repository<LwpSetByTeacherStepMedia>,
        private logParentPupilActionService: LogParentPupilActionService,
        private configService: ConfigService,
        private httpService: HttpService,
        private parameterService: ParameterService,
        private connection: Connection
    ) {}

    public dateHandler1(date: Date | string): string {
        return moment(date).format('LL');
    }

    public dateHandler2(date: Date | string): string {
        return moment(date).format('dddd DD MMM');
    }

    public getDateTime(date: Date | string, format = 'dddd DD MMM'): Date {
        return new Date(moment(date).format(format));
    }

    public getDiffInHoursFromNow(date: Date | string): number {
        const now = moment().format('DD/MM/YYYY HH:mm:ss');
        const then = moment(date).format('DD/MM/YYYY HH:mm:ss');

        return moment.duration(moment(now, 'DD/MM/YYYY HH:mm:ss').diff(moment(then, 'DD/MM/YYYY HH:mm:ss'))).asHours();
    }

    public getDiffInWeeksFromNow(date: Date | string): number {
        const now = moment().format('DD/MM/YYYY HH:mm:ss');
        const then = moment(date).format('DD/MM/YYYY HH:mm:ss');

        return moment.duration(moment(now, 'DD/MM/YYYY HH:mm:ss').diff(moment(then, 'DD/MM/YYYY HH:mm:ss'))).asWeeks();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getKeysAndRelation(@Info() info, entityRelations): any {
        const keys = [];

        info.fieldNodes[0].selectionSet.selections.map((item) => {
            keys.push(item.name.value);
            if (item.selectionSet) {
                item.selectionSet.selections.map((nestedItem) => {
                    if (entityRelations.indexOf(`${item.name.value}.${nestedItem.name.value}`) !== -1) {
                        keys.push(`${item.name.value}.${nestedItem.name.value}`);
                        if (nestedItem.selectionSet) {
                            nestedItem.selectionSet.selections.map((nested2Item) => {
                                if (
                                    entityRelations.indexOf(`${item.name.value}.${nestedItem.name.value}.${nested2Item.name.value}`) !== -1
                                ) {
                                    keys.push(`${item.name.value}.${nestedItem.name.value}.${nested2Item.name.value}`);
                                }
                            });
                        }
                    }
                });
            }
        });

        const select = keys.filter((item) => entityRelations.indexOf(item) === -1 && item !== '__typename');
        const relations = entityRelations.filter((item) => keys.indexOf(item) !== -1);

        return { select, relations };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public uploadFile(filename: string, fileUpload: FileUpload, isPublic = false, metaData?: any): Promise<string> {
        let defaultMetaData = {
            'Content-Type': 'binary/octet-stream'
        };

        if (this.getFileFormat(filename) === 'pdf') {
            defaultMetaData = {
                'Content-Type': 'application/pdf'
            };
        }

        if (this.getFileFormat(filename) === 'svg') {
            defaultMetaData = {
                'Content-Type': 'image/svg+xml'
            };
        }

        if (metaData) {
            defaultMetaData = metaData;
        }

        return new Promise((resolve, reject) => {
            this.minioClient.putObject(
                isPublic ? media.bucket_public : media.bucket_usermedia,
                filename,
                fileUpload.createReadStream(),
                defaultMetaData,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (err: any) => (err ? reject(err) : resolve(filename))
            );
        });
    }

    public async copyFile(
        copyFromFolderPath: string,
        originalFileName: string,
        newFileName: string,
        isPublic = false,
        copyToFolderPath?: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metaData?: any
    ): Promise<void> {
        let defaultMetaData = {
            'Content-Type': 'binary/octet-stream'
        };

        if (this.getFileFormat(originalFileName) === 'pdf') {
            defaultMetaData = {
                'Content-Type': 'application/pdf'
            };
        }

        if (this.getFileFormat(originalFileName) === 'svg') {
            defaultMetaData = {
                'Content-Type': 'image/svg+xml'
            };
        }

        if (metaData) {
            defaultMetaData = metaData;
        }

        // Construct the full path for the original and new file locations
        const originalFilePath = `${copyFromFolderPath}/${originalFileName}`;
        const newFilePath = `${copyToFolderPath ?? copyFromFolderPath}/${newFileName}`;
        const bucketName = isPublic ? media.bucket_public : media.bucket_usermedia;

        // Get the original file as a stream from the specified bucket and folder
        const stream = await this.minioClient.getObject(bucketName, originalFilePath);

        // Use the MinIO client to copy the file stream to the new file path
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.minioClient.putObject(bucketName, newFilePath, stream, defaultMetaData, (err: any) => (err ? reject(err) : resolve()));
        });
    }

    public getFileFormat(fileName: string): string {
        const splitFileName = fileName?.replace(' ', '')?.split('.');

        return splitFileName?.length > 0 ? splitFileName?.[splitFileName?.length - 1] : '';
    }

    public getNewFileName(fileName: string): string {
        // Check if the filename contains datetime
        const datetimeRegex = /\d{13}_/;
        const hasDatetime = datetimeRegex.test(fileName);

        if (hasDatetime) {
            const currentTime = new Date().getTime();
            // Replace existing datetime with current datetime

            return fileName.replace(/\d{13}_/, `${currentTime}_`);
        }

        return `${new Date().getTime()}_${fileName}`;
    }

    public async duplicateFile(
        copyFromFolderPath: string,
        originalFileName: string,
        newFileName: string,
        isPublic = false,
        copyToFolderPath?: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metaData?: any
    ): Promise<string> {
        try {
            await this.copyFile(copyFromFolderPath, originalFileName, newFileName, isPublic, copyToFolderPath, metaData);

            return newFileName;
        } catch (error) {
            throw new HttpException(`Filename: ${originalFileName}. ${error?.message}`, ErrorStatusCodeEnum._535);
        }
    }

    public mapInputToStep(step: StaticLwpActivitySteps, activityOrModal: StaticLwpActivity | StaticLwpModal): StaticLwpActivitySteps {
        const isActivity = activityOrModal instanceof StaticLwpActivity;

        const newStep = new StaticLwpActivitySteps();

        newStep.order = step.order;
        newStep.stepType = step.stepType;
        newStep.text = step.text;
        newStep.imageUrl = step.imageUrl;
        newStep.downloadName = step.downloadName;
        newStep.downloadUrl = step.downloadUrl;
        newStep.linkName = step.linkName;
        newStep.linkUrl = step.linkUrl;
        newStep.properties = step.properties;
        newStep.fontSize = step.fontSize;
        newStep.fontType = step.fontType;
        newStep.textCarouselData = step.textCarouselData;
        newStep.tableData = step.tableData;
        newStep.selectedModalId = step.selectedModalId;
        newStep.editorState = step.editorState;
        newStep.fileName = step.fileName;
        newStep.btnType = step.btnType;
        newStep.timerData = step.timerData;
        newStep.imageCarouselData = step.imageCarouselData;
        newStep.dimensions = step.dimensions;
        newStep.clickableAlphabetData = step.clickableAlphabetData;
        newStep.includeSeconds = step.includeSeconds;
        newStep.audioUrl = step.audioUrl;
        newStep.tabsData = step.tabsData;
        newStep.editAsHtml = step.editAsHtml;
        newStep.checklistImageData = step.checklistImageData;
        newStep.accordionData = step.accordionData;
        newStep.checkListTextData = step.checkListTextData;
        newStep.carouselData = step.carouselData;
        newStep.setByTeacherData = step.setByTeacherData;
        newStep.visibilityRules = step.visibilityRules;

        if (isActivity) {
            newStep.activity = activityOrModal;
        } else {
            newStep.modal = activityOrModal;
        }

        return newStep;
    }

    public async duplicateStep(step: StaticLwpActivitySteps, activityOrModal: StaticLwpActivity | StaticLwpModal): Promise<void> {
        const newStep = this.mapInputToStep(step, activityOrModal);

        if (step?.stepType === ActivityStepType.AUDIO && newStep.audioUrl) {
            const newFileName = await this.duplicateFile(
                appConstants.minioPaths.public.fileActivitySteps,
                newStep.audioUrl,
                this.getNewFileName(newStep.audioUrl),
                true
            );

            newStep.audioUrl = newFileName;
            newStep.fileName = this.getNewFileName(newStep.fileName);
        }

        if (step?.stepType === ActivityStepType.IMAGE && newStep.imageUrl) {
            const newFileName = await this.duplicateFile(
                appConstants.minioPaths.public.imageActivitySteps,
                newStep.imageUrl,
                this.getNewFileName(newStep.imageUrl),
                true
            );

            newStep.imageUrl = newFileName;
            newStep.fileName = this.getNewFileName(newStep.fileName);
        }

        if (step?.stepType === ActivityStepType.TEXTDICE) {
            const newDiceProperties: TextDiceProperties = cloneDeep(newStep?.properties);
            const newDicePropertyData: DiceProperty[] = [];

            if (newDiceProperties?.diceProperties?.length > 0) {
                for (const diceProperty of newDiceProperties.diceProperties) {
                    const newDiceProperty = cloneDeep(diceProperty);
                    const newImagesData: string[] = [];

                    for (const image of newDiceProperty.images) {
                        const newFileName = await this.duplicateFile(
                            appConstants.minioPaths.public.imageActivitySteps,
                            image,
                            this.getNewFileName(image),
                            true
                        );

                        newImagesData.push(newFileName);
                    }

                    newDiceProperty.images = newImagesData;
                    newDiceProperty.fileNames = newImagesData;

                    newDicePropertyData.push(newDiceProperty);
                }
            }

            newDiceProperties.diceProperties = newDicePropertyData;
            newStep.properties = newDiceProperties;
        }

        if (step?.stepType === ActivityStepType.DIGITAL_CHECKLIST && newStep.checklistImageData) {
            const checklistImageData = JSON.parse(newStep.checklistImageData);
            const newCheckListData = [];

            for (const checkList of checklistImageData) {
                const newCheckList = cloneDeep(checkList);

                const newFileName = await this.duplicateFile(
                    appConstants.minioPaths.public.imageActivitySteps,
                    newCheckList.imageUrl,
                    this.getNewFileName(newCheckList.imageUrl),
                    true
                );

                newCheckList.imageUrl = newFileName;
                newCheckList.fileName = this.getNewFileName(newCheckList.fileName);

                newCheckListData.push(newCheckList);
            }

            newStep.checklistImageData = JSON.stringify(newCheckListData);
        }

        if (step?.stepType === ActivityStepType.IMAGE_CAROUSEL && newStep.imageCarouselData) {
            const imageCarouselData = JSON.parse(newStep.imageCarouselData);
            const newImageCarouselData = [];

            for (const imageCarousel of imageCarouselData) {
                const newImageCarousel = cloneDeep(imageCarousel);

                const newFileName = await this.duplicateFile(
                    appConstants.minioPaths.public.imageActivitySteps,
                    newImageCarousel.imageUrl,
                    this.getNewFileName(newImageCarousel.imageUrl),
                    true
                );

                newImageCarousel.imageUrl = newFileName;
                newImageCarousel.fileName = this.getNewFileName(newImageCarousel.fileName);

                newImageCarouselData.push(newImageCarousel);
            }

            newStep.imageCarouselData = JSON.stringify(newImageCarouselData);
        }

        if (step?.stepType === ActivityStepType.CAROUSEL && newStep.carouselData) {
            const imageCarouselData = newStep.carouselData;
            const newCarouselData = [];

            for (const imageCarousel of imageCarouselData) {
                const newImageCarousel = cloneDeep(imageCarousel);

                if (imageCarousel.type === carouselType.IMAGE) {
                    const newFileName = await this.duplicateFile(
                        appConstants.minioPaths.public.imageActivitySteps,
                        newImageCarousel.imageUrl,
                        this.getNewFileName(newImageCarousel.imageUrl),
                        true
                    );

                    newImageCarousel.imageUrl = newFileName;
                    newImageCarousel.fileName = this.getNewFileName(newImageCarousel.fileName);
                }

                newCarouselData.push(newImageCarousel);
            }

            newStep.carouselData = newCarouselData;
        }

        if (step?.stepType === ActivityStepType.DOWNLOAD && newStep.downloadUrl) {
            const newFileName = await this.duplicateFile(
                appConstants.minioPaths.public.fileActivitySteps,
                newStep.downloadUrl,
                this.getNewFileName(newStep.downloadUrl),
                true
            );

            newStep.downloadUrl = newFileName;
        }

        await this.staticLwpActivityStepsRepository.save(newStep);
    }

    public async duplicateSteps(steps: StaticLwpActivitySteps[], activityOrModal: StaticLwpActivity | StaticLwpModal): Promise<void> {
        for (const step of steps) {
            await this.duplicateStep(step, activityOrModal);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getHeadersForCsv(jsonData: any): CSVHeaders[] {
        const headers: CSVHeaders[] = [];

        for (const header of Object.keys(jsonData)) {
            headers.push({ id: header, title: header });
        }

        return headers;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getFileMetaData(fileName: string): any {
        const format = this.getFileFormat(fileName);

        if (!format || format === '') {
            return {
                'Content-Type': 'binary/octet-stream'
            };
        }

        switch (format) {
            case 'png':
                return {
                    'Content-Type': 'image/png'
                };

            case 'jpeg':
                return {
                    'Content-Type': 'image/jpeg'
                };

            case 'pdf':
                return {
                    'Content-Type': 'application/pdf'
                };

            case 'jpg':
                return {
                    'Content-Type': 'image/jpeg'
                };

            case 'svg':
                return {
                    'Content-Type': 'image/svg+xml'
                };

            default:
                return {
                    'Content-Type': 'binary/octet-stream'
                };
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getFile(filename: string, filePath: string, isPublic = false): Promise<any> {
        return new Promise((resolve, reject) => {
            this.minioClient.fGetObject(isPublic ? media.bucket_public : media.bucket_usermedia, filename, filePath, function (err) {
                if (err) {
                    return reject(err);
                }

                return resolve(filename);
            });
        });
    }

    public removeFile(filename: string, isPublic = false): Promise<string> {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.minioClient.removeObject(isPublic ? media.bucket_public : media.bucket_usermedia, filename, (err: any) =>
                err ? reject(err) : resolve(filename)
            );
        });
    }

    public getPublicUrl(fileName: string): string {
        return `${this.getMinioPublicBaseUrl()}/${fileName}`;
    }

    public getMathscotProxyUrl(fileName: string): string {
        return `${this.configService.get('server.graphqlBase')}/mathscots/${fileName}`;
    }

    public async getUsermediaUrl(fileName: string, options?: { cache?: boolean }): Promise<string> {
        const headers: Record<string, string> = {
            'response-content-disposition': `attachment; filename="${fileName.split('/').pop()}"`
        };

        if (options?.cache === false) {
            headers['response-cache-control'] = 'no-store';
        }

        return await this.minioClient.presignedGetObject(
            media.bucket_usermedia,
            fileName,
            appConstants.media.presignedDurationInMins * 60,
            headers
        );
    }

    public async getUsermediaUrls(fileNames: string[], minioPath: string): Promise<string[]> {
        const presignedfileNames: string[] = [];

        for (const fileName of fileNames) {
            const presignedUrl = await this.minioClient.presignedGetObject(
                media.bucket_usermedia,
                `${minioPath}/${fileName}`,
                appConstants.media.presignedDurationInMins * 60
            );

            presignedfileNames.push(presignedUrl);
        }

        return presignedfileNames;
    }

    public getMinioPublicBaseUrl(): string {
        return process.env.MINIO_PUBLIC_BASE_URL ?? `http://${media.minio_host}:${media.minio_port}/${media.bucket_public}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getBufferFromUrl(url: string): any {
        return this.httpService.get(url, { responseType: 'arraybuffer' });
    }

    public async checkFileExists(url: string): Promise<boolean> {
        return await this.getBufferFromUrl(url)
            .toPromise()
            .then(() => true)
            .catch(() => false);
    }

    public generateId(length = 6, separator = '-'): string {
        const timestamp = +new Date();

        const _getRandomInt = (min, max): number => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const ts = timestamp.toString();
        const parts = ts.split('').reverse();
        let id = '';

        for (let i = 0; i < length; ++i) {
            const index = _getRandomInt(0, parts.length - 1);

            if (i % 3 === 0 && i && separator) id += separator;
            id += parts[index];
        }

        return id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public changeObjKeys(obj: unknown, replaceStr): any {
        const newPupil = Object.keys(obj).map((key) => {
            return { [key.replace(replaceStr, '')]: obj[key] };
        });

        return newPupil;
    }

    public isChildNameExist(pupils: LwpPupil[], firstname: string, lastname: string): boolean {
        return (
            pupils?.some(
                (pupil) =>
                    pupil.firstname.toLowerCase() === firstname.toLowerCase() && pupil.lastname.toLowerCase() === lastname.toLowerCase()
            ) ?? false
        );
    }

    public formatPhoneNumber(phoneNumber): string {
        // Normalise to international format
        return (
            phoneNumber &&
            phoneNumber
                .replace(/^00/, '+')
                .replace(/^0/, '+44')
                // 7xxxxxxxxx is almost certainly a UK mobile phone number.
                // We know this with reasonable confidence because it has exactly 9 digits following the 7.
                // If there were more, it could be a Russian or Kazakh phone number (+7), so we can't autoassign it.
                .replace(/^7(?=\d{9}$)/, '+447')
                .replace('+440', '+44')
                .replace(' ', '')
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getUnique(arr, comp): Array<any> {
        const unique = arr
            .map((e) => e[comp])

            // store the keys of the unique objects
            .map((e, i, final) => final.indexOf(e) === i && i)

            // eliminate the dead keys & store unique objects
            .filter((e) => arr[e])
            .map((e) => arr[e]);

        return unique;
    }

    public compareArray = (a: number[], b: number[]): boolean => JSON.stringify(a) === JSON.stringify(b);

    public getDateTimeFormat(date: Date, hour: string): Date {
        const momentDate = moment(date);

        momentDate.set({
            hour: moment(hour, 'HH').get('hour'),
            minute: moment('00', 'mm').get('minute')
        });

        return new Date(moment(momentDate).format('YYYY-MM-DD HH:mm'));
    }

    public async updateSchoolClassStats(classId: string, manager?: EntityManager): Promise<void> {
        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;

        await schoolClassRepository.update({ id: classId }, { isStatsNeedUpdate: true });

        return;
    }

    public getYearFromYearGroup(year: string): number {
        switch (year) {
            case 'Year 1':
                return 1;

            case 'Year 2':
                return 2;

            case 'Year 3':
                return 3;

            case 'Year 4':
                return 4;

            case 'Year 5':
                return 5;

            case 'Year 6':
                return 6;

            case 'Unknown':
                return null;

            case 'Early Years':
                return 0;

            default:
                return 0;
        }
    }

    public hasNumber(str: string): boolean {
        return /\d/.test(str);
    }

    public addCurrentTimeToDate(date: Date): Date {
        const currentTime = moment();
        const dateMoment = moment(date);

        dateMoment.set({
            hour: currentTime.get('hour'),
            minute: currentTime.get('minute'),
            second: currentTime.get('second')
        });

        return dateMoment.toDate();
    }

    public addTitleInClassTopic(title: string): string {
        return !title
            ? 'Week 1'
            : title && !this.hasNumber(title)
              ? `${title} 1`
              : title && this.hasNumber(title)
                ? title.replace(/\d+/g, (y) => (parseInt(y) + 1).toString())
                : null;
    }

    public generateDataForTrophyCertificate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        certificate: any,
        pupil?: LwpPupil,
        lwpSchoolClass?: LwpSchoolClass,
        pupilMathscotUrl?: string
    ): CertificatePdfDataForTrophy {
        const fieldData: FieldData[] = [];

        certificate.fieldData.map((fData) => {
            switch (fData.fieldName) {
                case TrophyCertificateFieldName.CHILDNAME:
                    fieldData.push({
                        fieldName: TrophyCertificateFieldName.CHILDNAME,
                        xValue: fData.xValue,
                        yValue: fData.yValue,
                        fontSize: fData.fontSize,
                        fieldValue: `${pupil?.firstname} ${pupil?.lastname}`
                    });
                    break;

                case TrophyCertificateFieldName.DATE:
                    fieldData.push({
                        fieldValue: moment().format('DD MMMM YYYY'),
                        xValue: fData.xValue,
                        yValue: fData.yValue,
                        fontSize: fData.fontSize,
                        fieldName: TrophyCertificateFieldName.DATE
                    });
                    break;

                case TrophyCertificateFieldName.TOTATSTARS:
                    fieldData.push({
                        fieldValue: sum(pupil.allTopics.map((a) => a.silverStars ?? 0) ?? [0]).toString(),
                        xValue: fData.xValue,
                        yValue: fData.yValue,
                        fontSize: fData.fontSize,
                        fieldName: TrophyCertificateFieldName.TOTATSTARS
                    });
                    break;

                case TrophyCertificateFieldName.TEACHERNAME:
                    fieldData.push({
                        fieldValue: `${lwpSchoolClass?.mainTeacher?.firstname} ${lwpSchoolClass?.mainTeacher?.lastname}`,
                        xValue: fData.xValue,
                        yValue: fData.yValue,
                        fontSize: fData.fontSize,
                        fieldName: TrophyCertificateFieldName.TEACHERNAME
                    });
                    break;

                default:
                    break;
            }
        });

        return {
            fileName: certificate.fileName,
            fieldData,
            mathscot: certificate.mathscot
                ? {
                      fieldValue: pupilMathscotUrl,
                      xValue: certificate.mathscot.xValue,
                      yValue: certificate.mathscot.yValue,
                      scale: certificate.mathscot.scale
                  }
                : null
        };
    }

    // To be used in the future
    // public async releaseSubjectBasedSurveyToParents(classTopicIds: string[], parentIds: string[], manager?: EntityManager): Promise<void> {
    //     if (classTopicIds.length === 0 || parentIds.length === 0) {
    //         return;
    //     }

    //     const entityManager = manager ? manager : this.connection.manager;

    //     await entityManager.transaction(async (transactionalEntityManager) => {
    //         await transactionalEntityManager.query(
    //             `
    //             WITH subject_ids AS (
    //                 SELECT DISTINCT sltd."subjectId"
    //                 FROM static_lwp_topic_domain_year_group sltdyg
    //                 JOIN static_lwp_topic_domain sltd ON sltd."id" = sltdyg."domainId"
    // 				JOIN lwp_class_topic lct ON lct."topicId" = sltdyg."topicId"
    //                 WHERE lct.id =  ANY($1::float[])
    //             ),
    //             released_surveys AS (
    //                 SELECT sli."id" AS interstitial_id
    //                 FROM static_lwp_interstitial sli
    //                 WHERE sli."subjectId" IN (SELECT "subjectId" FROM subject_ids)
    //                 AND sli."lastAction" = 'RELEASED'
    //                 AND (
    //                     SELECT ARRAY_AGG(value::text)
    //                     FROM jsonb_array_elements_text(sli."userOptions")
    //                 ) && ARRAY['PARENT', 'NEW_PARENT']
    //             ),
    //             parent_ids AS (
    //                 SELECT UNNEST($2::float[]) AS parent_id
    //             ),
    //             parent_cross_survey AS (
    //                 SELECT p.parent_id, r.interstitial_id
    //                 FROM parent_ids p
    //                 CROSS JOIN released_surveys r
    //             )
    //             INSERT INTO lwp_user_interstitial ("userId", "interstitialId")
    //             SELECT pcs.parent_id, pcs.interstitial_id
    //             FROM parent_cross_survey pcs
    //             ON CONFLICT ("userId", "interstitialId") DO NOTHING;
    //             `,
    //             [classTopicIds, parentIds]
    //         );
    //     });
    // }

    /**
     * releasePupilTopicsHelper releases unreleased class topics prior to a date.
     * It also optionally accepts a connection-like object, to perform the work
     * in a transaction.
     *
     * NOTE: The topic release steps (pupil topics, SBT media join, pupil activities) must remain
     * in sync with topicReleaseHelper, which handles the same logic for individual pupil release.
     * Any changes to release logic here must be mirrored there, and vice versa.
     *
     * @param {Date} date the date before which to release topics
     * @param {EntityManager | QueryRunner} [connectionish] a manager or query runner to manage the transaction, if needed
     * @return {number} the total number of class topics processed
     * @memberof HelperService
     */
    public async releasePupilTopicsHelper(date: Date, connectionish?: EntityManager | QueryRunner): Promise<number> {
        let numTopicsProcessed: number;
        let totalTopicsProcessed = 0;

        /**
         * The below loop runs at least once (do-while),
         * and then will continue to loop until we have processed all for all classes (and we're
         * no longer updating rows as a consequence).
         *
         * Processing only one topic per class at a time avoids an issue where topics released
         * on the same day would get the same mathscot items.
         */
        do {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: [any, number] = await (connectionish ? connectionish : this.connection).query(
                `
            with _classTopics as (
                select
                    "classId",
                    "isRegistrationClass",
                    "skipGroupPupils",
                    "topicId",
                    lct.id as "classTopicId",
                    lct."readingTarget",
                    "periodIndex",
                    "releaseDate",
                    slt."isReading" as "isReading",
                    row_number() over (partition by "classId") as "rn"
                from
                    lwp_class_topic lct
                join lwp_school_class lsc on
                    lct."classId" = lsc.id
                join static_lwp_period slp on lsc."periodIndex" >= slp.index and slp."isCurrentPeriod" = true
                join lwp_school ls on
                    lsc."schoolId" = ls.id
                    and ls.inactive = false
                join static_lwp_topic slt on
                    lct."topicId" = slt.id
                where
                    lct."releaseDate" <= $1 and lct.released = false
                order by lct."releaseDate" asc
            ),
            classTopics AS (
                SELECT
                    _classTopics.*,
                    CASE
                        WHEN _classTopics."isReading" = true THEN array[]::bigint[] -- Empty array if isReading is true
                        ELSE (
                            SELECT array_agg(DISTINCT sls."id")
                            FROM static_lwp_topic_domain sltd
                            JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id"
                            JOIN static_lwp_topic_domain_year_group sltdyg ON sltd."id" = sltdyg."domainId"
                            WHERE sltdyg."topicId" = _classTopics."topicId"
                        )
                    END AS "subjectIds"
                FROM
                    _classTopics
                WHERE
                    rn = 1
            ),
            pupilTopics as (
                insert
                    into
                        lwp_pupil_topic (
                            "topicId",
                            "classTopicId",
                            "pupilId",
                            "readingTarget",
                            "releaseDate",
                            "watchedVideo",
                            "periodIndex"
                        )
                        select
                            "topicId",
                            "classTopicId",
                            lp.id as "pupilId",
                            classTopics."readingTarget",
                            classTopics."releaseDate",
                            false as "watchedVideo",
                            classTopics."periodIndex"
                        from
                            lwp_pupil lp
                        join lwp_class_pupil this_lcp on
                            lp.id = this_lcp."lwpPupilId"
                        join classTopics on
                            this_lcp."lwpSchoolClassId" = classTopics."classId"
                        join lwp_class_pupil all_lcp on
                            lp.id = all_lcp."lwpPupilId"
                        left join lwp_class_subjects lcs on all_lcp."lwpSchoolClassId" = lcs."lwpSchoolClassId"
                        left join static_lwp_subject sls on lcs."staticLwpSubjectId" = sls."id"
                        left join lwp_school_class blockingSchoolClass on -- don't release when skipping this group for this subject
                            all_lcp."lwpSchoolClassId" = blockingSchoolClass.id
                            and not blockingSchoolClass."isRegistrationClass"
                            and blockingSchoolClass."skipGroupPupils"
                            and blockingSchoolClass."periodIndex" = classTopics."periodIndex"
                            and (sls."id" = ANY(classTopics."subjectIds") or classTopics."isReading" or blockingSchoolClass."IsReadingLogsEnabled")
                        group by
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7,
                            classTopics."isRegistrationClass",
                            classTopics."subjectIds",
                            classTopics."isReading"
                        having
                            (
                                not classTopics."isRegistrationClass" -- either it's releasing to a group
                                or classTopics."isReading" -- or it's releasing a reading topic, where groups are ignored
                                or sum(blockingschoolclass.id) is null -- or it's not releasing to a skipGroupPupils pupil for this subject
                            )
                        on conflict ("classTopicId", "pupilId") do nothing
            returning id as "pupilTopicId",
                            "pupilId",
                            "topicId",
                            "classTopicId"
            ),
            pupilActivities as (
            insert
                into
                lwp_pupil_activity (
                    "pupilId",
                    "activityId",
                    "topicId", -- THIS IS A PUPIL TOPIC, *NOT* A TOPIC, DESPITE THE NAME
                    "earnedStar",
                    "logCreatedAt",
                    "mathscotActivityItemIds"
                )
            select
                    "pupilId",
                    sla.id, -- activityId
                    "pupilTopicId",
                    false, -- earnedStar
                    CURRENT_DATE, -- logCreatedAt
                    array_to_json(
                        lvcnmi."mathscotItems"
                    )::jsonb
            from
                pupilTopics pt
			join lwp_class_topic lct on lct.id = pt."classTopicId"
            join lwp_view_class_next_mathscot_items lvcnmi on
                lct."classId" = lvcnmi."classId"
            join static_lwp_topic slt on pt."topicId" = slt.id
            join static_lwp_activity sla on
                slt.id = sla."topicId"
                and not sla."isHidden"
            returning "topicId"
            ),
            sbtStepMedia as (
                insert into lwp_pupil_topic_sbt_step_media
                    ("lwpSetByTeacherStepMediaId", "lwpPupilTopicId")
                select
                    sbtm.id,
                    pt."pupilTopicId"
                from pupilTopics pt
                join lwp_set_by_teacher_step_media sbtm
                    on sbtm."classTopicId" = pt."classTopicId"
                on conflict do nothing
            )
            update lwp_class_topic set released = true where id in (select ct."classTopicId" from classTopics ct);
            `,
                [date]
            );

            numTopicsProcessed = result[1];
            totalTopicsProcessed += numTopicsProcessed;
        } while (numTopicsProcessed > 0);

        return totalTopicsProcessed;
    }

    /**
     * topicReleaseHelper takes topics, a pupil, a class, a parent and an optional manager,
     * and releases the topics to the pupil in the class with the given parent.
     *
     * NOTE: The topic release steps (pupil topics, SBT media join, pupil activities) must remain
     * in sync with releasePupilTopicsHelper, which handles the same logic for bulk scheduled release.
     * Any changes to release logic here must be mirrored there, and vice versa.
     *
     * @param {LwpClassTopic[]} topicsForRelease the topics to release
     * @param {LwpPupil} pupil the pupil to release the topics to
     * @param {LwpSchoolClass} schoolClass the class in which the topics will be released
     * @param {LwpUser} parent the parent to log the action against?
     * @param {EntityManager} [manager] an optional manager to perform the transaction in
     * @return {Promise<string[]>} a promise resolving to an array of created pupil topic IDs
     * @memberof HelperService
     */
    public async topicReleaseHelper(
        topicsForRelease: LwpClassTopic[],
        pupil: LwpPupil,
        schoolClass: LwpSchoolClass,
        parent: LwpUser,
        manager?: EntityManager
    ): Promise<string[]> {
        let topicsReleased = 0;
        const createdTopics = [];
        const pupilActivityRepository: Repository<LwpPupilActivity> = manager
            ? manager.getRepository(LwpPupilActivity)
            : this.pupilActivityRepository;
        const pupilTopicRepository: Repository<LwpPupilTopic> = manager ? manager.getRepository(LwpPupilTopic) : this.pupilTopicRepository;
        const staticLwpMathscotItemRepository: Repository<StaticLwpMathscotItem> = manager
            ? manager.getRepository(StaticLwpMathscotItem)
            : this.staticLwpMathscotItemRepository;
        const setByTeacherStepMediaRepository: Repository<LwpSetByTeacherStepMedia> = manager
            ? manager.getRepository(LwpSetByTeacherStepMedia)
            : this.setByTeacherStepMediaRepository;

        const pupilTopics = await pupilTopicRepository
            .createQueryBuilder('pupilTopic')
            .leftJoin('pupilTopic.pupil', 'pupil')
            .leftJoin('pupilTopic.classTopic', 'classTopic')
            .leftJoin('pupilTopic.topic', 'staticTopic')
            .where('pupil.id = :pupilId', { pupilId: pupil?.id })
            .select(['pupilTopic.id', 'staticTopic.id', 'classTopic.id'])
            .getMany();

        const topicsNeedToBeReleased = topicsForRelease.filter(
            (classTopic) =>
                !pupilTopics.some((pt) => {
                    return (
                        // has a duplicate non-reading pupil topic with no class topic
                        (!classTopic?.topic?.isReading && pt.topic?.id === classTopic?.topic?.id && pt?.classTopic?.id == null) ||
                        // has this class topic already somehow
                        pt?.classTopic?.id === classTopic?.id
                    );
                })
        );

        // releasing class topics with pupil
        const pupilTopicsNeedToCreate = topicsNeedToBeReleased.map((classTopic) => {
            const pupilTopic = new LwpPupilTopic();

            pupilTopic.topic = classTopic.topic;
            pupilTopic.classTopic = classTopic;
            pupilTopic.readingTarget = classTopic?.readingTarget;
            pupilTopic.pupil = pupil;
            pupilTopic.releaseDate = classTopic.releaseDate;
            pupilTopic.watchedVideo = false;
            pupilTopic.period = schoolClass?.period;

            return pupilTopic;
        });

        await pupilTopicRepository.save(pupilTopicsNeedToCreate);

        const pupilTopicByClassTopicId = new Map<string, string>(pupilTopicsNeedToCreate.map((pt) => [pt.classTopic.id, pt.id]));

        const classTopicIds = topicsNeedToBeReleased.map((ct) => ct.id);

        if (classTopicIds.length > 0) {
            const sbtMedia = await setByTeacherStepMediaRepository
                .createQueryBuilder('sbtm')
                .select(['sbtm.id', 'ct.id'])
                .innerJoin('sbtm.classTopic', 'ct')
                .where('ct.id IN (:...classTopicIds)', { classTopicIds })
                .getMany();

            if (sbtMedia.length > 0) {
                const sbtMediaByClassTopic = new Map<string, string[]>();

                for (const item of sbtMedia) {
                    const existing = sbtMediaByClassTopic.get(item.classTopic.id) ?? [];

                    existing.push(item.id);
                    sbtMediaByClassTopic.set(item.classTopic.id, existing);
                }

                const pairs: [string, string][] = [];

                for (const [classTopicId, mediaIds] of sbtMediaByClassTopic) {
                    const pupilTopicId = pupilTopicByClassTopicId.get(classTopicId);

                    if (!pupilTopicId) continue;

                    for (const mediaId of mediaIds) {
                        pairs.push([mediaId, pupilTopicId]);
                    }
                }

                if (pairs.length > 0) {
                    await (manager ?? this.connection)
                        .createQueryBuilder()
                        .insert()
                        .into('lwp_pupil_topic_sbt_step_media')
                        .values(
                            pairs.map(([mediaId, pupilTopicId]) => ({ lwpSetByTeacherStepMediaId: mediaId, lwpPupilTopicId: pupilTopicId }))
                        )
                        .orIgnore()
                        .execute();
                }
            }
        }

        const activitiesNeedToCreate = [];

        for (const [ind, classTopic] of topicsNeedToBeReleased.entries()) {
            const pupilTopic = pupilTopicsNeedToCreate[ind];

            createdTopics.push(pupilTopic.id);

            // generate parent logs - start
            const logParentPupilAction = new LogParentPupilActionInput();

            logParentPupilAction.actionId = LogParentPupilActions.topic_released.id;
            logParentPupilAction.parentId = parent?.id ? parent?.id : null;
            logParentPupilAction.userId = parent?.id ? parent?.id : null;
            logParentPupilAction.pupilId = pupil?.id;
            logParentPupilAction.param1 = pupilTopic.topic.id;
            logParentPupilAction.param2 = pupilTopic.id;

            await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilAction, null, manager ?? null);

            // generate parent logs - end
            if (classTopic?.topic?.activities?.length > 0) {
                const mathscotItemIds = await staticLwpMathscotItemRepository.find({
                    where: {
                        theme: In(schoolClass.yearGroup.mathscotThemes),
                        sequenceOrder: ++topicsReleased
                    },
                    select: ['id']
                });

                for (const activity of classTopic.topic.activities) {
                    if (activity.isHidden) continue;

                    const pupilActivity = new LwpPupilActivity();

                    pupilActivity.pupil = pupil;
                    pupilActivity.activity = activity;

                    pupilActivity.topic = pupilTopic;
                    pupilActivity.earnedStar = false;
                    pupilActivity.logCreatedAt = new Date();
                    pupilActivity.mathscotActivityItemIds = mathscotItemIds.map((item) => item.id);

                    if (pupilTopicsNeedToCreate[ind].activities) {
                        pupilTopicsNeedToCreate[ind].activities.push(pupilActivity);
                    } else {
                        pupilTopicsNeedToCreate[ind].activities = [pupilActivity];
                    }

                    activitiesNeedToCreate.push(pupilActivity);
                }
            }
        }

        await pupilActivityRepository.save(activitiesNeedToCreate);

        // update school class status
        await this.updateSchoolClassStats(schoolClass.id, manager ?? null);

        return createdTopics;
    }

    public isCardImage(url: string): boolean {
        return url?.includes('-1cardImage1');
    }

    public async getSchoolIdForEmailTemplate(user: LwpUser): Promise<string> {
        if (user?.type === UserType.ADMIN) {
            return null;
        }

        if (user?.type === UserType.TEACHER) {
            const teacher = await this.userRepository.findOne({ where: { id: user?.id }, relations: ['school'] });

            return teacher?.school?.id ?? null;
        }

        if (user?.type === UserType.PARENT) {
            const parent = await this.userRepository.findOne({
                where: { id: user?.id },
                relations: ['pupils', 'pupils.pupil', 'pupils.pupil.school']
            });

            if (parent) {
                const schoolIds = parent?.pupils
                    ?.map((pupilParent) => {
                        return pupilParent?.pupil?.school?.id;
                    })
                    .filter((id) => id);

                const uniqueSchoolIds = Array.from(new Set(schoolIds));

                if (uniqueSchoolIds.length === 1) {
                    return uniqueSchoolIds[0];
                }
            }
        }

        return null;
    }

    public isValidUrlForActivityStep(url: string, fileIdentifier: string): boolean {
        return url?.includes(fileIdentifier);
    }

    public secondsToDDHHMMSS(seconds: number): string {
        seconds = Number(seconds);
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        return `${d < 10 ? '0' + d : d}:${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }

    public async addStepFiles(steps: ActivityStepInput[], files: FileUpload[]): Promise<void> {
        for (const step of steps) {
            switch (step.stepType) {
                case ActivityStepType.TEXT_AND_IMAGE:
                    if (files.length > 0) {
                        const textAndImageFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, step?.fileIdentifier)
                        );

                        if (textAndImageFile) {
                            const filename = `${textAndImageFile?.filename}`;

                            await this.uploadFile(
                                `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,

                                textAndImageFile,

                                true
                            );

                            step.imageUrl = filename;
                        }
                    }

                    continue;

                case ActivityStepType.IMAGE:
                    if (files.length > 0) {
                        const imageFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, step?.fileIdentifier)
                        );

                        if (imageFile) {
                            const filename = `${imageFile?.filename}`;

                            await this.uploadFile(
                                `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,

                                imageFile,

                                true
                            );

                            step.imageUrl = filename;
                        }
                    }

                    continue;

                case ActivityStepType.DOWNLOAD:
                    if (files.length > 0) {
                        const downloadFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, step?.fileIdentifier)
                        );

                        if (downloadFile) {
                            const filename = `${downloadFile?.filename}`;

                            await this.uploadFile(`${appConstants.minioPaths.public.fileActivitySteps}/${filename}`, downloadFile, true);

                            step.downloadUrl = filename;
                        }
                    }

                    continue;

                case ActivityStepType.AUDIO:
                    if (files.length > 0) {
                        const audioFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, step?.fileIdentifier)
                        );

                        if (audioFile) {
                            const filename = `${audioFile?.filename}`;

                            await this.uploadFile(
                                `${appConstants.minioPaths.public.fileActivitySteps}/${filename}`,

                                audioFile,

                                true
                            );

                            step.audioUrl = filename;
                        }
                    }

                    continue;

                case ActivityStepType.IMAGE_CAROUSEL:
                    const imageCarouselData = JSON.parse(step?.imageCarouselData);

                    // Resolve all promises in the files array
                    const resolvedFiles = await Promise.all(files.map(async (filePromise) => await filePromise));

                    if (imageCarouselData?.length > 0) {
                        for (const imageCarousel of imageCarouselData) {
                            const imageCarouselFile = resolvedFiles.find((fileUpload) =>
                                this.isValidUrlForActivityStep(fileUpload?.filename, imageCarousel?.fileIdentifier)
                            );

                            if (imageCarouselFile) {
                                const filename = `${imageCarouselFile?.filename}`;

                                await this.uploadFile(
                                    `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                    imageCarouselFile,
                                    true
                                );
                                imageCarousel.imageUrl = filename;
                            }
                        }

                        step.imageCarouselData = JSON.stringify(imageCarouselData);
                    }

                    continue;

                case ActivityStepType.CAROUSEL:
                    const carouselData = step?.carouselData;

                    const resolvedCarouselFiles = await Promise.all(files.map(async (filePromise) => await filePromise));

                    if (carouselData?.length > 0) {
                        for (const imageCarousel of carouselData) {
                            if (imageCarousel?.type === carouselType.IMAGE) {
                                const imageCarouselFile = resolvedCarouselFiles.find((fileUpload) =>
                                    this.isValidUrlForActivityStep(fileUpload?.filename, imageCarousel?.fileIdentifier)
                                );

                                if (imageCarouselFile) {
                                    const filename = `${imageCarouselFile?.filename}`;

                                    await this.uploadFile(
                                        `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                        imageCarouselFile,
                                        true
                                    );
                                    imageCarousel.imageUrl = filename;
                                }
                            }
                        }

                        step.carouselData = carouselData;
                    }

                    continue;

                case ActivityStepType.DIGITAL_CHECKLIST:
                    const checklistImageData = JSON.parse(step?.checklistImageData);

                    if (checklistImageData?.length > 0) {
                        for (const checklistImage of checklistImageData) {
                            const imageCarouselFile = files.find((fileUpload) =>
                                this.isValidUrlForActivityStep(fileUpload?.filename, checklistImage?.fileIdentifier)
                            );

                            if (imageCarouselFile) {
                                const filename = `${imageCarouselFile?.filename}`;

                                await this.uploadFile(
                                    `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                    imageCarouselFile,
                                    true
                                );
                                checklistImage.imageUrl = filename;
                            }
                        }

                        step.checklistImageData = JSON.stringify(checklistImageData);
                    }

                    continue;

                case ActivityStepType.SET_BY_TEACHER:
                    // No file upload here — the actual media is uploaded by the teacher via a separate mutation.
                    continue;

                default:
                    continue;
            }
        }
    }

    public extractUserAgentFromContext(@Context() context): string {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawHeaders: any = Array.from(context?.req?.rawHeaders);

        let authIndex = rawHeaders.findIndex((item: string) => item === 'User-Agent');

        if (authIndex === -1) {
            authIndex = rawHeaders.findIndex((item: string) => item === 'user-agent');
        }

        if (authIndex === -1) return null;

        return rawHeaders?.[authIndex + 1];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getParsedObjectFromValue(value: string): Record<string, any> {
        if (!value) return {};
        const valueStringified = JSON.stringify(value);

        return JSON.parse(valueStringified);
    }

    public extractDeviceTypeFromContext(@Context() context): DeviceType {
        const parser = new UAParser(context?.headers?.['user-agent'] ?? this.extractUserAgentFromContext(context));

        return parser?.getDevice()?.type === 'mobile' || parser?.getDevice()?.type === 'tablet' ? DeviceType.MOBILE : DeviceType.DESKTOP;
    }

    public async updateStepFiles(
        steps: StaticLwpActivitySteps[],
        inputSteps: UpdateActivityStepInput[],
        files: FileUpload[]
    ): Promise<void> {
        for (const step of steps) {
            // Every case below copies fields across explicitly, one at a time, per step type, so
            // anything not named there is silently dropped on edit rather than erroring.
            // visibilityRules applies to every step type equally, so it is assigned once here
            // instead of being repeated in all twenty-odd branches, where the next step type
            // added would inevitably forget it. Each branch's own save(step) persists it.
            const inputStep = inputSteps.find((s) => s.id === step.id);

            if (inputStep) step.visibilityRules = inputStep?.visibilityRules ?? null;

            switch (step.stepType) {
                case ActivityStepType.TEXT_AND_IMAGE:
                    const textAndImageStep = inputSteps.find((s) => s.id === step.id);

                    if (textAndImageStep) {
                        step.text = textAndImageStep?.text;
                        step.order = textAndImageStep.order;
                        if (step.imageUrl && !textAndImageStep.hasFile) {
                            await this.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step.imageUrl}`, true);
                            step.imageUrl = null;
                        }

                        const textAndImageFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, textAndImageStep?.fileIdentifier)
                        );

                        if (textAndImageFile) {
                            const filename = `${textAndImageFile?.filename}`;

                            await this.uploadFile(
                                `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                textAndImageFile,
                                true
                            );
                            step.imageUrl = filename;
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step?.imageUrl}`, true);
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.IMAGE:
                    const imageStep = inputSteps.find((s) => s.id === step.id);

                    if (imageStep) {
                        step.text = imageStep?.text;
                        step.order = imageStep.order;
                        if (step.imageUrl && !imageStep.hasFile) {
                            await this.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step.imageUrl}`, true);
                            step.imageUrl = null;
                        }

                        const imageFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, imageStep?.fileIdentifier)
                        );

                        if (imageFile) {
                            const filename = `${imageFile?.filename}`;

                            await this.uploadFile(`${appConstants.minioPaths.public.imageActivitySteps}/${filename}`, imageFile, true);
                            step.imageUrl = filename;
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step?.imageUrl}`, true);
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.DOWNLOAD:
                    const downloadStep = inputSteps.find((s) => s.id === step.id);

                    if (downloadStep) {
                        step.downloadName = downloadStep?.downloadName;
                        step.order = downloadStep?.order;
                        step.btnType = downloadStep?.btnType;

                        if (step.downloadUrl && !downloadStep.hasFile) {
                            await this.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${step.downloadUrl}`, true);
                            step.downloadUrl = null;
                        }

                        const downloadFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, downloadStep?.fileIdentifier)
                        );

                        if (downloadFile) {
                            const filename = `${downloadFile?.filename}`;

                            await this.uploadFile(`${appConstants.minioPaths.public.fileActivitySteps}/${filename}`, downloadFile, true);
                            step.downloadUrl = filename;
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.removeFile(`${appConstants.minioPaths.public.imageActivitySteps}/${step?.downloadUrl}`, true);
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.LINK:
                    const linkStep = inputSteps.find((s) => s.id === step.id);

                    if (linkStep) {
                        step.linkName = linkStep?.linkName;
                        step.order = linkStep?.order;
                        step.linkUrl = linkStep?.linkUrl;
                        step.btnType = linkStep?.btnType;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.MODAL_WITH_CLICKABLE_ALPHABET:
                    const clickableAlphanbetStep = inputSteps.find((s) => s.id === step.id);

                    if (clickableAlphanbetStep) {
                        step.stepType = clickableAlphanbetStep?.stepType;
                        step.order = clickableAlphanbetStep?.order;
                        step.text = clickableAlphanbetStep.text;
                        step.clickableAlphabetData = clickableAlphanbetStep?.clickableAlphabetData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.AUDIO:
                    const audioStep = inputSteps.find((s) => s.id === step.id);

                    if (audioStep) {
                        step.order = audioStep?.order;
                        if (step.audioUrl && !audioStep.hasFile) {
                            await this.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${step.audioUrl}`, true);
                            step.audioUrl = null;
                        }

                        const audioFile = files.find((fileUpload) =>
                            this.isValidUrlForActivityStep(fileUpload?.filename, audioStep?.fileIdentifier)
                        );

                        if (audioFile) {
                            const filename = `${audioFile?.filename}`;

                            await this.uploadFile(`${appConstants.minioPaths.public.fileActivitySteps}/${filename}`, audioFile, true);
                            step.audioUrl = filename;
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.removeFile(`${appConstants.minioPaths.public.fileActivitySteps}/${step?.audioUrl}`, true);
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.IMAGE_CAROUSEL:
                    const imageCarouselStep = inputSteps.find((s) => s.id === step.id);

                    if (imageCarouselStep) {
                        step.stepType = imageCarouselStep?.stepType;
                        step.order = imageCarouselStep?.order;
                        step.dimensions = imageCarouselStep?.dimensions;
                        step.properties = JSON.parse(imageCarouselStep?.properties);

                        const parseImageCarouselData = JSON.parse(imageCarouselStep?.imageCarouselData);

                        if (parseImageCarouselData?.length > 0) {
                            for (const imageCarouselDataObj of parseImageCarouselData) {
                                if (files.length > 0) {
                                    const imageCarouselDataObjFile = files.find((fileUpload) =>
                                        this.isValidUrlForActivityStep(fileUpload?.filename, imageCarouselDataObj?.fileIdentifier)
                                    );

                                    if (imageCarouselDataObjFile) {
                                        const filename = `${imageCarouselDataObjFile?.filename}`;

                                        await this.uploadFile(
                                            `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                            imageCarouselDataObjFile,
                                            true
                                        );
                                        imageCarouselDataObj.imageUrl = filename;
                                    } else {
                                        imageCarouselDataObj.imageUrl =
                                            imageCarouselDataObj?.imageUrl?.split('/')?.[
                                                imageCarouselDataObj?.imageUrl?.split('/')?.length - 1
                                            ];
                                    }
                                } else {
                                    imageCarouselDataObj.imageUrl =
                                        imageCarouselDataObj?.imageUrl?.split('/')?.[
                                            imageCarouselDataObj?.imageUrl?.split('/')?.length - 1
                                        ];
                                }
                            }

                            step.imageCarouselData = JSON.stringify(parseImageCarouselData);
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.CAROUSEL:
                    const carouselDataStep = inputSteps.find((s) => s.id === step.id);

                    if (carouselDataStep) {
                        step.stepType = carouselDataStep?.stepType;
                        step.order = carouselDataStep?.order;
                        step.dimensions = carouselDataStep?.dimensions;
                        step.properties = JSON.parse(carouselDataStep?.properties);

                        const parseImageCarouselData = carouselDataStep?.carouselData;

                        if (parseImageCarouselData?.length > 0) {
                            for (const imageCarouselDataObj of parseImageCarouselData) {
                                if (files.length > 0 && imageCarouselDataObj?.type === carouselType.IMAGE) {
                                    const imageCarouselDataObjFile = files.find((fileUpload) =>
                                        this.isValidUrlForActivityStep(fileUpload?.filename, imageCarouselDataObj?.fileIdentifier)
                                    );

                                    if (imageCarouselDataObjFile) {
                                        const filename = `${new Date().getTime()}_${imageCarouselDataObjFile?.filename}`;

                                        await this.uploadFile(
                                            `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                            imageCarouselDataObjFile,
                                            true
                                        );
                                        imageCarouselDataObj.imageUrl = filename;
                                    } else {
                                        imageCarouselDataObj.imageUrl =
                                            imageCarouselDataObj?.imageUrl?.split('/')?.[
                                                imageCarouselDataObj?.imageUrl?.split('/')?.length - 1
                                            ];
                                    }
                                } else {
                                    imageCarouselDataObj.imageUrl =
                                        imageCarouselDataObj?.imageUrl?.split('/')?.[
                                            imageCarouselDataObj?.imageUrl?.split('/')?.length - 1
                                        ];
                                }
                            }

                            step.carouselData = parseImageCarouselData;
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.DIGITAL_CHECKLIST:
                    const digitalChecklistStep = inputSteps.find((s) => s.id === step.id);

                    if (digitalChecklistStep) {
                        step.stepType = digitalChecklistStep?.stepType;
                        step.order = digitalChecklistStep?.order;

                        const parseCheckListImageData = JSON.parse(digitalChecklistStep?.checklistImageData);

                        if (parseCheckListImageData?.length > 0) {
                            for (const checkListImageDataObj of parseCheckListImageData) {
                                if (files.length > 0) {
                                    const imageCarouselDataObjFile = files.find((fileUpload) =>
                                        this.isValidUrlForActivityStep(fileUpload?.filename, checkListImageDataObj?.fileIdentifier)
                                    );

                                    if (imageCarouselDataObjFile) {
                                        const filename = `${imageCarouselDataObjFile?.filename}`;

                                        await this.uploadFile(
                                            `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                            imageCarouselDataObjFile,
                                            true
                                        );
                                        checkListImageDataObj.imageUrl = filename;
                                    } else {
                                        checkListImageDataObj.imageUrl =
                                            checkListImageDataObj?.imageUrl?.split('/')?.[
                                                checkListImageDataObj?.imageUrl?.split('/')?.length - 1
                                            ];
                                    }
                                } else {
                                    checkListImageDataObj.imageUrl =
                                        checkListImageDataObj?.imageUrl?.split('/')?.[
                                            checkListImageDataObj?.imageUrl?.split('/')?.length - 1
                                        ];
                                }
                            }

                            step.checklistImageData = JSON.stringify(parseCheckListImageData);
                        }

                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.TIMER:
                    const timerStep = inputSteps.find((s) => s.id === step.id);

                    if (timerStep) {
                        step.timerData = timerStep?.timerData;
                        step.order = timerStep?.order;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.VIDEO:
                    const videoStep = inputSteps.find((s) => s.id === step.id);

                    if (videoStep) {
                        step.text = videoStep?.text;
                        step.order = videoStep?.order;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.TABS:
                    const tabsStep = inputSteps.find((s) => s.id === step.id);

                    if (tabsStep) {
                        step.stepType = tabsStep?.stepType;
                        step.order = tabsStep?.order;
                        step.tabsData = tabsStep?.tabsData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.STOPWATCH:
                    const stopWatchStep = inputSteps.find((s) => s.id === step.id);

                    if (stopWatchStep) {
                        step.stepType = stopWatchStep?.stepType;
                        step.order = stopWatchStep?.order;
                        step.includeSeconds = stopWatchStep?.includeSeconds;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.DICE:
                    const diceStep = inputSteps.find((s) => s.id === step.id);

                    if (diceStep) {
                        step.properties = JSON.parse(diceStep?.properties);
                        step.order = diceStep?.order;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.TEXTDICE:
                    const textDiceStep = inputSteps.find((s) => s.id === step.id);

                    if (textDiceStep) {
                        step.properties = await this.getTextDiceStepProperties(textDiceStep?.properties, files);
                        step.order = textDiceStep?.order;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.INFANT_FONT:
                    const infantStep = inputSteps.find((s) => s.id === step.id);

                    if (infantStep) {
                        step.stepType = infantStep?.stepType;
                        step.order = infantStep?.order;
                        step.text = infantStep?.text;
                        step.fontSize = infantStep?.fontSize ?? null;
                        step.fontType = infantStep?.fontType;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.TEXT_CAROUSEL:
                    const carouselStep = inputSteps.find((s) => s.id === step.id);

                    if (carouselStep) {
                        step.stepType = carouselStep?.stepType;
                        step.order = carouselStep?.order;
                        step.textCarouselData = carouselStep?.textCarouselData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.ACCORDION:
                    const accordionStep = inputSteps.find((s) => s.id === step.id);

                    if (accordionStep) {
                        step.stepType = accordionStep?.stepType;
                        step.order = accordionStep?.order;
                        step.accordionData = accordionStep?.accordionData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.TEXT_ONLY_DIGITAL_CHECKLIST:
                    const checkListTextStep = inputSteps.find((s) => s.id === step.id);

                    if (checkListTextStep) {
                        step.stepType = checkListTextStep?.stepType;
                        step.order = checkListTextStep?.order;
                        step.checkListTextData = checkListTextStep?.checkListTextData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.TABLE:
                    const tableStep = inputSteps.find((s) => s.id === step.id);

                    if (tableStep) {
                        step.stepType = tableStep?.stepType;
                        step.order = tableStep?.order;
                        step.tableData = tableStep?.tableData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.MODAL:
                    const modalStep = inputSteps.find((s) => s.id === step.id);

                    if (modalStep) {
                        step.stepType = modalStep?.stepType;
                        step.order = modalStep?.order;
                        step.selectedModalId = modalStep?.selectedModalId;
                        step.btnType = modalStep?.btnType;
                        step.text = modalStep?.text;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.EDITOR:
                    const editorStep = inputSteps.find((s) => s.id === step.id);

                    if (editorStep) {
                        step.stepType = editorStep?.stepType;
                        step.order = editorStep?.order;
                        step.editAsHtml = editorStep?.editAsHtml;
                        step.editorState = editorStep.editorState;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        await this.staticLwpActivityStepsRepository.delete(step.id);
                    }

                    continue;

                case ActivityStepType.SET_BY_TEACHER:
                    const setByTeacherStep = inputSteps.find((s) => s.id === step.id);

                    if (setByTeacherStep) {
                        step.stepType = setByTeacherStep?.stepType;
                        step.order = setByTeacherStep?.order;
                        step.setByTeacherData = setByTeacherStep?.setByTeacherData;
                        await this.staticLwpActivityStepsRepository.save(step);
                    } else {
                        const mediaToDelete = await this.setByTeacherStepMediaRepository.find({ where: { step: { id: step.id } } });

                        await this.staticLwpActivityStepsRepository.delete(step.id);

                        if (mediaToDelete.length) {
                            const folder =
                                step.setByTeacherData?.type === SetByTeacherDataType.AUDIO
                                    ? appConstants.minioPaths.public.uploadedSetByTeacherAudio
                                    : appConstants.minioPaths.public.uploadedSetByTeacherImage;

                            await Promise.allSettled(mediaToDelete.map((m) => this.removeFile(`${folder}/${m.filename}`, true)));
                        }
                    }

                    continue;

                default:
                    continue;
            }
        }
    }

    public async getTextDiceStepProperties(properties: string, files: FileUpload[]): Promise<TextDiceProperties> {
        const newProperties = JSON.parse(properties) as TextDiceProperties;
        const newDiceProperties: DiceProperty[] = [];

        await Promise.all(
            newProperties?.diceProperties?.map(async (property) => {
                await Promise.all(
                    property?.images?.map(async (_, imageIndex) => {
                        if (files.length > 0) {
                            const diceStepPropertyFile = files.find((fileUpload) =>
                                this.isValidUrlForActivityStep(fileUpload?.filename, property?.fileIds[imageIndex])
                            );

                            if (diceStepPropertyFile) {
                                const filename = `${diceStepPropertyFile?.filename}`;

                                await this.uploadFile(
                                    `${appConstants.minioPaths.public.imageActivitySteps}/${filename}`,
                                    diceStepPropertyFile,
                                    true
                                );
                                property.images[imageIndex] = filename;
                            }
                        }
                    })
                );
                newDiceProperties.push({ ...property, images: property?.fileNames });
            })
        );

        return {
            ...newProperties,
            diceProperties: newDiceProperties
        };
    }

    public getTextDiceProperties = (properties: TextDiceProperties): TextDiceProperties => {
        let diceProperties = properties.diceProperties || [];

        diceProperties = diceProperties.map((diceProperty) => ({
            ...diceProperty,
            images:
                diceProperty?.images?.length > 0
                    ? diceProperty?.images?.map((image) =>
                          this.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${image}`)
                      )
                    : []
        }));

        return { ...properties, diceProperties };
    };

    public getImageCarouselData = (imageCarouselData: string): string => {
        let parseImageCarouselData = JSON.parse(imageCarouselData);

        parseImageCarouselData = (parseImageCarouselData || [])?.map((imageCarouselObj) => ({
            ...imageCarouselObj,
            imageUrl: imageCarouselObj?.imageUrl
                ? this.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${imageCarouselObj?.imageUrl}`)
                : null
        }));

        return JSON.stringify(parseImageCarouselData);
    };

    public getCarouselData = (imageCarouselData: CarouselData[]): CarouselData[] => {
        return (imageCarouselData || [])?.map((imageCarouselObj) => ({
            ...imageCarouselObj,
            imageUrl:
                imageCarouselObj?.imageUrl && imageCarouselObj?.type === carouselType.IMAGE
                    ? this.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${imageCarouselObj?.imageUrl}`)
                    : null
        }));
    };

    public getChecklistImageData = (checklistImageData: string): string => {
        let parseChecklistImageData = JSON.parse(checklistImageData);

        parseChecklistImageData = (parseChecklistImageData || [])?.map((checkImageObj) => ({
            ...checkImageObj,
            imageUrl: checkImageObj?.imageUrl
                ? this.getPublicUrl(`${appConstants.minioPaths.public.imageActivitySteps}/${checkImageObj?.imageUrl}`)
                : null
        }));

        return JSON.stringify(parseChecklistImageData);
    };

    public getCustomDate = (date: Date, time: string): Date => {
        const momentTime = moment(time, 'HH:mm');

        const momentDate = moment(date).set({
            hour: momentTime.get('hour'),
            minute: momentTime.get('minute'),
            second: momentTime.get('second')
        });

        return new Date(momentDate.format('YYYY-MM-DD HH:mm'));
    };

    public getDateInString(lastRead: Date): string {
        if (!lastRead) return null;

        const currDate = moment().startOf('day');
        const lastReadDate = moment(lastRead).startOf('day');

        const differenceOfDate = currDate?.diff(lastReadDate, 'days');

        if (differenceOfDate <= 13) {
            return `${differenceOfDate} days ago`;
        } else {
            const differenceOfWeeks = currDate?.diff(lastReadDate, 'weeks');

            return `${differenceOfWeeks} weeks ago`;
        }
    }

    public async getTopicReleaseDate(date: Date): Promise<Date> {
        const parameter = await this.parameterService.getParameterByKey('RELEASED_TIME');

        return this.getDateTimeFormat(date, parameter?.value);
    }

    public setStartTimeOfDay(date: Date): Date {
        const startMoment = moment(date);

        startMoment.startOf('day');

        return startMoment.toDate();
    }

    public setStartTimeOfDayForHoliday(date: Date): Date {
        const startMoment = moment(date).utc();

        startMoment.startOf('day');

        return startMoment.toDate();
    }

    public async isDateInHoliday(date: Date, schoolId: string, periodIndex: number): Promise<boolean> {
        const formattedDate = this.setStartTimeOfDay(date);

        const holiday = await this.schoolHolidayRepository
            .createQueryBuilder('holiday')
            .leftJoinAndSelect('holiday.schools', 'school')
            .leftJoinAndSelect('holiday.period', 'period')
            .where('holiday.startDate <= :date', { date: formattedDate })
            .andWhere('holiday.endDate >= :date', { date: formattedDate })
            .andWhere('school.id = :schoolId', { schoolId })
            .andWhere('period.index = :periodIndex', { periodIndex })
            .getOne();

        if (holiday) return true;

        return false;
    }

    public getNextDate = (day: number): Date => {
        const today = moment();
        const currentDay = today.day();

        if (day === currentDay) {
            return today.toDate();
        }

        let daysToAdd = day - currentDay;

        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }

        return moment(today).add(daysToAdd, 'days').toDate();
    };

    public validateSocialLoginInput = (socialLoginParams: SocialLoginParameters): void => {
        if (!socialLoginParams?.accessToken && !socialLoginParams?.expectedEmailOrPhone && !socialLoginParams?.magicLinkToken)
            throw new HttpException('Something went wrong. Please refresh the page and try again.', ErrorStatusCodeEnum._535);
    };

    public async canSendNotification(schoolId?: string, periodIndex?: number, paramKey?: string): Promise<boolean> {
        const daysOfWeekend: string[] = ['Saturday', 'Sunday'];
        const dayName = moment().format('dddd');
        const currDate = new Date();
        let isHoliday = false;

        if (schoolId && periodIndex) isHoliday = await this.isDateInHoliday(currDate, schoolId, periodIndex);
        let key = null;

        if (isHoliday) {
            key = 'WEEKEND_TOPIC_RELEASE_EMAILS';
        } else if (daysOfWeekend.includes(dayName)) {
            key = 'WEEKEND_TOPIC_RELEASE_EMAILS';
        } else {
            key = 'WEEKDAY_TOPIC_RELEASE_EMAILS';
        }

        const timeParameter = await this.parameterService.getParameterByKey(paramKey ?? key);
        const time = timeParameter?.value;

        const date = this.getCustomDate(new Date(), time);

        const difference = moment.duration(moment().diff(date)).asMinutes();

        if (difference >= 0) {
            return true;
        }

        return false;
    }

    public async canSendTeacherNotification(): Promise<boolean> {
        const timeParameter = await this.parameterService.getParameterByKey('TEACHER_NOTIFICATION_TIME');
        const notificationTime = JSON.parse(timeParameter?.value);

        const currentTime = moment();
        const startTime = moment(notificationTime?.startTime, 'HH:mm');
        const endTime = moment(notificationTime?.endTime, 'HH:mm');

        return currentTime.isBetween(startTime, endTime);
    }

    public validateUPN(upn: string): boolean {
        if (
            (process.env.LWP_ENV === LwpBuildType.LOCAL || process.env.LWP_ENV === LwpBuildType.DEV) &&
            upn.startsWith(appConstants.testing.mockUPNPrefix)
        ) {
            return true;
        }

        const letterMapping = {
            A: 0,
            B: 1,
            C: 2,
            D: 3,
            E: 4,
            F: 5,
            G: 6,
            H: 7,
            J: 8,
            K: 9,
            L: 10,
            M: 11,
            N: 12,
            P: 13,
            Q: 14,
            R: 15,
            T: 16,
            U: 17,
            V: 18,
            W: 19,
            X: 20,
            Y: 21,
            Z: 22
        };

        if (!/^[A-Z][0-9]{11}[A-Z0-9]$/.test(upn)) {
            return false;
        }

        const sum = upn
            .substring(1)
            .split('')
            .reduce((accumulator, currentChar, index) => {
                const value = index === 11 ? (letterMapping[currentChar] ?? parseInt(currentChar, 10)) : parseInt(currentChar, 10);

                return accumulator + value * (index + 2);
            }, 0);

        const remainder = sum % 23;

        return letterMapping[upn[0]] === remainder;
    }

    public capitalizeFirstLetter(input: string): string {
        if (!input) return input;

        return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
    }

    public normalizeSchoolYear(yearString: string): number {
        return normaliseSchoolYear(yearString);
    }

    public async updateGroupAcrossClassesLicenseDetails(schoolClassIds: string[], manager?: EntityManager): Promise<void> {
        if (schoolClassIds.length === 0) return;
        const schoolClassRepository: Repository<LwpSchoolClass> = manager
            ? manager.getRepository(LwpSchoolClass)
            : this.schoolClassRepository;

        await schoolClassRepository.query(
            `
                WITH currentPeriod AS (
                    SELECT slp.index 
                    FROM static_lwp_period slp
                    WHERE slp."isCurrentPeriod" = true
                    ORDER BY slp.index DESC
                    LIMIT 1
                ),
                aggregated_values AS (
                    SELECT 
                        lsc.id AS "schoolClassId",
                        COALESCE(BOOL_OR(lsc2."isFullProgramme"), false) AS "isFullProgramme",
                        -- Keep Ready Teddy programme for a group that originated from a pre-admission class, but only
                        -- for the period it was converted for and only while the school itself still has a Ready Teddy
                        -- licence; every other group derives it from its pupils' registration classes.
                        COALESCE(BOOL_OR(
                            (ls."isReadyTeddyAvailable" AND lsc."convertedFromPreAdmissionPeriodIndex" = ls."curentPeriodIndex")
                            OR lsc2."isReadyTeddyEnabled"
                        ), false) AS "isReadyTeddyEnabled",
                        COALESCE(BOOL_OR(lsc2."IsReadingLogsEnabled"), false) AS "IsReadingLogsEnabled"
                    FROM lwp_school_class lsc
                    LEFT JOIN lwp_school ls ON ls.id = lsc."schoolId"
                    LEFT JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
                    LEFT JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                    LEFT JOIN lwp_class_pupil lcp2 ON lcp2."lwpPupilId" = lp.id
                    LEFT JOIN lwp_school_class lsc2 ON lsc2.id = lcp2."lwpSchoolClassId" AND lsc2."isRegistrationClass" = true
                    CROSS JOIN currentPeriod
                    WHERE 
                        lsc.id = ANY($1)
                        AND (lsc2."periodIndex" >= currentPeriod.index OR lsc2."periodIndex" IS NULL)
                    GROUP BY lsc.id
                )
                UPDATE lwp_school_class
                SET 
                    "isFullProgramme" = aggregated_values."isFullProgramme",
                    "isReadyTeddyEnabled" = aggregated_values."isReadyTeddyEnabled",
                    "IsReadingLogsEnabled" = aggregated_values."IsReadingLogsEnabled"
                FROM aggregated_values
                WHERE lwp_school_class.id = aggregated_values."schoolClassId";
            `,
            [schoolClassIds]
        );
    }

    /**
     * Calculates the expected National Curriculum (NC) year for a pupil
     * based on their date of birth and a given school academic year.
     *
     * This follows the standard UK education system rules:
     *
     * KEY RULES:
     * - Academic year runs from 1 September to 31 August
     * - Children start Reception in the September after they turn 4
     * - Children born September-December start school a year later than those born January-August
     * - Reception is considered NC Year 0
     * - Year 1 = NC Year 1, Year 2 = NC Year 2, etc.
     *
     * AGE CUTOFF:
     * - All children in the same school year are born within a 12-month period
     * - Oldest: Born 1 September (turn 5 in Reception)
     * - Youngest: Born 31 August (turn 4 in Reception)
     *
     * @param dob - The pupil's date of birth (JavaScript Date object)
     * @param schoolAcademicYear - The start year of the academic year being checked
     *                            (e.g., for 2025/26 academic year, pass 2025)
     * @returns The expected NC year number:
     *          - 0 = Reception
     *          - 1 = Year 1
     *          - 2 = Year 2
     *          - ...
     *          - 11 = Year 11 (end of secondary)
     *          - 12 = Year 12 (A-levels)
     *          - 13 = Year 13 (A-levels)
     *          - Negative numbers for nursery/pre-school if applicable
     *
     * @example
     * // Child born 13 March 2013, checking academic year 2025/26:
     * // - Turns 4 in March 2017 → starts Reception September 2017 (2017/18)
     * // - Years since Reception: 2025 - 2017 = 8
     * // - Expected NC Year: 8 (Year 8)
     * calculateExpectedNcYear(new Date('2013-03-13'), 2025); // Returns: 8
     *
     * @example
     * // Child born 23 October 2012, checking academic year 2025/26:
     * // - Turns 4 in October 2016 → but autumn-born, so starts Reception September 2017 (2017/18)
     * // - Years since Reception: 2025 - 2017 = 8
     * // - Expected NC Year: 8 (Year 8)
     * calculateExpectedNcYear(new Date('2012-10-23'), 2025); // Returns: 8
     *
     * @example
     * // Child born 15 June 2020, checking academic year 2025/26:
     * // - Turns 4 in June 2024 → starts Reception September 2024 (2024/25)
     * // - Years since Reception: 2025 - 2024 = 1
     * // - Expected NC Year: 1 (Year 1)
     * calculateExpectedNcYear(new Date('2020-06-15'), 2025); // Returns: 1
     *
     * @example
     * // Child born 10 December 2020, checking academic year 2025/26:
     * // - Turns 4 in December 2024 → but autumn-born, so starts Reception September 2025 (2025/26)
     * // - Years since Reception: 2025 - 2025 = 0
     * // - Expected NC Year: 0 (Reception)
     * calculateExpectedNcYear(new Date('2020-12-10'), 2025); // Returns: 0
     *
     */
    public calculateExpectedNcYear(dob: Date, schoolAcademicYear: number): number | null {
        // Validate input
        if (!dob || isNaN(dob.getTime())) {
            return null;
        }

        if (dob > new Date()) {
            return null;
        }

        const birth = moment(dob);

        // Calculate when they turn 4 years old
        const yearTheyTurn4 = birth.year() + 4;

        // Determine when they start Reception
        let receptionStartYear: number;

        if (birth.month() >= 8) {
            // Born September-December: start Reception the year AFTER they turn 4
            receptionStartYear = yearTheyTurn4 + 1;
        } else {
            // Born January-August: start Reception the same year they turn 4
            receptionStartYear = yearTheyTurn4;
        }

        // Calculate how many years have passed since they started Reception
        const yearsSinceReceptionStart = schoolAcademicYear - receptionStartYear;

        // Return NC year (0 = Reception, 1 = Year 1, etc.)
        return yearsSinceReceptionStart;
    }
}

// NOTE: this logic is mirrored by the SQL function normalise_school_year() (see migration
// AddNormaliseSchoolYearFunction). Keep the two in sync when changing the resolution rules.
// The SQL mirror returns NULL where this function returns -999 (unresolvable).
export function normaliseSchoolYear(yearString: string): number {
    const year = yearString.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (year.startsWith('r')) {
        return 0; // Reception is 0
    }

    if (year === 'n' || year === 'n1' || year === 'e1') {
        return -2;
    }

    if (year === 'nursery' || year === 'n2' || year === 'e2') {
        return -1;
    }

    const match = year.match(/-?\d+/);

    if (match) {
        const num = parseInt(match[0], 10);

        // Year 0 (some systems) = Reception
        if (num === 0) return 0;

        return num; // Year 1 = 1, Year 2 = 2, etc.
    }

    return -999; // couldn't parse
}
