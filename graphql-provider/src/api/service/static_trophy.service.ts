import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import moment from 'moment';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTrophy } from '../entities/static_trophy';
import {
    CertificatePdfDataForTrophy,
    ErrorStatusCodeEnum,
    OperationStatus,
    StaticLwpTrophyInput,
    TrophyCertificateFieldName,
    UpdateStaticLwpTrophyInput
} from '../model';
import { CertificateService } from './certificate.service';
import { HelperService } from './helper.service';

@Injectable()
export class StaticTrophyService {
    constructor(
        @InjectRepository(StaticLwpTrophy)
        private trophyRepository: Repository<StaticLwpTrophy>,
        @InjectRepository(StaticLwpSubject)
        private subjectRepository: Repository<StaticLwpSubject>,
        private helperService: HelperService,
        private certificateService: CertificateService,
        private shallowUserService: ShallowUserService
    ) {}

    public async getTrophyById(id: string): Promise<StaticLwpTrophy> {
        const trophy = await this.trophyRepository.findOne({ where: { id } });

        if (!trophy) throw new HttpException('Trophy does not exist', 535);

        trophy.logo = trophy.logo ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.trophies}/${trophy.logo}`) : null;
        trophy.certificate = trophy?.certificate ? JSON.stringify(trophy?.certificate) : null;
        trophy.certificatePdf = trophy?.certificatePdf
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${trophy.certificatePdf}`)
            : null;

        return trophy;
    }

    public async getRecentStaticTrophy(): Promise<StaticLwpTrophy> {
        const trophies = await this.trophyRepository.find({ where: { endDate: LessThanOrEqual(moment()) } });

        if (!trophies?.length) throw new HttpException('Trophy certificate does not exist', 535);

        const recentTrophy = (trophies || []).sort((a, b) => {
            if (a?.endDate > b?.endDate) {
                return -1;
            }

            if (a?.endDate < b?.endDate) {
                return 1;
            }

            return 0;
        })[0];

        if (!recentTrophy) throw new HttpException('Trophy certificate does not exist', 535);

        recentTrophy.logo = recentTrophy.logo
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.trophies}/${recentTrophy.logo}`)
            : null;
        recentTrophy.certificate = recentTrophy?.certificate ? JSON.stringify(recentTrophy?.certificate) : null;
        recentTrophy.certificatePdf = recentTrophy?.certificatePdf
            ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${recentTrophy.certificatePdf}`)
            : null;

        return recentTrophy;
    }

    public async getTrophies(): Promise<StaticLwpTrophy[]> {
        let trophies = await this.trophyRepository.find();

        trophies = trophies.map((trophy) => {
            trophy.logo = trophy.logo ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.trophies}/${trophy.logo}`) : null;
            trophy.certificate = trophy?.certificate ? JSON.stringify(trophy?.certificate) : null;
            trophy.certificatePdf = trophy?.certificatePdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${trophy.certificatePdf}`)
                : null;

            return trophy;
        });

        return trophies;
    }

    public async getActiveStaticTrophy(): Promise<StaticLwpTrophy[]> {
        let trophies = (await this.trophyRepository.find({ where: { isActive: true }, order: { endDate: 'DESC' } })) ?? [];

        trophies = trophies.map((trophy) => {
            trophy.logo = trophy.logo ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.trophies}/${trophy.logo}`) : null;
            trophy.certificate = trophy?.certificate ? JSON.stringify(trophy?.certificate) : null;
            trophy.certificatePdf = trophy?.certificatePdf
                ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.staticCertificates}/${trophy.certificatePdf}`)
                : null;

            return trophy;
        });

        return trophies;
    }

    public async isActiveStaticTrophyExist(): Promise<boolean> {
        const trophies = await this.trophyRepository.find({ where: { isActive: true } });

        return trophies?.length > 0 ? true : false;
    }

    public async getSubjectsByIds(ids: string[]): Promise<StaticLwpSubject[]> {
        return await this.subjectRepository.find({ where: { id: In(ids) }, select: ['id'] });
    }

    public async createTrophy(input: StaticLwpTrophyInput, file: FileUpload[], userId: string): Promise<StaticLwpTrophy> {
        const trophy = new StaticLwpTrophy();

        trophy.order = input.order;
        trophy.title = input.title;
        trophy.startDate = input.startDate;
        trophy.endDate = input.endDate;
        trophy.isActive = input.isActive;
        trophy.isPupilMail = input.isPupilMail;
        trophy.isTeacherMail = input.isTeacherMail;
        trophy.certificate = JSON.parse(input.certificate);

        if (file && file.length) {
            const fileUploads = await Promise.all(file);

            for (const fileUpload of fileUploads) {
                if (fileUpload && fileUpload?.filename?.includes(input?.logoId)) {
                    const filename = `${fileUpload?.filename?.toLowerCase().replace(/ /g, '_')}`;

                    await this.helperService.uploadFile(`${appConstants.minioPaths.public.trophies}/${filename}`, fileUpload, true);
                    trophy.logo = filename;
                }

                if (fileUpload && fileUpload?.filename?.includes(input?.certificatePdfId)) {
                    const filename = `${fileUpload?.filename?.toLowerCase().replace(/ /g, '_')}`;

                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.staticCertificates}/${filename}`,
                        fileUpload,
                        true
                    );
                    trophy.certificatePdf = filename;
                }
            }
        }

        if (input.subjects && input.subjects.length > 0) {
            trophy.subjects = await this.getSubjectsByIds(input.subjects);
        }

        const user = this.shallowUserService.newShallowUser(userId);

        trophy.logCreatedBy = user;
        trophy.logUpdatedBy = user;

        return this.trophyRepository.save(trophy);
    }

    public async updateTrophy(input: UpdateStaticLwpTrophyInput, file: FileUpload[], userId: string): Promise<StaticLwpTrophy> {
        const trophy = await this.trophyRepository.findOne({ where: { id: input?.id } });

        if (!trophy) throw new HttpException('Trophy does not exist', 535);

        if (file && file.length) {
            const fileUploads = await Promise.all(file);

            for (const fileUpload of fileUploads) {
                if (fileUpload && fileUpload?.filename?.includes(input?.logoId)) {
                    const filename = `${fileUpload?.filename?.toLowerCase().replace(/ /g, '_')}`;

                    await this.helperService.uploadFile(`${appConstants.minioPaths.public.trophies}/${filename}`, fileUpload, true);
                    trophy.logo = filename;
                }

                if (fileUpload && fileUpload?.filename?.includes(input?.certificatePdfId)) {
                    const filename = `${fileUpload?.filename?.toLowerCase().replace(/ /g, '_')}`;

                    await this.helperService.uploadFile(
                        `${appConstants.minioPaths.public.staticCertificates}/${filename}`,
                        fileUpload,
                        true
                    );
                    trophy.certificatePdf = filename;
                }
            }
        }

        trophy.order = input?.order ?? trophy.order;
        trophy.title = input?.title ?? trophy.title;
        trophy.startDate = input?.startDate ?? trophy.startDate;
        trophy.endDate = input?.endDate ?? trophy.endDate;
        trophy.isActive = input?.isActive ?? trophy.isActive;
        trophy.isPupilMail = input?.isPupilMail ?? trophy.isPupilMail;
        trophy.isTeacherMail = input?.isTeacherMail ?? trophy.isTeacherMail;
        trophy.certificate = input?.certificate ? JSON.parse(input?.certificate) : trophy.certificate;

        if (input.subjects && input.subjects.length > 0) {
            trophy.subjects = await this.getSubjectsByIds(input.subjects);
        }

        trophy.logUpdatedBy = this.shallowUserService.newShallowUser(userId);

        return await this.trophyRepository.save(trophy);
    }

    public async deleteTrophy(id: string): Promise<OperationStatus> {
        const res = await this.trophyRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async generateTestCertificate(id: string): Promise<string> {
        const staticTrophy = await this.getTrophyById(id);

        const staticTrophyCertificateData = JSON.parse(staticTrophy?.certificate);

        const testCertificateData: CertificatePdfDataForTrophy = {
            fileName: staticTrophy?.certificatePdf,
            mathscot: staticTrophyCertificateData?.mathscot ?? null,
            fieldData: staticTrophyCertificateData?.fieldData ?? []
        };

        for (const field of testCertificateData.fieldData) {
            switch (field?.fieldName) {
                case TrophyCertificateFieldName.CHILDNAME:
                    field['fieldValue'] = 'John Doe';
                    break;

                case TrophyCertificateFieldName.DATE:
                    field['fieldValue'] = moment().format('DD/MM/YYYY');
                    break;

                case TrophyCertificateFieldName.TOTATSTARS:
                    field['fieldValue'] = '1';
                    break;

                case TrophyCertificateFieldName.TEACHERNAME:
                    field['fieldValue'] = 'Learning With Parents';
                    break;

                default:
                    break;
            }
        }

        if (!testCertificateData?.fileName || !testCertificateData?.fieldData?.length)
            throw new HttpException('Trophy Certificate Not Found', ErrorStatusCodeEnum._535);

        return await this.certificateService.generateTrophyCertificatesForPupils([testCertificateData]);
    }

    public async getTrophySubjects(trophyId: string): Promise<StaticLwpSubject[]> {
        const trophy = await this.trophyRepository.findOne({
            where: { id: trophyId },
            relations: ['subjects'],
            select: ['id']
        });

        return trophy?.subjects || [];
    }
}
