/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { ImpactReportVersion, SchoolImpactReportType } from 'lwp-shared';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useContext, useEffect, useMemo, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../shared/Services/handler';
import { ILwpSchoolImpactReport, ILwpSchoolImpactReportV2 } from '../../../types/entities/ILwpSchoolImpactReport';
import { ISchoolTermsForSchoolImpactReportOutput } from '../../../types/entities/ISchoolTermsForSchoolImpactReportOutput';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonButtonGroup from '../../Shared/CommonButtonGroup';
import CommonLoading from '../../Shared/CommonLoading';
import CommonSelectField from '../../Shared/CommonSelectField';
import CommonStatus from '../../Shared/CommonStatus';
import DialogWrapper from '../../Shared/DialogWrapper';
import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';
import { handlePrintReport as handlePrintImpactReportV1 } from './impactReportV1Pdf';
import ImpactReportV2 from './ImpactReportV2';
import { handlePrintReport as handlePrintImpactReportV2 } from './impactReportV2Pdf';
import ReadingImpactReport from './ReadingImpactReport';
import TopicAndActivityImpactReport from './TopicAndActivityImpactReport';

const getTermsForSchoolImpactReportForSchoolImpactReportPage = gql`
    query getTermsForSchoolImpactReport($schoolId: String!) {
        getTermsForSchoolImpactReport(schoolId: $schoolId) {
            id
            termName
            hasReadingReport
            hasTopicAndActivityReport
            hasVersion2Report
        }
    }
`;

const generateSchoolImpactReportMagicLinkForSchoolImpactReportPage = gql`
    mutation generateSchoolImpactReportMagicLink($schoolId: String!, $termId: String!, $reportType: SchoolImpactReportType) {
        generateSchoolImpactReportMagicLink(schoolId: $schoolId, termId: $termId, reportType: $reportType) {
            url
            expiryTime
        }
    }
`;

const getSchoolForPDF = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            schoolName
        }
    }
