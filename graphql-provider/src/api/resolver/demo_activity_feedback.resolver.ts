import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { LwpDemoActivityFeedback } from '../entities/demo_activity_feedback';
import { DemoActivityFeedbackInput, OperationStatus } from '../model';
import { DemoActivityFeedbackService } from '../service/demo_activity_feedback.service';
@Resolver(() => LwpDemoActivityFeedback)
export class DemoActivityFeedbackResolver {
    constructor(private demoActivityFeedbackService: DemoActivityFeedbackService) {}

    @Public()
    @Mutation(() => LwpDemoActivityFeedback)
    async saveDemoActivityFeedback(
        @Args({ name: 'input' }) input: DemoActivityFeedbackInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @Context() context
    ): Promise<LwpDemoActivityFeedback> {
        return await this.demoActivityFeedbackService.saveDemoActivityFeedback(input, file, context);
    }

    @AuthorizeEndpoint([LwpDemoActivityFeedback, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteDemoFeedback(@Args({ name: 'id' }) id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.demoActivityFeedbackService.deleteDemoFeedback(id, userId);
    }

    @AuthorizeEndpoint([LwpDemoActivityFeedback, OpType.Write, 'id'])
    @Mutation(() => LwpDemoActivityFeedback)
    async saveDemoActivityPhotoRating(
        @Args({ name: 'id' }) id: string,
        @Args({ name: 'photoRating' }) photoRating: number
    ): Promise<LwpDemoActivityFeedback> {
        return await this.demoActivityFeedbackService.saveDemoActivityPhotoRating(id, photoRating);
    }
}
