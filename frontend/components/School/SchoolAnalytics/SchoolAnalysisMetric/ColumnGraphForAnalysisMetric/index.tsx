import { SeriesOptionsType } from 'highcharts';
import { useMemo } from 'react';

import { highChartPointFormatter } from '../../../../../shared/Services/handler';
import ColumnGraph from '../../../../Shared/Graphs/ColumnGraph';
import { AnalyticsEngagementStatisticsOutput, ComparisonType } from '..';

interface ColumnGraphForAnalysisMetricProps {
    graphName?: string;
    yAxisTitle: string;
    name: string;
    data: Array<AnalyticsEngagementStatisticsOutput>;
    colorForAll: string;
    percentageOnYAxis?: boolean;
    includeStripedPattern?: boolean;
    isShowPremiumPupilBar?: boolean;
    showXAxisBarLabels?: boolean;
    graphUniqueIdentifier?: string;
    comparisonType: ComparisonType;
}

const getLabelsAndKeys = (comparisonType: ComparisonType) => {
    let primaryLabel = 'All';
    let primaryCountKey = 'allPupilsCount';
    let primaryPercentageKey = 'activeFamiliesPercentage';

    let secondaryLabel = '';
    let secondaryCountKey = '';
    let secondaryPercentageKey = '';

    switch (comparisonType) {
        case ComparisonType.PREMIUM_PUPILS:
            secondaryLabel = 'Pupil Premium';
            secondaryCountKey = 'premiumPupilCount';
            secondaryPercentageKey = 'activePremiumFamiliesPercentage';
            break;

        case ComparisonType.SEND:
            secondaryLabel = 'SEND';
            secondaryCountKey = 'sendPupilCount';
            secondaryPercentageKey = 'activeSendFamiliesPercentage';
            break;

        case ComparisonType.EAL:
            secondaryLabel = 'EAL';
            secondaryCountKey = 'ealPupilCount';
            secondaryPercentageKey = 'activeEalFamiliesPercentage';
            break;

        case ComparisonType.GENDER:
            primaryLabel = 'Boys';
            primaryCountKey = 'boysCount';
            primaryPercentageKey = 'activeBoysPercentage';

            secondaryLabel = 'Girls';
            secondaryCountKey = 'girlsCount';
            secondaryPercentageKey = 'activeGirlsPercentage';
            break;
    }

    return {
        primaryLabel,
        secondaryLabel,
        primaryCountKey,
        primaryPercentageKey,
        secondaryCountKey,
        secondaryPercentageKey
    };
};

const ColumnGraphForAnalysisMetric = ({
    yAxisTitle,
    name,
    data,
    colorForAll,
    percentageOnYAxis = true,
    includeStripedPattern = false,
    graphName,
    isShowPremiumPupilBar = true,
    showXAxisBarLabels = true, // hide x-axis label if All pupils are selected
    graphUniqueIdentifier,
    comparisonType
}: ColumnGraphForAnalysisMetricProps) => {
    const series: Array<SeriesOptionsType> = useMemo(() => {
        const { primaryLabel, primaryCountKey, primaryPercentageKey, secondaryLabel, secondaryCountKey, secondaryPercentageKey } =
            getLabelsAndKeys(comparisonType);

        const series: Array<SeriesOptionsType> = [
            {
                type: 'column',
                name: primaryLabel,
                color: colorForAll,
                data: data?.map((item) => ({
                    name: item.name,
                    y: item?.[primaryPercentageKey],
                    drilldown: item.name,
                    color: includeStripedPattern && item?.[primaryCountKey] <= 4 ? 'url(#normal-striped-pattern)' : colorForAll,
                    lowColor: colorForAll,
                    count: item?.[primaryCountKey]
                })),
                tooltip: {
                    pointFormatter: function () {
                        const point = this as Highcharts.Point & {
                            count?: number;
                            color?: string;
                            lowColor?: string;
                        };

                        return highChartPointFormatter(point?.count, point.lowColor, point.name, point.y, percentageOnYAxis);
                    }
                }
            },
            ...(isShowPremiumPupilBar
                ? [
                      {
                          type: 'column' as const,
                          name: secondaryLabel,
                          color: '#f28d00',
                          data: data?.map((item) => ({
                              name: item.name,
                              y: item?.[secondaryPercentageKey],
                              drilldown: item.name,
                              color: includeStripedPattern && item?.[secondaryCountKey] <= 4 ? 'url(#premium-striped-pattern)' : '#f28d00',
                              lowColor: '#f28d00',
                              count: item?.[secondaryCountKey]
                          })),
                          dataLabels: {
                              enabled: false
                          },
                          tooltip: {
                              pointFormatter: function () {
                                  const point = this as Highcharts.Point & {
                                      count?: number;
                                      color?: string;
                                      lowColor?: string;
                                  };

                                  return highChartPointFormatter(point?.count, point.lowColor, point.name, point.y, percentageOnYAxis);
                              }
                          }
                      }
                  ]
                : [])
        ];

        return series;
    }, [comparisonType, data, colorForAll, includeStripedPattern, isShowPremiumPupilBar, percentageOnYAxis]);

    const categories: string[] = data.map((item) => item.name);

    const hasStripedPattern =
        includeStripedPattern &&
        data?.some((item) => {
            switch (comparisonType) {
                case ComparisonType.PREMIUM_PUPILS:
                    return item?.premiumPupilCount <= 4;

                case ComparisonType.SEND:
                    return item?.sendPupilCount <= 4;

                case ComparisonType.EAL:
                    return item?.ealPupilCount <= 4;

                case ComparisonType.GENDER:
                    return item?.boysCount <= 4 || item?.girlsCount <= 4;
            }
        });

    return (
        <ColumnGraph
            yAxisTitle={yAxisTitle}
            series={series}
            colorForAll={colorForAll}
            title={name}
            categories={categories}
            percentageOnYAxis={percentageOnYAxis}
            hasStripedPattern={hasStripedPattern}
            graphName={graphName}
            isLegendEnabled={series.length > 1}
            showXAxisBarLabels={showXAxisBarLabels}
            graphUniqueIdentifier={graphUniqueIdentifier}
        />
    );
};

export default ColumnGraphForAnalysisMetric;
