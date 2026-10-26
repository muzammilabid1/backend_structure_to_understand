import { gql, useLazyQuery, useQuery } from '@apollo/client';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { findKey } from 'lodash';
import { SchoolAnalyticsGraphType, SchoolImpactReportType } from 'lwp-shared';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo } from 'react';

import { ANALYTICS_AND_REPORTS_TABS_TYPE, MINIO_PUBLIC_PATHS, SCHOOL_ANALYTICS } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { IStaticLwpSubject } from '../../../../types/entities/IStaticLwpSubject';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPopOver from '../../../Shared/CommonPopOver';
import CommonStatus from '../../../Shared/CommonStatus';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import BuildingEngagementGraphForAnalysisMetric from './BuildingEngagementGraphForAnalysisMetric';
import ColumnGraphForAnalysisMetric from './ColumnGraphForAnalysisMetric';
import GraphHeader from './GraphHeader';

const getSchoolAnalyticsDataQuery = gql`
    query getSchoolAnalyticsDataQuery($input: SchoolAnalyticsDataQueryInput!) {
        getSchoolAnalyticsDataQuery(input: $input) {
            graphData {
                name
                allPupilsCount
                activeFamiliesPercentage
                premiumPupilCount
                activePremiumFamiliesPercentage
                sendPupilCount
                activeSendFamiliesPercentage
                ealPupilCount
                activeEalFamiliesPercentage
                activeBoysPercentage
                boysCount
                activeGirlsPercentage
                girlsCount
            }
            allPupilsCount
            premiumPupilCount
            boysCount
            girlsCount
            ealPupilCount
            sendPupilCount
        }
    }
`;

const getSubjectsForFiltersOnTopicAnalyticGraphs = gql`
    query getSubjectsForFiltersOnTopicAnalyticGraphs($schoolId: String!) {
        getSubjectsForFiltersOnTopicAnalyticGraphs(schoolId: $schoolId) {
            id
            name
        }
    }
`;

const RANGES = [
    {
        name: 'Overall',
        graphLabel: 'All pupils',
        dataTest: 'overall-button'
    },
    {
        name: 'Year group',
        graphLabel: 'Year group',
        dataTest: 'year-group-button'
    },
    {
        name: 'Class',
        graphLabel: 'Class',
        dataTest: 'class-button'
    }
];

interface SchoolAnalysisMetricProps {
    reportType: SchoolImpactReportType;
}

export interface AnalyticsEngagementStatisticsOutput {
    name: string;
    allPupilsCount: number;
    activeFamiliesPercentage: number;
    premiumPupilCount: number;
    activePremiumFamiliesPercentage: number;
    sendPupilCount: number;
    activeSendFamiliesPercentage: number;
    ealPupilCount: number;
    activeEalFamiliesPercentage: number;
    activeBoysPercentage: number;
    boysCount: number;
    activeGirlsPercentage: number;
    girlsCount: number;
}

export interface SchoolAnalyticsGraphOutput {
    graphData: AnalyticsEngagementStatisticsOutput[];
    allPupilsCount: number | null;
    premiumPupilCount: number | null;
    boysCount: number | null;
    girlsCount: number | null;
    ealPupilCount: number | null;
    sendPupilCount: number | null;
}

export enum ComparisonType {
    PREMIUM_PUPILS = 'PREMIUM_PUPILS',
    SEND = 'SEND',
    EAL = 'EAL',
    GENDER = 'GENDER'
}

const COMPARE_BY_OPTIONS = [
    {
        label: 'Pupil Premium',
        value: ComparisonType.PREMIUM_PUPILS
    },
    {
        label: 'SEND',
        value: ComparisonType.SEND
    },
    {
        label: 'EAL',
        value: ComparisonType.EAL
    },
    {
        label: 'Gender',
        value: ComparisonType.GENDER
    }
];

