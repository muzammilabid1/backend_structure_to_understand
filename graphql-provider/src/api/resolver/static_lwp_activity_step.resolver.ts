import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { StaticLwpActivitySteps } from '../entities/activity';
import { CarouselData } from '../model';

@Resolver(() => StaticLwpActivitySteps)
export class StaticLwpActivityStepResolver {
    @ResolveField(() => String)
    properties(@Parent() step: StaticLwpActivitySteps): string {
        return JSON.stringify(step.properties);
    }

    @ResolveField(() => String)
    accordionData(@Parent() step: StaticLwpActivitySteps): string {
        return JSON.stringify(step.accordionData);
    }

    @ResolveField(() => String)
    checkListTextData(@Parent() step: StaticLwpActivitySteps): string {
        return JSON.stringify(step.checkListTextData);
    }

    @ResolveField(() => [CarouselData])
    carouselData(@Parent() step: StaticLwpActivitySteps): CarouselData[] {
        return step.carouselData;
    }
}
