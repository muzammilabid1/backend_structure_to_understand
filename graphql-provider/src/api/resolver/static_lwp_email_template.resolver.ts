import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import moment from 'moment';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { LwpNotification } from '../entities/lwp_notification';
import { StaticLwpEmailTemplate } from '../entities/static_lwp_email_template';
import {
    AddEmailTemplateInput,
    EmailTemplatePreviewInput,
    EmailTemplateTypes,
    MessageLogFilterInput,
    MessageLogsCountOutput,
    OperationStatus,
    UpdateEmailTemplateInput
} from '../model';
import { StaticLwpEmailTemplateService } from '../service/static_lwp_email_template.service';

@Resolver(() => StaticLwpEmailTemplate)
export class StaticLwpEmailTemplateResolver {
    constructor(private emailTemplateService: StaticLwpEmailTemplateService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [String])
    getAllEmailTemplateTypes(): string[] {
        return Object.keys(EmailTemplateTypes).filter((key) => isNaN(Number(key)) && key !== EmailTemplateTypes.deprecatedTemplate);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpEmailTemplate])
    async getEmailTemplates(): Promise<StaticLwpEmailTemplate[]> {
        return this.emailTemplateService.getEmailTemplates();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpEmailTemplate)
    async getEmailTemplate(@Args({ name: 'id' }) id: string): Promise<StaticLwpEmailTemplate> {
        return this.emailTemplateService.getEmailTemplate(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpEmailTemplate)
    async createEmailTemplate(
        @Args({ name: 'input' }) input: AddEmailTemplateInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpEmailTemplate> {
        return this.emailTemplateService.createEmailTemplate(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpEmailTemplate)
    async updateEmailTemplate(
        @Args({ name: 'input', type: () => UpdateEmailTemplateInput }) input: UpdateEmailTemplateInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpEmailTemplate> {
        return this.emailTemplateService.updateEmailTemplate(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async removeDraftEmailTemplate(@Args({ name: 'id' }) id: string): Promise<OperationStatus> {
        return this.emailTemplateService.removeDraftEmailTemplate(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteEmailTemplate(@Args({ name: 'id' }) id: string): Promise<OperationStatus> {
        return this.emailTemplateService.deleteEmailTemplate(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => String)
    async emailTemplatePreview(
        @Args({ name: 'input', type: () => EmailTemplatePreviewInput }) input: EmailTemplatePreviewInput
    ): Promise<string> {
        return this.emailTemplateService.emailTemplatePreview(input);
    }

    @ResolveField()
    async draft(@Parent() emailTemplate: StaticLwpEmailTemplate): Promise<StaticLwpEmailTemplate> {
        return await this.emailTemplateService.getDraftEmailTemplate(emailTemplate?.type);
    }

    @ResolveField()
    async messageLogCount(@Parent() emailTemplate: StaticLwpEmailTemplate): Promise<MessageLogsCountOutput> {
        // Purpose: Fetch message log counts for the past 3 months based on the email template type.
        // This is used to render past 3 months statistics on the static email template list.

        const input: MessageLogFilterInput = {
            emailType: emailTemplate?.type,
            from: moment().subtract(90, 'days').toDate(),
            until: moment().endOf('day').toDate()
        };

        return this.emailTemplateService.getMessageLogsCount(input);
    }

    @ResolveField(() => LwpNotification)
    async lwpNotification(@Parent() emailTemplate: StaticLwpEmailTemplate): Promise<LwpNotification> {
        return await this.emailTemplateService.getLastNotificationOfEmailTemplate(emailTemplate?.id);
    }

    @ResolveField(() => [String])
    async badParams(@Parent() emailTemplate: StaticLwpEmailTemplate): Promise<string[]> {
        return await this.emailTemplateService.getBadParamsOfEmailTemplate(
            emailTemplate?.type,
            emailTemplate?.logUpdatedAt,
            emailTemplate?.id
        );
    }
}
