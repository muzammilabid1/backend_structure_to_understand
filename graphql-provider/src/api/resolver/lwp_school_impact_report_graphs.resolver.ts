import { Parent as PParent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { LwpSchoolImpactReportGraphs } from '../entities/lwp_school_impact_report_graphs';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpSubjectService } from '../service/static_lwp_subject.service';

@Resolver(() => LwpSchoolImpactReportGraphs)
export class LwpSchoolImpactReportGraphsResolver {
    constructor(private staticLwpSubjectService: StaticLwpSubjectService) {}

    @ResolveField(() => [StaticLwpSubject], { nullable: true })
    @AuthorizeField(TeacherField)
    async subject(@PParent() graph: LwpSchoolImpactReportGraphs): Promise<StaticLwpSubject | null> {
        if (!graph?.subjectId) return null;

        return await this.staticLwpSubjectService.getSubjectById(graph.subjectId);
    }
}
