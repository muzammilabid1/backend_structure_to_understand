import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { LwpPupil } from '../entities/pupil';
import { LwpPupilMathscot } from '../entities/pupil_mathscot';
import { StaticLwpPeriod } from '../entities/static_period';
import { AddPupilMathscotInput, UpdatePupilMathscotInput } from '../model';
import { PupilService } from '../service/pupil.service';
import { PupilMathscotService } from '../service/pupil_mathscot.service';
import { StaticLwpPeriodService } from '../service/static_period.service';

@Resolver(() => LwpPupilMathscot)
export class PupilMathscotResolver {
    constructor(
        private pupilMathscotService: PupilMathscotService,
        private periodService: StaticLwpPeriodService,
        private pupilService: PupilService
    ) {}

    @AuthorizeEndpoint([LwpPupil, OpType.Write, 'input.pupilId'])
    @Mutation(() => LwpPupilMathscot)
    async addPupilMathscot(@Args('input') input: AddPupilMathscotInput, @AuthInfo('sub') userId: string): Promise<LwpPupilMathscot> {
        return await this.pupilMathscotService.addPupilMathscot(input, userId);
    }

    @AuthorizeEndpoint([LwpPupilMathscot, OpType.Write, 'input.id'])
    @Mutation(() => LwpPupilMathscot)
    async updatePupilMathscot(@Args('input') input: UpdatePupilMathscotInput): Promise<LwpPupilMathscot> {
        return await this.pupilMathscotService.updatePupilMathscot(input);
    }

    @ResolveField(() => StaticLwpPeriod)
    async period(@Parent() pupilMathscotId: LwpPupilMathscot): Promise<StaticLwpPeriod> {
        return await this.periodService.getPupilMathscotPeriod(pupilMathscotId.id);
    }

    @ResolveField(() => LwpPupil)
    async pupil(@Parent() pupilMathscotId: LwpPupilMathscot): Promise<LwpPupil> {
        return await this.pupilService.getPupilMathscotPupil(pupilMathscotId.id);
    }
}
