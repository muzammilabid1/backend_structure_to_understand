import { SeriesOptionsType } from 'highcharts';
import { useMemo } from 'react';

import LineGraph from '../../../../Shared/Graphs/LineGraph';
import { ComparisonType, SchoolAnalyticsGraphOutput } from '..';

interface BuildingEngagementGraphProps {
    graphName?: string;
    colorForAll: string;
    xAxisTitle: string;
    graphUniqueIdentifier?: string;
    comparisonType: ComparisonType;
    data: SchoolAnalyticsGraphOutput;
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

const BuildingEngagementGraphForAnalysisMetric = ({
    xAxisTitle,
    colorForAll,
    graphName,
    graphUniqueIdentifier,
    comparisonType,
    data
}: BuildingEngagementGraphProps) => {
    const series = useMemo(() => {
        const { primaryLabel, primaryCountKey, primaryPercentageKey, secondaryLabel, secondaryCountKey, secondaryPercentageKey } =
            getLabelsAndKeys(comparisonType);

        const series: Array<SeriesOptionsType> = [
            {
                type: 'line',
                name: primaryLabel,
                color: colorForAll,
                dashStyle: data?.[primaryCountKey] <= 4 ? 'Dash' : 'Solid',
                data: data?.graphData?.slice(1).map((item) => ({
                    name: item.name,
                    y: item?.[primaryPercentageKey],
                    drilldown: item.name,
                    color: colorForAll
                }))
            },
            {
                type: 'line',
                name: secondaryLabel,
                color: '#f28d00',
                dashStyle: data?.[secondaryCountKey] <= 4 ? 'Dash' : 'Solid',
                data: data?.graphData?.slice(1).map((item) => {
                    return {
                        name: item.name,
                        y: item?.[secondaryPercentageKey],
                        drilldown: item.name,
                        color: '#f28d00'
                    };
                })
            }
        ];

        return series;
    }, [comparisonType, data, colorForAll]);

    const categories: string[] = data?.graphData?.slice(1).map((item) => item.name);

    const hasStripedPattern = () => {
        switch (comparisonType) {
            case ComparisonType.PREMIUM_PUPILS:
                return data?.premiumPupilCount <= 4;

            case ComparisonType.SEND:
                return data?.sendPupilCount <= 4;

            case ComparisonType.EAL:
                return data?.ealPupilCount <= 4;

            case ComparisonType.GENDER:
                return data?.boysCount <= 4 || data?.girlsCount <= 4;

            default:
                return false;
        }
    };

    return (
        <LineGraph
            categories={categories}
            title={xAxisTitle}
            series={series}
            hasStripedPattern={hasStripedPattern()}
            graphName={graphName}
            graphUniqueIdentifier={graphUniqueIdentifier}
        />
    );
};

export default BuildingEngagementGraphForAnalysisMetric;
