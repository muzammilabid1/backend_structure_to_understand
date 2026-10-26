import { HttpException } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { UserType } from 'src/auth/types/UserType';

import { StaticLwpParameter } from '../entities/parameter';
import { DefaultParameters, ErrorStatusCodeEnum, OperationStatus, ParameterInput, UseEmailOption } from '../model';
import { LwpNotificationService } from '../service/lwp_notification.service';
import { ParameterService } from '../service/parameter.service';

@Resolver(() => StaticLwpParameter)
export class ParameterResolver {
    constructor(
        private parameterService: ParameterService,
        private lwpNotificationService: LwpNotificationService
    ) {}

    allowedParams = [
        'LOGIN_PAGE_MSG_TITLE',
        'LOGIN_PAGE_MSG',
        'WEEKDAY_TOPIC_RELEASE_EMAILS',
        'WEEKEND_TOPIC_RELEASE_EMAILS',
        'COMMENT_PHOTO_PERMISSIONS',
        'PARENT_SUPPORT_EMAIL',
        'TEACHER_SUPPORT_EMAIL',
        'MIN_PASSWORD_LENGTH',
        'RELEASED_TIME',
        'CSV_CHUNK_LIMIT',
        'SAVE_USER_AUDIO_AS_MP3',
        'PARENT_SOCIAL_LOGIN_PERMISSIONS',
        'CLASS_LICENCE_PRICE',
        'SET_AUDIO_LIMIT',
        'GENERAL_SUPPORT_PHONE_NUMBER',
        'TEACHER_SUPPORT_PHONE_NUMBER',
        'EMAIL_TEMPLATE_FOR_IMPACT_REPORT',
        'DEFAULT_EMAIL_TEMPLATE_LAYOUT'
    ];

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpParameter])
    async allParameters(): Promise<StaticLwpParameter[]> {
        return await this.parameterService.allParameters();
    }

    @Public()
    @Query(() => [StaticLwpParameter])
    async getParameters(@Args({ name: 'keys', type: () => [String] }) keys: string[]): Promise<StaticLwpParameter[]> {
        const defaultKeys = Object.keys(DefaultParameters);
        const validKeys = keys.filter((key) => defaultKeys.includes(key));

        // Check if there are any keys not in allowedParams
        const secretKeys = validKeys.filter((key) => !this.allowedParams.includes(key));

        if (secretKeys.length > 0) {
            throw new HttpException("You don't have permission to read one of the parameter.", ErrorStatusCodeEnum._403);
        }

        return await this.parameterService.getParameters(validKeys);
    }

    @Public()
    @Query(() => StaticLwpParameter)
    async getParameterByKey(
        @Args({ name: 'key', type: () => String }) key: string,
        @AuthInfo('userType') userType: UserType
    ): Promise<StaticLwpParameter> {
        if (!this.allowedParams.includes(key) && userType !== UserType.ADMIN) {
            throw new HttpException("You don't have permission to read that parameter.", ErrorStatusCodeEnum._403);
        }

        return await this.parameterService.getParameterByKey(key);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpParameter)
    async addParameter(
        @Args({ name: 'input', type: () => ParameterInput }) input: ParameterInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpParameter> {
        return await this.parameterService.addParameter(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpParameter)
    async updateParameter(
        @Args({ name: 'input', type: () => ParameterInput }) input: ParameterInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpParameter> {
        return await this.parameterService.updateParameter(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteParameter(@Args('key') key: string): Promise<OperationStatus> {
        return await this.parameterService.deleteParameter(key);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpParameter)
    async updateImpactReportEmailTemplate(
        @Args('impactReportEmailTemplate') impactReportEmailTemplate: string,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpParameter> {
        const emailParams = this.lwpNotificationService.getEmailTemplateParameters(UseEmailOption.LAYOUT, impactReportEmailTemplate);
        const unknownParams = emailParams.filter(
            (param) =>
                !['RECIPIENT_NAME', 'TERM_NAME', 'SCHOOL_NAME', 'IMPACT_REPORT_MAGIC_LINK', 'SPM_NAME_FOR_URL', 'FIRST_NAME'].includes(
                    param
                )
        );

        if (unknownParams?.length > 0) {
            const response =
                unknownParams?.length === 1
                    ? `${unknownParams?.join(', ')} IS NOT A VALID PARAMETER.`
                    : `${unknownParams?.join(', ')} ARE NOT VALID PARAMETERS.`;

            throw new HttpException(response, ErrorStatusCodeEnum._540);
        }

        const updateParamterInput = {
            key: 'EMAIL_TEMPLATE_FOR_IMPACT_REPORT',
            value: impactReportEmailTemplate
        };

        return await this.parameterService.updateParameter(updateParamterInput, userId);
    }
}
