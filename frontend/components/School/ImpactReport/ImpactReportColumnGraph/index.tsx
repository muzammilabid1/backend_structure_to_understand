import { gql, useMutation } from '@apollo/client';
import { Grid, Tooltip } from '@mui/material';
import { SeriesOptionsType } from 'highcharts';
import { useContext, useState } from 'react';

import { highChartPointFormatter, ThemeContext } from '../../../../shared/Services/handler';
import { IEngagementStatisticsOutput } from '../../../../types/entities/ILwpSchoolImpactReport';
import CommonCard from '../../../Shared/Cards/CommonCard';
import ColumnGraph from '../../../Shared/Graphs/ColumnGraph';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Heading2 from '../../../Shared/Typography/Heading2';
import Paragraph from '../../../Shared/Typography/Paragraph';

const deleteGraphFromSchoolImpactReportForImpactReportColumnGraph = gql`
    mutation deleteGraphFromSchoolImpactReport($id: String!, $graphName: String!) {
        deleteGraphFromSchoolImpactReport(id: $id, graphName: $graphName)
    }
`;

interface ImpactReportColumnGraphProps {
    title?: string;
    impactReportId?: string;
    graphName?: string;
    description?: string;
    yAxisTitle: string;
    name: string;
    data: IEngagementStatisticsOutput[];
    colorForAll: string;
    colorForPremium?: string;
    percentageOnYAxis?: boolean;
    isAdminView?: boolean;
    includeStripedPattern?: boolean;
    refetch?: () => void;
    isShowPremiumPupilBar?: boolean;
    isOnlyGraph?: boolean;
    showXAxisBarLabels?: boolean;
    handleDeleteGraphFromImpactReportV2?: () => Promise<void>;
    graphUniqueIdentifier?: string;
}

const ImpactReportColumnGraph = ({
    title,
    impactReportId,
    description,
    yAxisTitle,
    name,
    data,
    colorForAll,
    colorForPremium,
    percentageOnYAxis = true,
    isAdminView,
    includeStripedPattern = false,
    graphName,
    refetch,
    isShowPremiumPupilBar = true,
    isOnlyGraph = false, // when rendering graph on impact report need to render all content and when rendering graph on school analytics need to render only graph
    showXAxisBarLabels = true, // hide x-axis label if All pupils are selected
    handleDeleteGraphFromImpactReportV2, // optional prop to handle delete graph action for impact report v2, this is only used by admin impact report v2 preview
    graphUniqueIdentifier
}: ImpactReportColumnGraphProps) => {
    const [open, setOpen] = useState<boolean>(false);
    const { callSnackbar } = useContext(ThemeContext);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const [deleteGraphFromSchoolImpactReportForImpactReportColumnGraphMutation, { loading }] = useMutation(
        deleteGraphFromSchoolImpactReportForImpactReportColumnGraph
    );

    const series: Array<SeriesOptionsType> = [
        {
            type: 'column',
            name: 'All',
            color: colorForAll,
            data: data?.map((item) => ({
                name: item.name,
                y: item.activeFamiliesPercentage,
                drilldown: item.name,
                color: includeStripedPattern && item?.allPupilsCount <= 4 ? 'url(#normal-striped-pattern)' : colorForAll,
                lowColor: colorForAll,
                allPupilsCount: item?.allPupilsCount
            })),
            tooltip: {
                pointFormatter: function () {
                    const point = this as Highcharts.Point & {
                        allPupilsCount?: number;
                        color?: string;
                        lowColor?: string;
                    };

                    return highChartPointFormatter(point?.allPupilsCount, point.lowColor, point.name, point.y, percentageOnYAxis);
                }
            }
        },
        ...(isShowPremiumPupilBar
            ? [
                  {
                      type: 'column' as const,
                      name: 'Pupil Premium',
                      color: colorForPremium ?? '#f28d00',
                      data: data?.map((item) => ({
                          name: item.name,
                          y: item.activePremiumFamiliesPercentage,
                          drilldown: item.name,
                          color:
                              includeStripedPattern && item.premiumPupilCount <= 4
                                  ? 'url(#premium-striped-pattern)'
                                  : (colorForPremium ?? '#f28d00'),
                          lowColor: colorForPremium ?? '#f28d00',
                          premiumCount: item.premiumPupilCount
                      })),
                      dataLabels: {
                          enabled: false
                      },
                      tooltip: {
                          pointFormatter: function () {
                              const point = this as Highcharts.Point & {
                                  premiumCount?: number;
                                  color?: string;
                                  lowColor?: string;
                              };

                              return highChartPointFormatter(point?.premiumCount, point.lowColor, point.name, point.y, percentageOnYAxis);
                          }
                      }
                  }
              ]
            : [])
    ];

    const categories: string[] = data.map((item) => item.name);

    const hasStripedPattern = includeStripedPattern && data?.some((item: IEngagementStatisticsOutput) => item.premiumPupilCount <= 4);

    const renderColumnGraph = (showXAxisBarLabels: boolean): JSX.Element => (
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

    // Render only graph, in the school analytics page
    if (isOnlyGraph) {
        return renderColumnGraph(showXAxisBarLabels);
    }

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            if (handleDeleteGraphFromImpactReportV2) {
                await handleDeleteGraphFromImpactReportV2();
            } else {
                await deleteGraphFromSchoolImpactReportForImpactReportColumnGraphMutation({
                    variables: { id: impactReportId, graphName }
                });
                refetch();
            }

            callSnackbar(`${title} deleted successfully`);
        } catch (err) {
            callSnackbar(err, 'error');
        } finally {
            setOpen(false);
            setIsDeleting(false);
        }
    };

    return (
        <CommonCard className="graph-container">
            <Grid container spacing={3}>
                <Grid item xs={12} display={'flex'} justifyContent={'space-between'}>
                    <Heading2 dataTest={`${graphName}-heading`} text={title} />
                    {isAdminView ? (
                        <Tooltip title={'Delete'}>
                            <span
                                data-test={`${graphName}-delete-button`}
                                className={`material-icons cursor-pointer`}
                                onClick={() => setOpen(true)}>
                                delete
                            </span>
                        </Tooltip>
                    ) : null}
                </Grid>
                <Grid item xs={12}>
                    <Paragraph text={description} />
                </Grid>
                <Grid item xs={12}>
                    {renderColumnGraph(showXAxisBarLabels)}
                </Grid>
            </Grid>
            {open ? (
                <ConfirmationModal
                    open={open}
                    onCancel={() => setOpen(false)}
                    onConfirm={handleDelete}
                    loading={loading || isDeleting}
                    heading={'Delete graph'}
                    btnText={'Delete'}>
                    {`Are you sure you want to delete ${title} graph?`}
                </ConfirmationModal>
            ) : null}
        </CommonCard>
    );
};

export default ImpactReportColumnGraph;
