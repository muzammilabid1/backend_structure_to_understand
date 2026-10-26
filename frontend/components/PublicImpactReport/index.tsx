/* eslint-disable @next/next/no-img-element */
import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { ImpactReportVersion } from 'lwp-shared';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import LinkExpiredPage from '../../components/LinkExpiredPage';
import { MINIO_PUBLIC_PATHS, TEACHER } from '../../shared/Constant';
import { handleImpactReportErrorSnackbar, ThemeContext } from '../../shared/Services/handler';
import ImpactReportV2Output from '../School/ImpactReport/ImpactReportV2/ImpactReportV2Output';
import CommonLoading from '../Shared/CommonLoading';
import CommonStatus from '../Shared/CommonStatus';
import Heading1 from '../Shared/Typography/Heading1';
import ImpactReportV1 from './ImpactReportV1';

const schoolImpactReportFields: string = `
            id
            launchDate
            premiumPupilsCount
            pupilsCount
            spmNote
            spmNextStepsProgram
            numberOfWeeks
            weeklyReadingTarget
            yearGroupCoverage
            numberOfClasses
            activeFamiliesPercentage
            activeFamiliesPercentageAllSchools
            activePremiumFamiliesPercentage
            activePremiumFamiliesPercentageAllSchools
            reportType
            feedbacks {
                pupilFirstName
                contentType
                className
                classYearGroup
                content
            }
            engagementByYearGroup {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
                premiumPupilCount
                allPupilsCount
            }
            engagementByClass {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
                premiumPupilCount
                allPupilsCount
            }
            avgWeeklyTargetMetByYearGroup {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
                premiumPupilCount
                allPupilsCount
            }
            avgWeeklyTargetMetByClass {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
                premiumPupilCount
                allPupilsCount
            }
            avgTopicSetByYearGroup {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
                premiumPupilCount
                allPupilsCount
            }
            avgTopicSetByClass {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
                premiumPupilCount
                allPupilsCount
            }
            buildingEngagement {
                name
                activeFamiliesPercentage
                activePremiumFamiliesPercentage
            }
`;

const getSchoolImpactReportFromMagicLink = gql`
    query getSchoolImpactReportFromMagicLink($token: String!) {
        getSchoolImpactReportFromMagicLink(token: $token) {
            schoolName
            reportType
            impactReportVersion
            topicsVersion {
                ${schoolImpactReportFields}
            }
            readingVersion {
                ${schoolImpactReportFields}
            }
            impactReportV2 {
                id
                launchDate
                spmNote
                spmNextStepsProgram
                numberOfWeeks
                weeklyReadingTarget
                yearGroupCoverage
                numberOfClasses
                activeFamiliesPercentage
                activeFamiliesPercentageAllSchools
                activePremiumFamiliesPercentage
                activePremiumFamiliesPercentageAllSchools
                showNationalDataAverage
                feedbacks {
                    pupilFirstName
                    contentType
                    className
                    classYearGroup
                    content
                }
                graphs {
                    id
                    premiumPupilsCount
                    pupilsCount
                    subject {
                        id 
                        name
                    }
                    engagementByYearGroup {
                        name
                        activeFamiliesPercentage
                        activePremiumFamiliesPercentage
                        premiumPupilCount
                        allPupilsCount
                    }
                    avgCompletionRateByYearGroup {
                        name
                        activeFamiliesPercentage
                        activePremiumFamiliesPercentage
                        premiumPupilCount
                        allPupilsCount
                    }
                    avgTopicSetByClass {
                        name
                        activeFamiliesPercentage
                        activePremiumFamiliesPercentage
                        premiumPupilCount
                        allPupilsCount
                    }
                    buildingEngagement {
                        name
                        activeFamiliesPercentage
                        activePremiumFamiliesPercentage
                    }
                }
            }
            
        }
    }
`;

const PublicImpactReport = () => {
    const { query, isReady } = useRouter();
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState<boolean>(false);
    const [magicLinkType, setMagicLinkType] = useState<string | null>(null);
    const [impactReportSchoolId, setImpactReportSchoolId] = useState<string | null>(null);
    const { callSnackbar, token } = useContext(ThemeContext);

    const {
        loading,
        error: error,
        data: schoolImpactData
    } = useQuery(getSchoolImpactReportFromMagicLink, {
        variables: { token: query?.token },
        skip: !isReady || !query?.token
    });

    const impactReports = schoolImpactData?.getSchoolImpactReportFromMagicLink ?? null;

    useEffect(() => {
        handleImpactReportErrorSnackbar(callSnackbar, error, setMagicLinkType, setImpactReportSchoolId, setShowLinkExpiredPage);
    }, [error]);

    if (loading) return <CommonLoading />;

    if (showLinkExpiredPage) {
        const magicLinkToken: string = Array.isArray(query?.magiclink) ? query.magiclink[0] : query.magiclink;

        return (
            <LinkExpiredPage
                token={magicLinkToken}
                magicLinkType={magicLinkType}
                isUserLoggedIn={token?.userType === TEACHER && token?.isSchoolLeader && token?.schoolId ? token?.schoolId : null}
                schoolId={impactReportSchoolId}
            />
        );
    }

    return (
        <div className="impact-report">
            <div className="public-impact-report-header-container">
                <div className="public-impact-report-header">
                    <Grid className="impact-report-content" container justifyContent={'space-between'} alignItems={'center'}>
                        <Grid item lg={7} md={7} sm={12} xs={12}>
                            <Heading1 text={`${schoolImpactData?.getSchoolImpactReportFromMagicLink?.schoolName} impact report`} />
                        </Grid>

                        <Grid item sm={0} xs={0}>
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/impact-report.svg`}
                                alt="impact report logo"
                                className="impact_report_logo"
                            />
                        </Grid>
                    </Grid>
                </div>
            </div>
            <Grid>
                {impactReports ? (
                    impactReports?.impactReportVersion === ImpactReportVersion.VERSION_1 ? (
                        <ImpactReportV1 impactReports={impactReports} />
                    ) : (
                        <ImpactReportV2Output schoolImpactReport={impactReports?.impactReportV2} />
                    )
                ) : (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala-oops.png`}
                        imageAlt={'Impact report not available'}
                        heading="Impact report not available"
                    />
                )}
            </Grid>
        </div>
    );
};

export default PublicImpactReport;
