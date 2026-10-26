import React, { useMemo } from 'react';

import { IMPACT_REPORT_GRAPH_TITLES, IMPACT_REPORT_PROGRAM_OVERVIEW_DESCRIPTION } from '../../../../../shared/Constant';
import { ILwpSchoolImpactReport } from '../../../../../types/entities/ILwpSchoolImpactReport';
import CommonCard from '../../../../Shared/Cards/CommonCard';
import PhotosAndCommentsSection from '../../../../Shared/ImpactReport/PhotosAndCommentsSection';
import ProgramOverview from '../../../../Shared/ImpactReport/ProgramOverview';
import BuildingEngagementGraph from '../../BuildingEngagementGraph';
import ImpactReportColumnGraph from '../../ImpactReportColumnGraph';

interface ReadingImpactReportOutputProps {
    schoolImpactReportData: ILwpSchoolImpactReport;
    isAdminView?: boolean;
    refetch?: () => void;
}

const ReadingImpactReportOutput = ({ schoolImpactReportData, isAdminView = false, refetch }: ReadingImpactReportOutputProps) => {
    const schoolImpactReport: ILwpSchoolImpactReport = useMemo(() => schoolImpactReportData ?? null, [schoolImpactReportData]);
    const readingGraphTitle = IMPACT_REPORT_GRAPH_TITLES.READING;
    const programOverview = IMPACT_REPORT_PROGRAM_OVERVIEW_DESCRIPTION.READING;

    return (
        <CommonCard
            background="#EFF2FE"
            className="report-sections-container"
            csx={{
                p: 4
            }}>
            <ProgramOverview
                impactReport={schoolImpactReport}
                activeFamilyDescription={programOverview.activeFamilyDescription}
                activePremiumFamilyDescription={programOverview.activePremiumFamilyDescription}
                numberOfWeeksText={programOverview.numberOfWeeksText}
                activePremiumFamilyLabel={`${schoolImpactReport?.activePremiumFamiliesPercentage || 0}% of premium pupils are active `}
            />

            {schoolImpactReport?.engagementByYearGroup?.length > 0 ? (
                <ImpactReportColumnGraph
                    graphName="engagementByYearGroup"
                    impactReportId={schoolImpactReport?.id}
                    isAdminView={isAdminView}
                    refetch={refetch}
                    data={schoolImpactReport?.engagementByYearGroup ?? []}
                    name="Year group"
                    title={readingGraphTitle.engagementByYearGroup.title}
                    description={readingGraphTitle.engagementByYearGroup.description}
                    yAxisTitle="Pupils reaching reading target at least 1 week"
                    colorForAll="#6f60ae"
                    includeStripedPattern
                />
            ) : null}
            {schoolImpactReport?.engagementByClass?.length > 0 ? (
                <ImpactReportColumnGraph
                    graphName="engagementByClass"
                    impactReportId={schoolImpactReport?.id}
                    isAdminView={isAdminView}
                    refetch={refetch}
                    data={schoolImpactReport?.engagementByClass ?? []}
                    name="Class"
                    title={readingGraphTitle.engagementByClass.title}
                    description={readingGraphTitle.engagementByClass.description}
                    yAxisTitle="Pupils reaching reading target at least 1 week"
                    colorForAll="#6f60ae"
                    includeStripedPattern
                />
            ) : null}

            {schoolImpactReport?.avgWeeklyTargetMetByYearGroup?.length > 0 ? (
                <ImpactReportColumnGraph
                    graphName="avgWeeklyTargetMetByYearGroup"
                    impactReportId={schoolImpactReport?.id}
                    isAdminView={isAdminView}
                    refetch={refetch}
                    data={schoolImpactReport?.avgWeeklyTargetMetByYearGroup ?? []}
                    name="Year group"
                    title={readingGraphTitle.avgWeeklyTargetMetByYearGroup.title}
                    description={readingGraphTitle.avgWeeklyTargetMetByYearGroup.description}
                    yAxisTitle="Weekly targets met (average)"
                    colorForAll="#6f60ae"
                />
            ) : null}

            {schoolImpactReport?.avgWeeklyTargetMetByClass?.length > 0 ? (
                <ImpactReportColumnGraph
                    graphName="avgWeeklyTargetMetByClass"
                    impactReportId={schoolImpactReport?.id}
                    isAdminView={isAdminView}
                    refetch={refetch}
                    data={schoolImpactReport?.avgWeeklyTargetMetByClass ?? []}
                    name="Class"
                    title={readingGraphTitle.avgWeeklyTargetMetByClass.title}
                    description={readingGraphTitle.avgWeeklyTargetMetByClass.description}
                    yAxisTitle="Weekly targets met (average)"
                    colorForAll="#6f60ae"
                />
            ) : null}

            {schoolImpactReport?.buildingEngagement?.length > 0 ? (
                <BuildingEngagementGraph
                    graphName="buildingEngagement"
                    impactReportId={schoolImpactReport?.id}
                    isAdminView={isAdminView}
                    premiumPupilsCount={schoolImpactReport?.premiumPupilsCount}
                    pupilsCount={schoolImpactReport?.pupilsCount}
                    refetch={refetch}
                    data={schoolImpactReport?.buildingEngagement ?? []}
                    description={readingGraphTitle.buildingEngagement.description}
                    colorForAll="#6f60ae"
                    xAxisTitle="Hit the target on at least _ weeks"
                />
            ) : null}

            {schoolImpactReport?.feedbacks?.length > 0 ? (
                <PhotosAndCommentsSection
                    feedbacks={schoolImpactReport?.feedbacks}
                    reportType={schoolImpactReport?.reportType}
                    isAdminView={isAdminView}
                    refetch={refetch}
                />
            ) : null}
        </CommonCard>
    );
};

export default ReadingImpactReportOutput;
