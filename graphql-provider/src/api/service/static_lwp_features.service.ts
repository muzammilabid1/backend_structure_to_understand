import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureCode, FeatureStatus } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { StaticLwpFeatures } from '../entities/static_lwp_features';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { UpdateFeatureInput } from '../model';

@Injectable()
export class StaticLwpFeaturesService {
    constructor(
        @InjectRepository(StaticLwpFeatures)
        private featuresRepository: Repository<StaticLwpFeatures>,
        @InjectRepository(StaticLwpSchoolTag)
        private schoolTagRepository: Repository<StaticLwpSchoolTag>,
        private shallowUserService: ShallowUserService
    ) {}

    public async allFeatures(): Promise<StaticLwpFeatures[]> {
        return await this.featuresRepository.find({ relations: ['schoolTags'] });
    }

    public async getFeatureSchoolTags(featureId: string): Promise<StaticLwpSchoolTag[]> {
        return await this.schoolTagRepository
            .createQueryBuilder('schoolTags')
            .leftJoin('schoolTags.features', 'features')
            .where('features.id = :featureId', { featureId })
            .getMany();
    }

    private featuresBaseQueryForSchool(schoolId: string): SelectQueryBuilder<StaticLwpFeatures> {
        return this.featuresRepository.createQueryBuilder('features').where(
            `(
                features.status = :allSchoolsStatus 
                OR (
                    features.status = :limitedReleaseStatus 
                    AND features.includeSchoolsWithTags = TRUE 
                    AND EXISTS (
                        SELECT 1 
                        FROM lwp_features_school_tags lfst
                        JOIN lwp_school_static_tags lsst ON lfst."staticLwpSchoolTagId" = lsst."tagId" AND lsst."schoolId" = :schoolId
                        WHERE lfst."staticLwpFeaturesId" = features.id 
                    )
                )
                OR (
                    features.status = :limitedReleaseStatus 
                    AND features.includeSchoolsWithTags = FALSE 
                    AND NOT EXISTS (
                        SELECT 1 
                        FROM lwp_features_school_tags lfst
                        JOIN lwp_school_static_tags lsst ON lfst."staticLwpSchoolTagId" = lsst."tagId" AND lsst."schoolId" = :schoolId
                        WHERE lfst."staticLwpFeaturesId" = features.id 
                    )
                )
            )`,
            {
                allSchoolsStatus: FeatureStatus.ALL_SCHOOLS,
                limitedReleaseStatus: FeatureStatus.LIMITED_RELEASE,
                schoolId
            }
        );
    }

    public async getSchoolFeatures(schoolId: string): Promise<StaticLwpFeatures[]> {
        return await this.featuresBaseQueryForSchool(schoolId).getMany();
    }

    public async isReadyTeddyEnabledForSchool(schoolId: string): Promise<boolean> {
        const count = await this.featuresBaseQueryForSchool(schoolId)
            .andWhere('features.code = :readyTeddyCode', { readyTeddyCode: FeatureCode.READY_TEDDY })
            .getCount();

        return count > 0;
    }

    public async isDataImportReviewEnabledForSchool(schoolId: string): Promise<boolean> {
        const count = await this.featuresBaseQueryForSchool(schoolId)
            .andWhere('features.code = :dataImportReviewCode', { dataImportReviewCode: FeatureCode.DATA_IMPORT_REVIEW })
            .getCount();

        return count > 0;
    }

    public async isScrapbookEnabledForSchool(schoolId: string): Promise<boolean> {
        const count = await this.featuresBaseQueryForSchool(schoolId)
            .andWhere('features.code = :scrapbookPromptCode', {
                scrapbookPromptCode: FeatureCode.READY_TEDDY_SCRAPBOOK_PROMPT
            })
            .getCount();

        return count > 0;
    }

    public async updateFeature(input: UpdateFeatureInput, userId: string): Promise<void> {
        const user = this.shallowUserService.newShallowUser(userId);

        // Fetch the existing feature entity
        const feature = await this.featuresRepository.findOne({
            where: { id: input.id },
            relations: ['schoolTags'] // Ensure schoolTags are included in the fetch
        });

        if (!feature) {
            throw new Error('Feature not found');
        }

        // Update properties
        feature.status = input.status;
        feature.description = input.description;
        feature.includeSchoolsWithTags = input.includeSchoolsWithTags;
        feature.logCreatedBy = user;

        // Handle many-to-many relationship update
        if (input.status === FeatureStatus.LIMITED_RELEASE && input.schoolTagIds.length > 0) {
            const schoolTags = await this.schoolTagRepository.findByIds(input.schoolTagIds);

            feature.schoolTags = schoolTags; // Assign new schoolTags
        } else {
            feature.schoolTags = []; // Clear the schoolTags if not applicable
        }

        // Save the updated entity
        await this.featuresRepository.save(feature);
    }
}
