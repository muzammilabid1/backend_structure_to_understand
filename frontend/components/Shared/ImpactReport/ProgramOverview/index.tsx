import { Grid } from '@mui/material';

import { showDate } from '../../../../shared/Services/handler';
import { ILwpSchoolImpactReport, ILwpSchoolImpactReportV2 } from '../../../../types/entities/ILwpSchoolImpactReport';
import CommonCard from '../../Cards/CommonCard';
import CommonSwitch from '../../CommonSwitch';
import Heading2 from '../../Typography/Heading2';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';

interface ProgramOverviewProps {
    impactReport?: ILwpSchoolImpactReport | ILwpSchoolImpactReportV2;
    activeFamilyDescription: string;
    activePremiumFamilyDescription: string;
    numberOfWeeksText: string;
    activePremiumFamilyLabel: string;
    isAdminView?: boolean;
    showNationalDataAverage?: boolean;
    handleToDisplayNationalDataAverage?: (value: boolean) => void;
    showNationalDataAverageLoading?: boolean;
}

const ProgramOverview = ({
    impactReport,
    activeFamilyDescription,
    activePremiumFamilyDescription,
    numberOfWeeksText,
    activePremiumFamilyLabel,
    isAdminView,
    showNationalDataAverage = true, // Default to true for v1 reports
    showNationalDataAverageLoading,
    handleToDisplayNationalDataAverage
}: ProgramOverviewProps) => {
    return (
        <CommonCard className="program-overview">
            <Grid container justifyContent="space-between" alignItems="center">
                <Grid>
                    <Heading2 text="Programme overview" />
                </Grid>

                {/* This switch allows admin users to include or exclude national data averages in the impact report v2 */}
                {isAdminView ? (
                    <Grid>
                        <CommonSwitch
                            label={'Include national data average'}
                            checked={showNationalDataAverage}
                            onClick={() => handleToDisplayNationalDataAverage(!showNationalDataAverage)}
                            disabled={showNationalDataAverageLoading}
                        />
                    </Grid>
                ) : null}
            </Grid>

            <Grid container mt={2} spacing={3}>
                <Grid item>
                    <Heading3 text="Launch date" />
                    <Paragraph text={showDate({ date: impactReport?.launchDate, justDate: true }) || '--'} />
                </Grid>
                <Grid item>
                    <Heading3 text={numberOfWeeksText} />
                    <Paragraph text={impactReport?.numberOfWeeks || '--'} />
                </Grid>
                {impactReport?.weeklyReadingTarget ? (
                    <Grid item>
                        <Heading3 text="Weekly reading target in days:" />
                        <Paragraph text={impactReport?.weeklyReadingTarget} />
                    </Grid>
                ) : null}

                <Grid item>
                    <Heading3 text="Year group coverage" />
                    <Paragraph text={impactReport?.yearGroupCoverage || '--'} />
                </Grid>
            </Grid>

            <Grid mt={3}>
                <Heading3 text="Number of classes" />
                <Paragraph text={impactReport?.numberOfClasses || '--'} />
            </Grid>

            {impactReport?.spmNote && (
                <Grid mt={3}>
                    <Heading3 text="A comment from your School Partnership Manager:" />
                    <Paragraph dataTest="spm-note" text={impactReport.spmNote} />
                </Grid>
            )}

            <Grid mt={3}>
                <Paragraph customClass="active-families-content">
                    <Heading3 text={`${impactReport?.activeFamiliesPercentage || 0}% of pupils are active `} />
                    {showNationalDataAverage
                        ? `(Learning with Parents national average: ${impactReport?.activeFamiliesPercentageAllSchools || 0}%)`
                        : null}
                </Paragraph>
                <Paragraph text={activeFamilyDescription} />
            </Grid>

            <Grid mt={3}>
                <Paragraph customClass="active-families-content">
                    <Heading3 text={activePremiumFamilyLabel} />
                    {showNationalDataAverage
                        ? `(Learning with Parents national average: ${impactReport?.activePremiumFamiliesPercentageAllSchools || 0}%)`
                        : null}
                </Paragraph>
                <Paragraph text={activePremiumFamilyDescription} />
            </Grid>

            {/* <Grid mt={3}>
                <Heading3 text="Description" />
                <Paragraph text={'This is the percentage of families who have left a comment or feedback on the site this academic year'} />
            </Grid> */}
        </CommonCard>
    );
};

export default ProgramOverview;