`;

const ImpactReport = () => {
    const router = useRouter();
    const schoolId = router.query?.school_id as string;

    const { callSnackbar } = useContext(ThemeContext);
    const [tabValue, setTabValue] = useState('0');

    const [schoolImpactReportMagicLink, setSchoolImpactReportMagicLink] = useState<{ url: string; expiryTime: Date }>({
        url: null,
        expiryTime: null
    });

    const [impactReport, setImpactReport] = useState<ILwpSchoolImpactReport | ILwpSchoolImpactReportV2>(null);
    const [printLoading, setPrintLoading] = useState<boolean>(false);

    const {
        data: termsData,
        error: termsError,
        loading
    } = useQuery(getTermsForSchoolImpactReportForSchoolImpactReportPage, {
        variables: {
            schoolId
        },
        skip: !schoolId
    });

    const [fetchSchoolForPDF] = useLazyQuery(getSchoolForPDF);

    const [generateSchoolImpactReportMagicLinkMutation, { loading: generateSchoolImpactReportMagicLinkLoading, error: magicLinkError }] =
        useMutation(generateSchoolImpactReportMagicLinkForSchoolImpactReportPage);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, magicLinkError);
        handleErrorSnackbar(callSnackbar, termsError);
    }, [magicLinkError, termsError]);

    const { terms, activeTerm } = useMemo(() => {
        const termsOutput: ISchoolTermsForSchoolImpactReportOutput[] = termsData?.getTermsForSchoolImpactReport || [];

        const terms = termsOutput.map((term) => ({
            key: term?.id,
            value: term?.termName
        }));
        const termId = +router.query?.term || terms[0]?.key;

        const activeTerm: ISchoolTermsForSchoolImpactReportOutput = termsOutput.find((term) => term.id == termId);

        return { terms, activeTerm };
    }, [termsData?.getTermsForSchoolImpactReport, router.query]);

    const groupBtn: { key: string; name: string }[] = [
        activeTerm?.hasTopicAndActivityReport ? 'Topic and activities' : undefined,
        activeTerm?.hasReadingReport ? 'Reading' : undefined
    ]
        .filter((tab) => tab)
        .map((tab, ind) => ({
            key: ind.toString(),
            name: tab
        }));

    const handleClickOnPrint = async () => {
        setPrintLoading(true);
        try {
            const { data } = await fetchSchoolForPDF({
                variables: {
                    id: schoolId
                }
            });
            const schoolName: string = data?.getSchool?.schoolName;

            if (impactReport?.version === ImpactReportVersion.VERSION_1)
                await handlePrintImpactReportV1(impactReport as ILwpSchoolImpactReport, schoolName);
            else if (impactReport?.version === ImpactReportVersion.VERSION_2)
                await handlePrintImpactReportV2(impactReport as ILwpSchoolImpactReportV2, schoolName);
        } catch (e) {
            callSnackbar(e.message, 'error');
        }

        setPrintLoading(false);
    };

    if (loading) return <CommonLoading />;

    if (termsData && termsData?.getTermsForSchoolImpactReport.length === 0)
        return (
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                imageAlt={''}
                heading={'No impact report found'}
                className="my20"
            />
        );

    return (
        <div className="impact-report">
            <div className="impact-report-container">
                <div className="impact-report-background">
                    <Grid className="impact-report-content" container justifyContent={'space-between'} alignItems={'center'}>
                        <Grid item lg={6} md={6} sm={12} xs={12}>
                            <Heading1 text="School impact report" />
                            <br />
                            <CommonSelectField
                                label={'Term'}
                                options={terms}
                                value={activeTerm?.id}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    router.push({
                                        query: {
                                            ...router.query,
                                            term: e.target.value
                                        }
                                    });
                                    setImpactReport(null);
                                }}
                            />
                            {groupBtn?.length > 1 ? (
                                <>
                                    <br />
                                    <CommonButtonGroup
                                        groupBtn={groupBtn}
                                        select={tabValue}
                                        onClick={(value) => {
                                            if (value === tabValue) return;
                                            setTabValue(value);
                                            setImpactReport(null);
                                        }}
                                    />
                                </>
                            ) : null}
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

            {terms?.length > 0 && (
                <Grid>
                    <CommonCard className="my8">
                        <Grid container justifyContent="space-between" alignItems="center" gap={2}>
                            <Grid item>
                                <Paragraph
                                    text={
                                        impactReport?.logCreatedAt ? (
                                            <>
                                                Report generated on <b>{showDate({ date: impactReport.logCreatedAt, year: true })}</b>
                                            </>
                                        ) : (
                                            ''
                                        )
                                    }
                                />
                            </Grid>

                            <Grid item className="share-print-btn">
                                <LWPButton
                                    btnText="Share"
                                    onClick={() => {
                                        /**
                                         * For version 1 of the report, the report type must be specified to generate the magic link.
                                         * For version 2, the report type is not required as there is only one combined report.
                                         */
                                        const reportType =
                                            impactReport?.version === ImpactReportVersion.VERSION_1
                                                ? tabValue === '0' && activeTerm?.hasTopicAndActivityReport
                                                    ? SchoolImpactReportType.TOPIC_ACTIVITY
                                                    : SchoolImpactReportType.READING
                                                : null;

                                        generateSchoolImpactReportMagicLinkMutation({
                                            variables: {
                                                schoolId,
                                                termId: activeTerm?.id,
                                                reportType
                                            }
                                        })
                                            .then(({ data }) => {
                                                setSchoolImpactReportMagicLink({
                                                    url: `${location.protocol}//${location.host}/magic/${data?.generateSchoolImpactReportMagicLink?.url}`,
                                                    expiryTime: data?.generateSchoolImpactReportMagicLink?.expiryTime
                                                });
                                            })
                                            .catch((error) => {
                                                callSnackbar(error.message, 'error');
                                            });
                                    }}
                                    color="inherit"
                                    startIcon="share"
                                    disabled={generateSchoolImpactReportMagicLinkLoading}
                                    loading={generateSchoolImpactReportMagicLinkLoading}
                                />
                                <LWPButton
                                    btnText="Download PDF"
                                    startIcon="download"
                                    disabled={!impactReport || printLoading}
                                    loading={printLoading}
                                    onClick={handleClickOnPrint}
                                />
                            </Grid>
                        </Grid>
                    </CommonCard>

                    {activeTerm?.hasVersion2Report ? (
                        <ImpactReportV2 termId={activeTerm?.id} schoolId={schoolId} onDataLoad={(d) => setImpactReport(d)} />
                    ) : tabValue === '0' && activeTerm?.hasTopicAndActivityReport ? (
                        <TopicAndActivityImpactReport termId={activeTerm?.id} schoolId={schoolId} onDataLoad={(d) => setImpactReport(d)} />
                    ) : (
                        <ReadingImpactReport termId={activeTerm?.id} schoolId={schoolId} onDataLoad={(d) => setImpactReport(d)} />
                    )}
                </Grid>
            )}
            {schoolImpactReportMagicLink?.url ? (
                <DialogWrapper
                    className="reset_password_modal"
                    open={schoolImpactReportMagicLink?.url ? true : false}
                    setOpen={() => setSchoolImpactReportMagicLink({ expiryTime: null, url: null })}
                    contentWidth="768px"
                    heading="School impact report link">
                    <Paragraph
                        customClass="title"
                        text={`Use this link to access the school impact report. This link will expire in ${moment
                            .duration(moment(schoolImpactReportMagicLink?.expiryTime).diff(moment()))
                            .humanize()}.`}
                    />
                    <CopyToClipboard
                        text={schoolImpactReportMagicLink?.url}
                        onCopy={() => {
                            callSnackbar('Link copied!', 'success');
                        }}>
                        <div className="reset_pwd_link_contain">
                            <Paragraph dataTest="school-impact-report-magic-link" text={schoolImpactReportMagicLink?.url} />
                            <span className="material-icons icon">content_copy</span>
                        </div>
                    </CopyToClipboard>
                    <div className="btn_contain">
                        <LWPButton btnText="Finish" onClick={() => setSchoolImpactReportMagicLink({ expiryTime: null, url: null })} />
                    </div>
                </DialogWrapper>
            ) : null}
        </div>
    );
};

export default ImpactReport;
