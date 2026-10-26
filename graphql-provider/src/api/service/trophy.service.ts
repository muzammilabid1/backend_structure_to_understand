import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { BaseEntity, Connection, Repository } from 'typeorm';

import { PupilAndTrophyData } from '../dtos/PupilAndTrophyData';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpTrophy } from '../entities/static_trophy';
import { LwpUser } from '../entities/user';
import { AchievementCertificateData, CertificatePdfDataForTrophy, ErrorStatusCodeEnum, OperationStatus } from '../model';
import { CertificateService } from './certificate.service';
import { HelperService } from './helper.service';
import { PupilService } from './pupil.service';

@Injectable()
export class TrophyService {
    constructor(
        @InjectRepository(LwpPupilTrophy)
        private pupilTrophyRepository: Repository<LwpPupilTrophy>,
        @InjectRepository(StaticLwpTrophy)
        private staticTrophyRepository: Repository<StaticLwpTrophy>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpSchoolClass)
        private lwpSchoolClassRepository: Repository<LwpSchoolClass>,
        private pupilService: PupilService,
        private shallowUserService: ShallowUserService,
        private certificateService: CertificateService,
        private helperService: HelperService,
        private connection: Connection
    ) {}

    public async addTrophyInPupil(pupilId: string, trophyId: string, classId: string, userId?: string): Promise<LwpPupilTrophy> {
        let user: LwpUser;

        if (userId) {
            user = this.shallowUserService.newShallowUser(userId);
        }

        const pupil = await this.pupilRepository.findOne({ where: { id: pupilId }, relations: ['classes', 'trophies', 'trophies.trophy'] });

        if ((pupil?.trophies || [])?.some((pt) => pt?.trophy?.id === trophyId)) {
            throw new HttpException('This pupil has already earned this trophy.', ErrorStatusCodeEnum._535);
        }

        const pupilClass = pupil?.classes?.find((c) => c.id === classId);

        if (!pupil) throw new HttpException('Pupil Not Found', ErrorStatusCodeEnum._535);
        if (!pupilClass) throw new HttpException(`Pupil is not currently in class of id: ${classId}`, ErrorStatusCodeEnum._535);
        const staticTrophy = await this.staticTrophyRepository.findOne({ where: { id: trophyId } });

        if (!staticTrophy) throw new HttpException('Trophy Not Found', ErrorStatusCodeEnum._535);

        const trophy = new LwpPupilTrophy();

        trophy.trophy = staticTrophy;
        trophy.pupil = pupil;
        trophy.schoolClass = pupilClass;
        if (userId) {
            trophy.logCreatedBy = user;
            trophy.logUpdatedBy = user;
        }

        await this.lwpSchoolClassRepository.update({ id: pupilClass?.id }, { trophyEmailsPending: true });

        return this.pupilTrophyRepository.save(trophy);
    }

    public async sendTrophyMailToPupil(): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(LwpPupilTrophy).query(`
                WITH trophyPupils AS (
                    SELECT
                        lpt.id AS "pupilTrophyId",
                        (lp.*)::lwp_pupil AS "lwpPupil",
                        (lvnp.*)::lwp_user AS "lwpUserParent",
                        case lvnp."notificationPreference" when 'EMAILREMINDER' then 'email' when 'SMSREMINDER' then 'phone' else null end AS "notifPreference",
                        lp."schoolId" AS "schoolId",
                        slt.title AS "trophyName"
                    FROM
                        lwp_pupil_trophy lpt
                        JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
                        JOIN static_lwp_trophy slt ON slt.id = lpt."trophyId"
                            AND slt."isPupilMail"
                        JOIN lwp_pupil_parent lpp ON lp.id = lpp."pupilId"
                        JOIN lwp_view_notifiable_parents lvnp ON lvnp.id = lpp."parentId"
                    WHERE
                        lpt."lastCertificateEmailSent" IS NULL
                ),
                topicMagicLinks AS (
                    INSERT INTO lwp_magic_link ("userId", "pupilId", "type", "context")
                        SELECT
                            ("lwpUserParent").id,
                            ("lwpPupil").id,
                            'TROPHY',
                            jsonb_build_object('trophyId', "pupilTrophyId")
                        FROM
                            trophyPupils
                        RETURNING
                            "userId",
                            "url",
                            "pupilId"
                ),
                generatedNotifs AS (
                    INSERT INTO lwp_notification OVERRIDING USER VALUE
                        SELECT
                            (gen_notif_data ("lwpUserParent", "notifPreference", 'sendTrophyMailToParent', FALSE, jsonb_build_object(
                                'PUPILID', (tp."lwpPupil").id,
                                'CHILDFIRSTNAME', (tp."lwpPupil").firstname,
                                'CHILDLASTNAME', (tp."lwpPupil").lastname,
                                'TROPHYNAME', tp."trophyName",
                                'MESSAGE', 'Congratulations',
                                'MAGICID', tml.url))
                            ).*
                        FROM
                            trophyPupils tp
                            JOIN topicMagicLinks tml ON (tp."lwpUserParent").id = tml."userId"
                                AND (tp."lwpPupil").id = tml."pupilId"
                )
                UPDATE
                    lwp_pupil_trophy lpt
                SET
                    "lastCertificateEmailSent" = CURRENT_TIMESTAMP
                WHERE
                    lpt.id IN (
                        SELECT
                            "pupilTrophyId"
                        FROM
                            trophyPupils
                    );
            `);
        });
    }

    public async getTrophiesOfPupil(pupilId: string): Promise<LwpPupilTrophy[]> {
        return (await this.pupilTrophyRepository.find({ where: { pupil: { id: pupilId } } })) ?? [];
    }

    public async getPupilOfTrophy(trophyId: string): Promise<LwpPupil> {
        const pupilTrophy = await this.pupilTrophyRepository.findOne({ where: { id: trophyId }, relations: ['pupil'] });

        return pupilTrophy?.pupil ?? null;
    }

    public async getAssignerOfTrophy(trophyId: string): Promise<LwpUser> {
        const pupilTrophy = await this.pupilTrophyRepository.findOne({ where: { id: trophyId }, relations: ['logCreatedBy'] });

        return pupilTrophy?.logCreatedBy ?? null;
    }

    public async getStaticTrophyOfTrophy(trophyId: string): Promise<Omit<StaticLwpTrophy, keyof BaseEntity>> {
        const pupilTrophy = await this.pupilTrophyRepository.findOne({ where: { id: trophyId }, relations: ['trophy'] });

        return pupilTrophy?.trophy
            ? {
                  ...pupilTrophy?.trophy,
                  logo: pupilTrophy?.trophy.logo
                      ? this.helperService.getPublicUrl(`${appConstants.minioPaths.public.trophies}/${pupilTrophy?.trophy?.logo}`)
                      : null,
                  certificate: pupilTrophy?.trophy?.certificate ? JSON.stringify(pupilTrophy?.trophy?.certificate) : null,
                  certificatePdf: pupilTrophy?.trophy?.certificatePdf
                      ? this.helperService.getPublicUrl(
                            `${appConstants.minioPaths.public.staticCertificates}/${pupilTrophy?.trophy.certificatePdf}`
                        )
                      : null
              }
            : null;
    }

    public async getSchoolClassOfTrophy(trophyId: string): Promise<LwpSchoolClass> {
        const pupilTrophy = await this.pupilTrophyRepository.findOne({ where: { id: trophyId }, relations: ['schoolClass'] });

        return pupilTrophy?.schoolClass ?? null;
    }

    public async deletePupilTrophy(id: string): Promise<OperationStatus> {
        const res = await this.pupilTrophyRepository.delete(id);

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async generateTrophyCertificates(pupilData: AchievementCertificateData[]): Promise<string> {
        const pupilAndTrophyData: PupilAndTrophyData[] = [];

        for (const { pupilId, trophyId, lwpSchoolClassId } of pupilData) {
            const pupil = await this.pupilRepository.findOne({ where: { id: pupilId }, relations: ['allTopics'] });
            const trophy = await this.pupilTrophyRepository.findOne({ where: { id: trophyId }, relations: ['trophy'] });
            const lwpSchoolClass = await this.lwpSchoolClassRepository.findOne({
                where: { id: lwpSchoolClassId },
                relations: ['mainTeacher']
            });
            const pupilMathscotUrl = await this.pupilService.pupilMathscotUrl(pupil);

            pupilAndTrophyData.push({ pupil, trophy, lwpSchoolClass, pupilMathscotUrl: pupilMathscotUrl?.bigImage });
        }

        if (pupilAndTrophyData.length > 0) {
            const data: CertificatePdfDataForTrophy[] = pupilAndTrophyData.map((p) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const certificate: any = p?.trophy?.trophy?.certificate;

                certificate['fileName'] = this.helperService.getPublicUrl(
                    `${appConstants.minioPaths.public.staticCertificates}/${p?.trophy?.trophy?.certificatePdf ?? 'EasterEggspert.pdf'}`
                );

                return this.helperService.generateDataForTrophyCertificate(certificate, p?.pupil, p?.lwpSchoolClass, p?.pupilMathscotUrl);
            });

            return this.certificateService.generateTrophyCertificatesForPupils(data);
        }

        throw new HttpException('Invalid id', 400);
    }

    public async trophiesAssignedToPupils(): Promise<void> {
        await this.connection.transaction(async (manager) => {
            await manager.query(
                `SET LOCAL statement_timeout = ${process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? '0' : "'300s'"}`
            );

            await manager.getRepository(StaticLwpTrophy).query(`
                WITH updatedClasses AS (
                    INSERT INTO lwp_pupil_trophy ("trophyId", "pupilId", "schoolClassId")
                    SELECT
                        slt.id,
                        lp.id,
                        lsc.id -- literally just a copy of their current registration class
                    FROM
                        lwp_pupil lp
                        JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
                        JOIN lwp_school ls ON ls.id = lp."schoolId"
                            AND NOT ls.inactive
                        JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                            AND lsc."isRegistrationClass"
                            AND lsc."periodIndex" >= ls."curentPeriodIndex"
                        JOIN static_lwp_topic rt ON rt."isReading" = true
                        JOIN lwp_pupil_topic lpt ON lp.id = lpt."pupilId"
                            AND lpt."topicId" != rt.id
                            AND lpt."periodIndex" >= ls."curentPeriodIndex"
                        JOIN static_lwp_topic_domain_year_group sltdyg on lpt."topicId" = sltdyg."topicId"
                        JOIN static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"                        
                        JOIN static_lwp_trophy slt ON daterange(slt."startDate"::date, slt."endDate"::date) @> lpt."releaseDate"
                            AND slt."isActive"
                    	JOIN lwp_trophy_subjects lts ON lts."staticLwpTrophyId" = slt.id AND lts."staticLwpSubjectId" = sltd."subjectId"
                    GROUP BY
                        lp.id,
                        slt.id,
                        lsc.id
                    HAVING
                        count(lpt.id) FILTER (WHERE NOT lpt."earnedGoldStar") = 0
                        AND count(lpt.id) > 0 -- don't issue to people with no relevant topics!
                    ON CONFLICT DO NOTHING -- don't error when we try to release twice(!)
                    RETURNING "schoolClassId"
                )
                UPDATE lwp_school_class SET "trophyEmailsPending" = true WHERE id IN (SELECT DISTINCT "schoolClassId" FROM updatedClasses);
            `);
        });
    }
}
