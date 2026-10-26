import { Args, Mutation, Parent as PParent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';
import { BaseEntity } from 'typeorm';

import { LwpPupil } from '../entities/pupil';
import { LwpPupilTrophy } from '../entities/pupil_trophy';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpTrophy } from '../entities/static_trophy';
import { LwpUser } from '../entities/user';
import { OperationStatus } from '../model';
import { TrophyService } from '../service/trophy.service';

@Resolver(() => LwpPupilTrophy)
export class TrophyResolver {
    constructor(private trophyService: TrophyService) {}

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Write, 'pupilId'])
    @Mutation(() => LwpPupilTrophy)
    async addTrophyInPupil(
        @Args({ name: 'pupilId' }) pupilId: string,
        @Args({ name: 'trophyId' }) trophyId: string,
        @Args({ name: 'classId' }) classId: string,
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupilTrophy> {
        return this.trophyService.addTrophyInPupil(pupilId, trophyId, classId, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deletePupilTrophy(@Args('id') id: string): Promise<OperationStatus> {
        return await this.trophyService.deletePupilTrophy(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminSendTrophyMailToPupil(): Promise<boolean> {
        await this.trophyService.sendTrophyMailToPupil();

        return true;
    }

    @ResolveField(() => LwpUser)
    async logCreatedBy(@PParent() pupilTrophy: LwpPupilTrophy): Promise<LwpUser> {
        return await this.trophyService.getAssignerOfTrophy(pupilTrophy.id);
    }

    @ResolveField(() => LwpPupil)
    async pupil(@PParent() pupilTrophy: LwpPupilTrophy): Promise<LwpPupil> {
        return await this.trophyService.getPupilOfTrophy(pupilTrophy.id);
    }

    @ResolveField(() => StaticLwpTrophy)
    async trophy(@PParent() pupilTrophy: LwpPupilTrophy): Promise<Omit<StaticLwpTrophy, keyof BaseEntity>> {
        return await this.trophyService.getStaticTrophyOfTrophy(pupilTrophy.id);
    }

    @ResolveField(() => LwpSchoolClass)
    async schoolClass(@PParent() pupilTrophy: LwpPupilTrophy): Promise<LwpSchoolClass> {
        return await this.trophyService.getSchoolClassOfTrophy(pupilTrophy.id);
    }
}
