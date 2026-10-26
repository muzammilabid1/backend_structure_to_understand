import React, { useMemo } from 'react';

import { IMPACT_REPORT_GRAPH_TITLES, IMPACT_REPORT_PROGRAM_OVERVIEW_DESCRIPTION } from '../../../../../shared/Constant';
import { ILwpSchoolImpactReport } from '../../../../../types/entities/ILwpSchoolImpactReport';
import CommonCard from '../../../../Shared/Cards/CommonCard';
import PhotosAndCommentsSection from '../../../../Shared/ImpactReport/PhotosAndCommentsSection';
import ProgramOverview from '../../../../Shared/ImpactReport/ProgramOverview';
import BuildingEngagementGraph from '../../BuildingEngagementGraph';
import ImpactReportColumnGraph from '../../ImpactReportColumnGraph';

interface TopicAndActivityImpactReportOutputProps {
    schoolImpactReportData: ILwpSchoolImpactReport;
    isAdminView?: boolean;
    refetch?: () => void;
}

const TopicAndActivityImpactReportOutput = ({
    schoolImpactReportData,
    isAdminView = false,
    refetch
}: TopicAndActivityImpactReportOutputProps) => {
    const schoolImpactReport: ILwpSchoolImpactReport = useMemo(() => schoolImpactReportData ?? null, [schoolImpactReportData]);
    const topicAndActivityGraphTitle = IMPACT_REPORT_GRAPH_TITLES.TOPIC_ACTIVITY;
    const programOverview = IMPACT_REPORT_PROGRAM_OVERVIEW_DESCRIPTION.TOPIC_ACTIVITY;

    return (
        <div>
            <CommonCard
                background="#edf6e6"
                className="report-sections-container topic-and-activity-impact-report"
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
                        title={topicAndActivityGraphTitle.engagementByYearGroup.title}
                        description={topicAndActivityGraphTitle.engagementByYearGroup.description}
                        yAxisTitle="% of pupils that have completed at least 1 topic"
                        colorForAll="#9bc53d"
                        includeStripedPattern
                    />
                ) : null}

                {schoolImpactReport?.engagementByClass?.length > 0 ? (
                    <ImpactReportColumnGraph
                        graphName="engagementByClass"
                        impactReportId={schoolImpactReport?.id}
                        data={schoolImpactReport?.engagementByClass ?? []}
                        name="Class"
                        title={topicAndActivityGraphTitle.engagementByClass.title}
                        description={topicAndActivityGraphTitle.engagementByClass.description}
                        yAxisTitle="% of pupils that have completed at least 1 topic"
                        colorForAll="#9bc53d"
                        isAdminView={isAdminView}
                        refetch={refetch}
                        includeStripedPattern
                    />
                ) : null}

                {schoolImpactReport?.avgTopicSetByYearGroup?.length > 0 ? (
                    <ImpactReportColumnGraph
                        graphName="avgTopicSetByYearGroup"
                        impactReportId={schoolImpactReport?.id}
                        data={schoolImpactReport?.avgTopicSetByYearGroup ?? []}
                        name="Year group"
                        title={topicAndActivityGraphTitle.avgTopicSetByYearGroup.title}
                        description={topicAndActivityGraphTitle.avgTopicSetByYearGroup.description}
                        yAxisTitle="Number of topics set (average per pupil)"
                        colorForAll="#9bc53d"
                        percentageOnYAxis={false}
                        isAdminView={isAdminView}
                        refetch={refetch}
                        isShowPremiumPupilBar={false}
                    />
                ) : null}

                {schoolImpactReport?.avgTopicSetByClass?.length > 0 ? (
                    <ImpactReportColumnGraph
                        graphName="avgTopicSetByClass"
                        impactReportId={schoolImpactReport?.id}
                        data={schoolImpactReport?.avgTopicSetByClass ?? []}
                        name="Class"
                        title={topicAndActivityGraphTitle.avgTopicSetByClass.title}
                        description={topicAndActivityGraphTitle.avgTopicSetByClass.description}
                        yAxisTitle="Number of topics set (average per pupil)"
                        colorForAll="#9bc53d"
                        percentageOnYAxis={false}
                        isAdminView={isAdminView}
                        refetch={refetch}
                        isShowPremiumPupilBar={false}
                    />
                ) : null}

                {schoolImpactReport?.buildingEngagement?.length > 0 ? (
                    <BuildingEngagementGraph
                        graphName="buildingEngagement"
                        impactReportId={schoolImpactReport?.id}
                        data={schoolImpactReport?.buildingEngagement ?? []}
                        description={topicAndActivityGraphTitle.buildingEngagement.description}
                        colorForAll="#9bc53d"
                        xAxisTitle="Completed at least _ topic"
                        isAdminView={isAdminView}
                        premiumPupilsCount={schoolImpactReport?.premiumPupilsCount}
                        pupilsCount={schoolImpactReport?.pupilsCount}
                        refetch={refetch}
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
        </div>
    );
};

export default TopicAndActivityImpactReportOutput;
