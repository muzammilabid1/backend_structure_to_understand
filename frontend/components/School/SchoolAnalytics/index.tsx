import { gql, useQuery } from '@apollo/client';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Grid } from '@mui/material';
import { SchoolImpactReportType } from 'lwp-shared';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo } from 'react';

import { MINIO_PUBLIC_PATHS, SCHOOL_ANALYTICS } from '../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../../Shared/CommonLoading';
import CommonStatus from '../../Shared/CommonStatus';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

const getSchoolResourceStatus = gql`
    query getSchoolResourceStatus($schoolId: String!) {
        getSchoolResourceStatus(schoolId: $schoolId) {
            hasReadingClasses
            hasFullProgramClasses
        }
    }
`;

const SchoolAnalytics = () => {
    const router = useRouter();
    const schoolId = router.query.school_id as string;
    const { callSnackbar } = useContext(ThemeContext);

    const { loading, data, error } = useQuery(getSchoolResourceStatus, {
        variables: {
            schoolId
        },
        skip: !schoolId
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const analyticsContent: { title: string; subTitle: string; dataTest: string; type: SchoolImpactReportType; name?: string }[] =
        useMemo(() => {
            const contentList = [];

            const schoolResource: {
                hasReadingClasses: boolean;
                hasFullProgramClasses: boolean;
            } = data?.getSchoolResourceStatus;

            if (schoolResource?.hasFullProgramClasses) {
                contentList.push(...SCHOOL_ANALYTICS.filter((content) => content.type === SchoolImpactReportType.TOPIC_ACTIVITY));
            }

            if (schoolResource?.hasReadingClasses) {
                contentList.push(...SCHOOL_ANALYTICS.filter((content) => content.type === SchoolImpactReportType.READING));
            }

            return contentList;
        }, [data]);

    if (loading || !schoolId) return <CommonLoading />;

    return (
        <div className="school-analytics-container">
            {analyticsContent.length > 0 ? (
                <Grid container gap={3} className="school-analytics-grid" data-test="school-analytics-list">
                    {analyticsContent.map((content, index) => (
                        <Grid
                            key={index}
                            className={`school-analytics-card ${content.type}`}
                            onClick={() => {
                                const reportType = content.type === SchoolImpactReportType.TOPIC_ACTIVITY ? 'topic-activity' : 'reading';

                                router.push(`/school/${schoolId}/analytics/${reportType}/${content.name}`);
                            }}>
                            <div>
                                <Heading2 text={content.title} />
                                <Paragraph text={content.subTitle} />
                            </div>
                            <ChevronRightIcon data-test={content.dataTest} fontSize={'large'} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading={'Nothing to show here'}
                    subHeadingDataTest="no-analytics-data"
                    subHeading={
                        'There are no active reading classes or full programme classes for this school in the current academic year.'
                    }
                    className="my20"
                />
            )}
        </div>
    );
};

export default SchoolAnalytics;
