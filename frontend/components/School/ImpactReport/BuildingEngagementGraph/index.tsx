import { gql, useMutation } from '@apollo/client';
import { Grid, Tooltip } from '@mui/material';
import { SeriesOptionsType } from 'highcharts';
import { useContext, useState } from 'react';

import { ThemeContext } from '../../../../shared/Services/handler';
import { IEngagementStatisticsOutput } from '../../../../types/entities/ILwpSchoolImpactReport';
import CommonCard from '../../../Shared/Cards/CommonCard';
import LineGraph from '../../../Shared/Graphs/LineGraph';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Heading2 from '../../../Shared/Typography/Heading2';
import Paragraph from '../../../Shared/Typography/Paragraph';

// Mutation
const deleteGraphFromSchoolImpactReportForBuildingEngagementGraph = gql`
    mutation deleteGraphFromSchoolImpactReport($id: String!, $graphName: String!) {
        deleteGraphFromSchoolImpactReport(id: $id, graphName: $graphName)
    }
`;

interface BuildingEngagementGraphProps {
    description?: string;
    impactReportId?: string;
    graphName?: string;
    data: IEngagementStatisticsOutput[];
    colorForAll: string;
    xAxisTitle: string;
    colorForPremium?: string;
    premiumPupilsCount?: number;
    pupilsCount?: number;
    isAdminView?: boolean;
    refetch?: () => void;
    isOnlyGraph?: boolean;
    handleDeleteGraphFromImpactReportV2?: () => Promise<void>;
    graphUniqueIdentifier?: string;
}

const BuildingEngagementGraph = ({
    description,
    xAxisTitle,
    data,
    colorForAll,
    colorForPremium,
    graphName,
    impactReportId,
    isAdminView,
    premiumPupilsCount,
    pupilsCount,
    refetch,
    isOnlyGraph,
    graphUniqueIdentifier,
    handleDeleteGraphFromImpactReportV2 // optional prop to handle delete graph action for impact report v2, this is only used by admin impact report v2 preview
}: BuildingEngagementGraphProps) => {
    const [open, setOpen] = useState<boolean>(false);
    const { callSnackbar } = useContext(ThemeContext);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const [deleteGraphFromSchoolImpactReportForBuildingEngagementGraphMutation, { loading }] = useMutation(
        deleteGraphFromSchoolImpactReportForBuildingEngagementGraph
    );

    const series: Array<SeriesOptionsType> = [
        {
            type: 'line',
            name: 'All',
            color: colorForAll,
            dashStyle: typeof pupilsCount === 'number' && pupilsCount <= 4 ? 'Dash' : 'Solid',
            data: data?.slice(1).map((item) => ({
                name: item.name,
                y: item.activeFamiliesPercentage,
                drilldown: item.name,
                color: colorForAll
            }))
        },
        {
            type: 'line',
            name: 'Pupil Premium',
            color: colorForPremium ?? '#f28d00',
            dashStyle: typeof premiumPupilsCount === 'number' && premiumPupilsCount <= 4 ? 'Dash' : 'Solid',
            data: data?.slice(1).map((item) => {
                return {
                    name: item.name,
                    y: item.activePremiumFamiliesPercentage,
                    drilldown: item.name,
                    color: colorForPremium ?? '#f28d00'
                };
            })
        }
    ];
    const categories: string[] = data?.slice(1).map((item) => item.name);

    const lineGraphComponent: JSX.Element = (
        <LineGraph
            categories={categories}
            title={xAxisTitle}
            series={series}
            hasStripedPattern={
                (typeof pupilsCount === 'number' && pupilsCount <= 4) || (typeof premiumPupilsCount === 'number' && premiumPupilsCount <= 4)
            }
            graphName={graphName}
            graphUniqueIdentifier={graphUniqueIdentifier}
        />
    );

    // Render only graph, in the school analytics page
    if (isOnlyGraph) {
        return lineGraphComponent;
    }

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            if (handleDeleteGraphFromImpactReportV2) {
                await handleDeleteGraphFromImpactReportV2();
            } else {
                await deleteGraphFromSchoolImpactReportForBuildingEngagementGraphMutation({
                    variables: { id: impactReportId, graphName }
                });
                refetch();
            }

            callSnackbar(`Building engagement deleted successfully`);
        } catch (err) {
            callSnackbar(err, 'error');
        } finally {
            setIsDeleting(false);
            setOpen(false);
        }
    };

    return (
        <CommonCard className="graph-container">
            <Grid container spacing={3}>
                <Grid item xs={12} display={'flex'} justifyContent={'space-between'}>
                    <Heading2 text={'Building Engagement'} />
                    {isAdminView ? (
                        <Tooltip title={'Delete'}>
                            <span className={`material-icons cursor-pointer`} onClick={() => setOpen(true)}>
                                delete
                            </span>
                        </Tooltip>
                    ) : null}
                </Grid>
                <Grid item xs={12}>
                    <Paragraph text={description} />
                </Grid>
                <Grid item xs={12}>
                    {lineGraphComponent}
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
                    {`Are you sure you want to delete Building engagement graph?`}
                </ConfirmationModal>
            ) : null}
        </CommonCard>
    );
};

export default BuildingEngagementGraph;
