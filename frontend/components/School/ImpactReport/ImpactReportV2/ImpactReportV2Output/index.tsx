import { gql, useMutation } from '@apollo/client';
import { useContext, useState } from 'react';

import { getV2SchoolImpactReport } from '../../../../../graphQl/queries';
import { IMPACT_REPORT_V2_GRAPHS_INFO, IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION } from '../../../../../shared/Constant';
import { generateGraphId, ThemeContext } from '../../../../../shared/Services/handler';
import { ILwpSchoolImpactReportV2, ILwpSchoolImpactReportV2Graphs } from '../../../../../types/entities/ILwpSchoolImpactReport';
import BuildingEngagementGraph from '../../../../School/ImpactReport/BuildingEngagementGraph';
import ImpactReportColumnGraph from '../../../../School/ImpactReport/ImpactReportColumnGraph';
import BackToTop from '../../../../Shared/BackToTop';
import CommonCard from '../../../../Shared/Cards/CommonCard';
import ProgramOverview from '../../../../Shared/ImpactReport/ProgramOverview';
import Heading1 from '../../../../Shared/Typography/Heading1';
import Heading2 from '../../../../Shared/Typography/Heading2';
import Paragraph from '../../../../Shared/Typography/Paragraph';
import PhotosAndCommentsSection from './PhotosAndCommentsSection';

interface ImpactReportV2OutputProps {
    schoolImpactReport: ILwpSchoolImpactReportV2;
    isAdminView?: boolean;
    schoolId?: string;
    termId?: string;
    refetch?: () => void;
}

interface ContentsItem {
    label: string;
    id?: string;
    children?: ContentsItem[];
}

const deleteGraphFromImpactReportV2 = gql`
    mutation deleteGraphFromImpactReportV2($graphId: String!, $graphName: String!) {
        deleteGraphFromImpactReportV2(graphId: $graphId, graphName: $graphName)
    }
`;

const toggleNationalDataAverageDisplay = gql`
    mutation toggleNationalDataAverageDisplay($impactReportId: String!, $showNationalDataAverage: Boolean!) {
        toggleNationalDataAverageDisplay(impactReportId: $impactReportId, showNationalDataAverage: $showNationalDataAverage)
    }
`;

export const getImpactReportV2ContentList = (schoolImpactReport: ILwpSchoolImpactReportV2) => {
    const contents: ContentsItem[] = [
        {
            label: 'Programme overview',
            id: 'programme-overview',
            children: []
        }
    ];

    if (schoolImpactReport?.graphs?.length > 0) {
        schoolImpactReport.graphs.forEach((graph) => {
            const hasBuildingEngagement = graph.buildingEngagement && graph.buildingEngagement.length > 0;
            const hasEngagementByYearGroup = graph.engagementByYearGroup && graph.engagementByYearGroup.length > 0;
            const hasAvgCompletionRateByYearGroup = graph.avgCompletionRateByYearGroup && graph.avgCompletionRateByYearGroup.length > 0;

            const hasTopicSettingGraphs = graph.avgTopicSetByClass && graph.avgTopicSetByClass.length > 0;

            const subChild = [];

            const isReading = !graph?.subject;
            const graphInfo = isReading ? IMPACT_REPORT_V2_GRAPHS_INFO.READING : IMPACT_REPORT_V2_GRAPHS_INFO.TOPIC_ACTIVITY;

            if (hasBuildingEngagement)
                subChild.push({
                    label: graphInfo.buildingEngagement.title,
                    id: generateGraphId(graph?.id, 'buildingEngagement')
                });

            if (hasEngagementByYearGroup)
                subChild.push({
                    label: graphInfo.engagementByYearGroup.title,
                    id: generateGraphId(graph?.id, 'engagementByYearGroup')
                });

            if (hasAvgCompletionRateByYearGroup)
                subChild.push({
                    label: graphInfo.avgCompletionRateByYearGroup.title,
                    id: generateGraphId(graph?.id, 'avgCompletionRateByYearGroup')
                });

            if (hasTopicSettingGraphs)
                subChild.push({
                    label: graphInfo.avgTopicSetByClass.title,
                    id: generateGraphId(graph?.id, 'avgTopicSetByClass')
                });

            contents.push({
                label: getGraphsTitles(graph),
                id: graph?.id,
                children: subChild
            });
        });
    }

    if (schoolImpactReport?.feedbacks?.length > 0) {
        contents.push({
            label: 'Photos and Comments',
            id: 'photos-and-comments',
            children: []
        });
    }

    return contents;
};

const getGraphsTitles = (graph: ILwpSchoolImpactReportV2Graphs): string => {
    return `${graph?.subject ? graph.subject.name : 'Reading'} graphs`;
};