const SchoolAnalysisMetric = ({ reportType }: SchoolAnalysisMetricProps) => {
    const router = useRouter();

    const { school_id, analysis_metric } = router.query;
    const { callSnackbar } = useContext(ThemeContext);

    const [fetchSchoolAnalyticsData, { data, loading, error }] = useLazyQuery(getSchoolAnalyticsDataQuery);

    // Find the matching analytics configuration
    const analyticsConfig = SCHOOL_ANALYTICS.find((content) => content.type === reportType && content.name === analysis_metric);
    const isOnBuildingEngagement = analyticsConfig?.name === 'building-engagement';

    // Only fetch subjects if the graph is related to topic activity and not building engagement
    const isTopicGraphs = analyticsConfig?.type === SchoolImpactReportType.TOPIC_ACTIVITY && !isOnBuildingEngagement;

    const {
        data: subjectsData,
        loading: subjectsLoading,
        error: subjectsError
    } = useQuery(getSubjectsForFiltersOnTopicAnalyticGraphs, {
        skip: !isTopicGraphs || !school_id,
        variables: { schoolId: school_id }
    });

    // Generate group buttons if there are multiple ranges
    const groupButtons =
        analyticsConfig?.ranges?.length > 1 ? RANGES.map((range, ind) => ({ ...range, key: analyticsConfig?.ranges?.[ind] })) : [];

    // Determine the selected range or default to the first range
    const selectedRange = (router?.query?.range || analyticsConfig?.ranges?.[0]) as SchoolAnalyticsGraphType;

    const selectedCompareByOption = COMPARE_BY_OPTIONS.find((option) => option.value === router?.query?.compareBy) ?? COMPARE_BY_OPTIONS[0];

    const graphXAxisLabel = groupButtons.find((range) => range.key === selectedRange)?.graphLabel;

    const { subjectIds, subjects } = useMemo(() => {
        let subjectIds: string[] = [];

        const subjects: IStaticLwpSubject[] = subjectsData?.getSubjectsForFiltersOnTopicAnalyticGraphs || [];

        subjectIds = router?.query?.subjectIds ? (router?.query?.subjectIds as string)?.split(',') : subjects?.map((subject) => subject.id);

        return {
            subjectIds,
            subjects
        };
    }, [router?.query?.subjectIds, subjectsData]);

    useEffect(() => {
        if (reportType && school_id && selectedRange && (!isTopicGraphs || (isTopicGraphs && subjectIds?.length))) {
            const graphType = findKey(SchoolAnalyticsGraphType, (value) => value === selectedRange);

            fetchSchoolAnalyticsData({
                variables: {
                    input: {
                        schoolId: school_id,
                        graphType: graphType,
                        reportType: reportType,
                        subjectIds: isTopicGraphs ? subjectIds : null
                    }
                }
            });
        }
    }, [reportType, school_id, selectedRange, isTopicGraphs, subjectIds]);

    useEffect(() => {
        if (error) handleErrorSnackbar(callSnackbar, error);
        if (subjectsError) handleErrorSnackbar(callSnackbar, subjectsError);
        if (!analyticsConfig) callSnackbar('Invalid graph type', 'error'); // if user tries to access invalid graph type in URL
    }, [error, analyticsConfig, subjectsError]);

    const dataForGraphs: SchoolAnalyticsGraphOutput = useMemo(() => data?.getSchoolAnalyticsDataQuery || {}, [data]);

    // If the school leader is on the topic-setting page, percentages should not be displayed on the y-axis, and the premium pupil bar should not be shown.
    const isOnTopicSetting = analyticsConfig?.name === 'topic-setting';

    // Set the color for all pupils based on the report type
    const colorsForAll = reportType === SchoolImpactReportType.READING ? '#6F60AE' : '#9bc53d';

    return (
        <div className="school-analysis-metric">
            <span
                className="school-analysis-metric__title"
                onClick={() =>
                    router.push({ pathname: `/school/${school_id}/reports`, query: { type: ANALYTICS_AND_REPORTS_TABS_TYPE.LIVE_DATA } })
                }>
                <ChevronLeftIcon data-test={'go-back-to-school-analytics-page-icon'} />
                <Heading3 text="School analytics" />
            </span>
            <div className="school-analysis-metric-content">
                <div className="school-analysis-heading">
                    <Heading1 text={analyticsConfig?.title} centerText />
                    <Paragraph text={analyticsConfig?.subTitle} />
                </div>
                {loading || subjectsLoading ? (
                    <CommonLoading />
                ) : (
                    <div className={`school-analysis-metric-graph-container ${reportType}`}>
                        {dataForGraphs?.graphData?.length > 0 ? (
                            <>
                                {groupButtons.length ? (
                                    <GraphHeader
                                        groupByButtons={groupButtons}
                                        selectedGroupBy={selectedRange}
                                        subjects={subjects}
                                        selectedSubjectIds={subjectIds}
                                    />
                                ) : null}

                                {!isOnTopicSetting && (
                                    <CommonPopOver
                                        text={`Compare by: ${selectedCompareByOption.label}`}
                                        icon="expand_more"
                                        className="compare-by-dropdown"
                                        childrenClass="compare-by-dropdown-items">
                                        {COMPARE_BY_OPTIONS.map((item, ind) => (
                                            <Paragraph
                                                key={ind}
                                                text={item.label}
                                                customClass={`cp ${selectedCompareByOption.value === item.value ? 'selected-item' : ''}`}
                                                onClick={() => {
                                                    router.push(
                                                        {
                                                            query: { ...router.query, compareBy: item.value }
                                                        },
                                                        undefined,
                                                        { shallow: true }
                                                    );
                                                }}
                                            />
                                        ))}
                                    </CommonPopOver>
                                )}

                                <div className="graph-container">
                                    {isOnBuildingEngagement ? (
                                        <BuildingEngagementGraphForAnalysisMetric
                                            key={selectedCompareByOption.value}
                                            data={dataForGraphs}
                                            colorForAll={colorsForAll}
                                            xAxisTitle={
                                                reportType === SchoolImpactReportType.READING
                                                    ? 'Hit the target on at least _ weeks'
                                                    : 'Completed at least _ topic'
                                            }
                                            comparisonType={selectedCompareByOption.value}
                                        />
                                    ) : (
                                        <ColumnGraphForAnalysisMetric
                                            key={selectedCompareByOption.value}
                                            data={dataForGraphs?.graphData}
                                            name={graphXAxisLabel}
                                            yAxisTitle={analyticsConfig?.yAxisTitle}
                                            colorForAll={colorsForAll}
                                            includeStripedPattern={!isOnTopicSetting}
                                            percentageOnYAxis={!isOnTopicSetting}
                                            isShowPremiumPupilBar={!isOnTopicSetting}
                                            showXAxisBarLabels={graphXAxisLabel !== 'All pupils'} // hide label when all pupils are selected
                                            comparisonType={selectedCompareByOption.value}
                                        />
                                    )}
                                </div>
                            </>
                        ) : (
                            <CommonStatus
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                                heading={'Nothing to show here'}
                                subHeadingDataTest="no-analytics-data"
                                subHeading={'There is no data available for this metric. Please check back later.'}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SchoolAnalysisMetric;