const ImpactReportV2Output = ({ schoolImpactReport, isAdminView, schoolId, termId, refetch }: ImpactReportV2OutputProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [deleteGraphFromImpactReportV2Mutation] = useMutation(deleteGraphFromImpactReportV2);
    const [updateImpactReportToDisplayNationalDataAverageMutation, { loading: showNationalDataAverageLoading }] =
        useMutation(toggleNationalDataAverageDisplay);

    const [showNationalDataAverage, setShowNationalDataAverage] = useState(schoolImpactReport?.showNationalDataAverage || false);

    const renderContents = (items: ContentsItem[], level = 0) => {
        const styles = [
            { listStyle: 'disc', marginLeft: 24, marginBottom: 16 },
            { listStyle: 'disc', marginLeft: 24, marginBottom: 16 },
            { listStyle: 'circle', marginLeft: 24, marginBottom: 16 }
        ];

        return (
            <ul style={styles[level]}>
                {items.map((item) => (
                    <li key={item.id || item.label}>
                        <Paragraph
                            text={item.label}
                            customClass="impact-report-preview-v2-content-item"
                            onClick={() =>
                                document
                                    .getElementById(item?.children?.[0]?.id ?? item.id) // scroll to first child if exists
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }
                        />

                        {item.children && item.children.length > 0 && renderContents(item.children, level + 1)}
                    </li>
                ))}
            </ul>
        );
    };

    const handleDeleteGraphFromV2SchoolImpactReport = async (id: string, graphName: string) => {
        try {
            await deleteGraphFromImpactReportV2Mutation({
                variables: {
                    graphId: id,
                    graphName
                },
                refetchQueries: [
                    {
                        query: getV2SchoolImpactReport,
                        variables: { schoolId, termId, isPublished: false } // Grap's deletion is only allowed in the admin view, so 'isPublished' is always set to false during the refetch.
                    }
                ],
                awaitRefetchQueries: true
            });
        } catch ({ ...err }) {
            throw err;
        }
    };

    const handleToDisplayNationalDataAverage = async (displayNationalDataAverage: boolean) => {
        try {
            setShowNationalDataAverage(displayNationalDataAverage);

            await updateImpactReportToDisplayNationalDataAverageMutation({
                variables: {
                    impactReportId: schoolImpactReport.id,
                    showNationalDataAverage: displayNationalDataAverage
                },
                refetchQueries: [
                    {
                        query: getV2SchoolImpactReport,
                        variables: { schoolId, termId, isPublished: false } // This setting change is only allowed in the admin view, so 'isPublished' is always set to false during the refetch.
                    }
                ],
                awaitRefetchQueries: true
            });
        } catch (err) {
            setShowNationalDataAverage(schoolImpactReport?.showNationalDataAverage || false);

            callSnackbar(err, 'error');
        }
    };

    return (
        <div className="impact-report-preview-v2-container">
            {/* Contents section */}
            <CommonCard background="#fff6d9">
                <div className="impact-report-preview-v2-content">
                    <CommonCard csx={{ p: 2 }}>
                        <Heading1 text="Contents" />
                        {renderContents(getImpactReportV2ContentList(schoolImpactReport))}
                    </CommonCard>

                    {/* Programme Overview Section */}
                    <div id="programme-overview" className="scroll-margin">
                        <ProgramOverview
                            impactReport={schoolImpactReport}
                            activeFamilyDescription={IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION.activeFamilyDescription}
                            activePremiumFamilyDescription={IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION.activePremiumFamilyDescription}
                            numberOfWeeksText={IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION.numberOfWeeksText}
                            activePremiumFamilyLabel={`${schoolImpactReport?.activePremiumFamiliesPercentage || 0}% of pupil premium pupils are active `}
                            isAdminView={isAdminView}
                            showNationalDataAverage={showNationalDataAverage}
                            showNationalDataAverageLoading={showNationalDataAverageLoading}
                            handleToDisplayNationalDataAverage={handleToDisplayNationalDataAverage}
                        />
                    </div>

                    {/* Academic Performance Section */}
                    {schoolImpactReport?.graphs?.length > 0
                        ? schoolImpactReport?.graphs?.map((graph) => {
                              const isReadingGraph = !graph?.subject;
                              const graphColor = isReadingGraph ? '#6f60ae' : '#9bc53d';

                              const graphInfo = isReadingGraph
                                  ? IMPACT_REPORT_V2_GRAPHS_INFO.READING
                                  : IMPACT_REPORT_V2_GRAPHS_INFO.TOPIC_ACTIVITY;

                              return (
                                  <CommonCard
                                      key={graph?.id}
                                      csx={{ p: 2 }}
                                      background={isReadingGraph ? '#EFF2FE' : '#edf6e6'}
                                      className={`impact-report-v2-graphs-container ${isReadingGraph ? 'reading-graph' : 'topic-activity-graph'}`}>
                                      <div className="impact-report-graphs">
                                          <div id={graph?.id} className="scroll-margin">
                                              <Heading2 text={getGraphsTitles(graph)} />
                                          </div>

                                          {graph?.buildingEngagement?.length > 0 ? (
                                              <div id={generateGraphId(graph?.id, 'buildingEngagement')} className="scroll-margin">
                                                  <BuildingEngagementGraph
                                                      graphName="buildingEngagement"
                                                      impactReportId={schoolImpactReport?.id}
                                                      isAdminView={isAdminView}
                                                      premiumPupilsCount={graph?.premiumPupilsCount}
                                                      pupilsCount={graph?.pupilsCount}
                                                      data={graph?.buildingEngagement ?? []}
                                                      description={graphInfo.buildingEngagement.description}
                                                      colorForAll={graphColor}
                                                      xAxisTitle={graphInfo.buildingEngagement.xAxisTitle}
                                                      graphUniqueIdentifier={generateGraphId(graph?.id, 'buildingEngagement')}
                                                      handleDeleteGraphFromImpactReportV2={() =>
                                                          handleDeleteGraphFromV2SchoolImpactReport(graph.id, 'buildingEngagement')
                                                      }
                                                  />
                                              </div>
                                          ) : null}

                                          {graph?.engagementByYearGroup?.length > 0 ? (
                                              <div id={generateGraphId(graph?.id, 'engagementByYearGroup')} className="scroll-margin">
                                                  <ImpactReportColumnGraph
                                                      graphName="engagementByYearGroup"
                                                      impactReportId={schoolImpactReport?.id}
                                                      isAdminView={isAdminView}
                                                      data={graph?.engagementByYearGroup ?? []}
                                                      name="Year group"
                                                      title={graphInfo.engagementByYearGroup.title}
                                                      description={graphInfo.engagementByYearGroup.description}
                                                      yAxisTitle={graphInfo.engagementByYearGroup.yAxisTitle}
                                                      colorForAll={graphColor}
                                                      includeStripedPattern
                                                      handleDeleteGraphFromImpactReportV2={() =>
                                                          handleDeleteGraphFromV2SchoolImpactReport(graph.id, 'engagementByYearGroup')
                                                      }
                                                      graphUniqueIdentifier={generateGraphId(graph?.id, 'engagementByYearGroup')}
                                                  />
                                              </div>
                                          ) : null}

                                          {graph?.avgCompletionRateByYearGroup?.length > 0 ? (
                                              <div
                                                  id={generateGraphId(graph?.id, 'avgCompletionRateByYearGroup')}
                                                  className="scroll-margin">
                                                  <ImpactReportColumnGraph
                                                      graphName="avgCompletionRateByYearGroup"
                                                      impactReportId={schoolImpactReport?.id}
                                                      isAdminView={isAdminView}
                                                      data={graph?.avgCompletionRateByYearGroup ?? []}
                                                      name="Year group"
                                                      title={graphInfo.avgCompletionRateByYearGroup.title}
                                                      description={graphInfo.avgCompletionRateByYearGroup.description}
                                                      yAxisTitle={graphInfo.avgCompletionRateByYearGroup.yAxisTitle}
                                                      colorForAll={graphColor}
                                                      handleDeleteGraphFromImpactReportV2={() =>
                                                          handleDeleteGraphFromV2SchoolImpactReport(
                                                              graph.id,
                                                              'avgCompletionRateByYearGroup'
                                                          )
                                                      }
                                                      graphUniqueIdentifier={generateGraphId(graph?.id, 'avgCompletionRateByYearGroup')}
                                                  />
                                              </div>
                                          ) : null}

                                          {graph?.avgTopicSetByClass?.length > 0 ? (
                                              <div id={generateGraphId(graph?.id, 'avgTopicSetByClass')} className="scroll-margin">
                                                  <ImpactReportColumnGraph
                                                      graphName="avgTopicSetByClass"
                                                      impactReportId={schoolImpactReport?.id}
                                                      isAdminView={isAdminView}
                                                      data={graph?.avgTopicSetByClass ?? []}
                                                      name="Year group"
                                                      title={graphInfo.avgTopicSetByClass.title}
                                                      description={graphInfo.avgTopicSetByClass.description}
                                                      yAxisTitle={graphInfo.avgTopicSetByClass.yAxisTitle}
                                                      colorForAll={graphColor}
                                                      handleDeleteGraphFromImpactReportV2={() =>
                                                          handleDeleteGraphFromV2SchoolImpactReport(graph.id, 'avgTopicSetByClass')
                                                      }
                                                      percentageOnYAxis={false}
                                                      isShowPremiumPupilBar={false}
                                                      graphUniqueIdentifier={generateGraphId(graph?.id, 'avgTopicSetByClass')}
                                                  />
                                              </div>
                                          ) : null}
                                      </div>
                                  </CommonCard>
                              );
                          })
                        : null}

                    {schoolImpactReport?.feedbacks?.length > 0 ? (
                        <>
                            <div id="photos-and-comments" className="scroll-margin" />
                            <PhotosAndCommentsSection
                                feedbacks={schoolImpactReport?.feedbacks}
                                isAdminView={isAdminView}
                                refetch={refetch}
                            />
                        </>
                    ) : null}
                </div>
            </CommonCard>

            <BackToTop />
        </div>
    );
};

export default ImpactReportV2Output;
