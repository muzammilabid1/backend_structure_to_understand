import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, Collapse, Grid } from '@mui/material';
import { Formik } from 'formik';
import { ImpactReportVersion, SchoolImpactReportType } from 'lwp-shared';
import moment from 'moment';
import React, { ChangeEvent, useContext, useEffect, useMemo, useRef, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolImpactReport } from '../../../../types/entities/ILwpSchoolImpactReport';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonRadioButton from '../../../Shared/CommonRadioButton';
import CommonSelectField from '../../../Shared/CommonSelectField';
import DialogWrapper from '../../../Shared/DialogWrapper';
import Divider from '../../../Shared/Divider';
import InputField from '../../../Shared/InputField/InputField';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import ImpactReportV1Preview from './ImpactReportV1Preview';
import ImpactReportV2Preview from './ImpactReportV2Preview';

// Queries & Mutations

const generateSchoolImpactReportMagicLink = gql`
    mutation generateSchoolImpactReportMagicLink($schoolId: String!, $termId: String!, $reportType: SchoolImpactReportType) {
        generateSchoolImpactReportMagicLink(schoolId: $schoolId, termId: $termId, reportType: $reportType) {
            url
            expiryTime
        }
    }
`;

const generateSchoolImpactReport = gql`
    mutation generateSchoolImpactReport($input: GenrateSchoolImpactReportInput!) {
        generateSchoolImpactReport(input: $input) {
            id
            spmNote
        }
    }
`;

// For updating the spm note
const updateImpactReport = gql`
    mutation updateImpactReport($input: UpdateSchoolImpactReportInput!) {
        updateImpactReport(input: $input) {
            id
        }
    }
`;

const deleteImpactReport = gql`
    mutation deleteImpactReport($id: String!) {
        deleteImpactReport(id: $id)
    }
`;

const getAllTermsForSchoolImpactReportForImpactReport = gql`
    query getAllTermsForSchoolImpactReport {
        getAllTermsForSchoolImpactReport {
            id
            termName
        }
    }
`;

const generateImpactReportEmailLinkForSchoolLeaders = gql`
    mutation generateImpactReportEmailLinkForSchoolLeaders($schoolId: String!, $termId: String!) {
        generateImpactReportEmailLinkForSchoolLeaders(schoolId: $schoolId, termId: $termId)
    }
`;

const publishSchoolImpactReport = gql`
    mutation publishSchoolImpactReport($id: String!) {
        publishSchoolImpactReport(id: $id) {
            id
        }
    }
`;

const getSchoolImpactReportsByTerm = gql`
    query getSchoolImpactReportsByTerm($schoolId: String!, $termId: String!) {
        getSchoolImpactReportsByTerm(schoolId: $schoolId, termId: $termId) {
            id
            isPublished
            spmNote
            spmNextStepsProgram
            reportType
            version
            hasPublishedVersion
        }
    }
`;

const REPORT_TYPES = [
    {
        value: SchoolImpactReportType.TOPIC_ACTIVITY,
        text: 'Topic and activities',
        dataTest: 'topic-and-activities-option'
    },
    {
        value: SchoolImpactReportType.READING,
        text: 'Reading',
        dataTest: 'reading-option'
    }
];

interface IGenrateImpactReportFormValues {
    term: string;
    spmNote: string;
    spmNextStepsProgram: string;
    reportType: SchoolImpactReportType;
}

interface ImpactReportProps {
    schoolId: string;
}

const ImpactReport = ({ schoolId }: ImpactReportProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const formikRef = useRef(null);
    const [isPreviewModal, setIsPreviewModal] = useState<boolean>(false);
    const [impactReport, setImpactReport] = useState<ILwpSchoolImpactReport>(null);
    const [schoolImpactReportMagicLink, setSchoolImpactReportMagicLink] = useState<{ url: string; expiryTime: Date }>({
        url: null,
        expiryTime: null
    });
    const [impactReportToDelete, setImpactReportToDelete] = useState<{
        open: boolean;
        impactReportId: string;
        termId: string;
    }>({
        open: false,
        impactReportId: null,
        termId: null
    });

    const { error: termsError, data: termsData, loading } = useQuery(getAllTermsForSchoolImpactReportForImpactReport);

    const [
        fetchImpactReportsByTerm,
        {
            error: impactReportsByTermError,
            data: impactReportsByTermData,
            loading: impactReportsByTermLoading,
            refetch: refetchImpactReportsByTerm
        }
    ] = useLazyQuery(getSchoolImpactReportsByTerm, { notifyOnNetworkStatusChange: true });

    const [publishImpactReport, { loading: publishImpactReportLoading }] = useMutation(publishSchoolImpactReport);
    const [generateReport, { loading: generateReportLoading }] = useMutation(generateSchoolImpactReport);
    const [deleteImpactReportMutation, { loading: deleteImpactReportLoading }] = useMutation(deleteImpactReport);
    const [generateImpactReportEmailLinkForSchoolLeadersMutation, { loading: getSchoolLeadersEmailLinkDataLoading }] = useMutation(
        generateImpactReportEmailLinkForSchoolLeaders
    );

    const [updateReport, { loading: updateReportLoading }] = useMutation(updateImpactReport);
    const [generateSchoolImpactReportMagicLinkMutation, { loading: generateSchoolImpactReportMagicLinkLoading }] =
        useMutation(generateSchoolImpactReportMagicLink);

    const terms = useMemo(() => {
        const termsOutput: { id: string; termName: string }[] = termsData?.getAllTermsForSchoolImpactReport || [];

        return termsOutput.map((term, index) => ({
            key: term?.id,
            value: term?.termName,
            mostRecentEndedTerm: index === 0
        }));
    }, [termsData?.getAllTermsForSchoolImpactReport]);

    useEffect(() => {
        const termId = terms?.[0]?.key;

        if (termId && schoolId) {
            fetchImpactReportsByTerm({ variables: { schoolId, termId } });
        }
    }, [terms, schoolId]);

    const {
        selectedTermReports,
        haveImpactReports,
        isVersion1Only
    }: {
        selectedTermReports: Array<ILwpSchoolImpactReport> | null;
        haveImpactReports: boolean;
        isVersion1Only: boolean;
    } = useMemo(() => {
        const selectedTermReports: Array<ILwpSchoolImpactReport> = impactReportsByTermData?.getSchoolImpactReportsByTerm ?? [];

        // Show the "Generate email link for school leaders" button only if the selected term has either a published report or a draft that already has a published version.
        const haveImpactReports =
            selectedTermReports?.some((report: ILwpSchoolImpactReport) => report?.isPublished || report?.hasPublishedVersion) ?? false;

        const isVersion1Only =
            selectedTermReports?.length && selectedTermReports.every((report) => report.version === ImpactReportVersion.VERSION_1);

        return {
            selectedTermReports,
            haveImpactReports,
            isVersion1Only
        };
    }, [impactReportsByTermData?.getSchoolImpactReportsByTerm]);

    useEffect(() => {
        if (formikRef?.current) {
            /**
             * If the selected term contains only version 1 reports, we attempt to find a report that matches the selected report type.
             * If their is no v1 reports, we either set the impact report to the first available report (v2) or null if no reports exist.
             */
            const report = isVersion1Only
                ? selectedTermReports?.find((report) => report?.reportType === formikRef?.current?.values?.reportType)
                : (selectedTermReports?.[0] ?? null);

            setImpactReport(report || null);
            formikRef?.current?.setValues({
                ...formikRef?.current?.values,
                spmNote: report?.spmNote || ''
            });
        }
    }, [selectedTermReports, isVersion1Only]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, termsError);
        handleErrorSnackbar(callSnackbar, impactReportsByTermError);
    }, [termsError, impactReportsByTermError]);

    const handleGenerateImpactReport = async (termId: string): Promise<void> => {
        try {
            const generatedReportData = await generateReport({
                variables: {
                    input: { schoolId, termId }
                },
                refetchQueries: [
                    {
                        query: getSchoolImpactReportsByTerm,
                        variables: { schoolId, termId }
                    }
                ],
                awaitRefetchQueries: true
            });

            formikRef?.current?.setValues({
                ...formikRef?.current.values,
                spmNote: generatedReportData?.data?.generateSchoolImpactReport?.spmNote
            });

            callSnackbar('Report generated successfully', 'success');
        } catch (err) {
            handleErrorSnackbar(callSnackbar, err);
        }
    };

    const handleDeleteImpactReport = async (impactReportId: string, termId: string): Promise<void> => {
        try {
            await deleteImpactReportMutation({
                variables: {
                    id: impactReportId
                },
                refetchQueries: [
                    {
                        query: getSchoolImpactReportsByTerm,
                        variables: { schoolId, termId }
                    }
                ],
                awaitRefetchQueries: true
            });
            callSnackbar('Report deleted successfully');
            setImpactReportToDelete({ open: false, impactReportId: null, termId: null });
        } catch (err) {
            handleErrorSnackbar(callSnackbar, err);
            setImpactReportToDelete({ open: false, impactReportId: null, termId: null });
        }
    };

    const showAlertDialog: { backgroundColor: string; iconColor: string; message: string | JSX.Element } | null = useMemo(() => {
        // if there is only a published report then we don't show the alert dialog
        if (impactReport?.isPublished === true || !impactReport) return null;

        const isDraftWithPublishedVersion = impactReport?.hasPublishedVersion;

        return {
            backgroundColor: isDraftWithPublishedVersion ? '#FFF6D9' : '#FCE9E5',
            iconColor: isDraftWithPublishedVersion ? '#F28D00' : '#E8492A',
            message: isDraftWithPublishedVersion ? (
                'There is an older version of this report that is available to the teachers.'
            ) : (
                <>
                    You are currently viewing the draft version. If you want to publish this report, click on <b>Publish</b>.
                </>
            )
        };
    }, [impactReport]);

    const handleSendSchoolLeadersEmailLinkDataForEmail = async (termId: string): Promise<void> => {
        try {
            const {
                data: { generateImpactReportEmailLinkForSchoolLeaders: emailLink }
            } = await generateImpactReportEmailLinkForSchoolLeadersMutation({
                variables: {
                    schoolId,
                    termId
                }
            });

            window.open(emailLink, '_blank');
        } catch (err) {
            handleErrorSnackbar(callSnackbar, err);
        }
    };

    const handlePublishImpactReport = async (termId: string): Promise<void> => {
        try {
            await publishImpactReport({
                variables: { id: impactReport.id },
                refetchQueries: [
                    {
                        query: getSchoolImpactReportsByTerm,
                        variables: { schoolId, termId }
                    }
                ],
                awaitRefetchQueries: true
            });

            callSnackbar('Report published successfully', 'success');
        } catch (err) {
            handleErrorSnackbar(callSnackbar, err);
        }
    };

    if (loading) return <CommonLoading />;

    return (
        <div className="generate-impact-report-container">
            <Formik
                innerRef={formikRef}
                initialValues={{
                    reportType: SchoolImpactReportType.TOPIC_ACTIVITY, // This is only relevant for v1 reports
                    term: terms?.[0]?.key,
                    spmNote: impactReport?.spmNote,
                    spmNextStepsProgram: impactReport?.spmNextStepsProgram
                }}
                onSubmit={async (values: IGenrateImpactReportFormValues): Promise<void> => {
                    try {
                        await updateReport({
                            variables: {
                                input: {
                                    id: impactReport?.id,
                                    spmNote: values.spmNote,
                                    spmNextStepsProgram: values.spmNextStepsProgram
                                }
                            },
                            refetchQueries: [
                                {
                                    query: getSchoolImpactReportsByTerm,
                                    variables: { schoolId, termId: values.term }
                                }
                            ]
                        });

                        callSnackbar('Note updated successfully', 'success');
                    } catch (err) {
                        handleErrorSnackbar(callSnackbar, err);
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, setFieldValue, setValues }) => {
                    const selectedTerm = terms.find((t) => t?.key === values?.term);

                    return (
                        <Grid container mt={2} gap={1.5}>
                            <Grid item container mb={3}>
                                <Paragraph text="Generate this term’s impact report. If a report has already been generated, its graphs, data, photos and quotes will be updated." />
                            </Grid>

                            <Grid item container>
                                <CommonSelectField
                                    label="Term"
                                    name="term"
                                    xs={4}
                                    sm={4}
                                    md={4}
                                    lg={4}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        const termId = e.target.value;

                                        setFieldValue('term', termId);
                                        refetchImpactReportsByTerm({ schoolId, termId });
                                    }}
                                    onBlur={handleBlur}
                                    value={values?.term}
                                    options={terms}
                                    dataTest="impact-report-term-select"
                                />
                            </Grid>

                            {selectedTerm?.mostRecentEndedTerm ||
                            impactReport?.version === ImpactReportVersion.VERSION_2 ||
                            !selectedTermReports?.length ? (
                                <Grid container gap={3}>
                                    <Grid item>
                                        <LWPButton
                                            btnText="Generate report"
                                            onClick={() => handleGenerateImpactReport(values?.term)}
                                            disabled={generateReportLoading || (selectedTerm && !selectedTerm?.mostRecentEndedTerm)}
                                            loading={generateReportLoading}
                                        />
                                    </Grid>
                                    {impactReport?.version === ImpactReportVersion.VERSION_2 && impactReport?.isPublished ? (
                                        <Grid item>
                                            <LWPButton
                                                customClass="delete-impact-report-button"
                                                dataTest="delete-impact-report-button"
                                                btnText="Delete report"
                                                onClick={() =>
                                                    setImpactReportToDelete({
                                                        open: true,
                                                        impactReportId: impactReport?.id,
                                                        termId: values.term
                                                    })
                                                }
                                            />
                                        </Grid>
                                    ) : null}
                                </Grid>
                            ) : null}

                            {isVersion1Only ? (
                                <>
                                    <Grid item container className="report-type">
                                        <Heading3 text={'Select report type'} />

                                        <CommonRadioButton
                                            name="reportType"
                                            value={values.reportType}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                const reportType = e.target.value as SchoolImpactReportType;

                                                setFieldValue('reportType', reportType as SchoolImpactReportType);
                                                const impactReportOfSelectedReportType =
                                                    selectedTermReports?.find((report) => report?.reportType === reportType) ?? null;

                                                setValues({
                                                    ...values,
                                                    reportType,
                                                    spmNote: impactReportOfSelectedReportType?.spmNote ?? ''
                                                });

                                                setImpactReport(impactReportOfSelectedReportType);
                                            }}
                                            options={REPORT_TYPES}
                                        />
                                    </Grid>

                                    <Grid container gap={3}>
                                        <Grid item>
                                            <LWPButton btnText="Generate report" disabled={true} />
                                        </Grid>
                                        {impactReport?.isPublished ? (
                                            <Grid item>
                                                <LWPButton
                                                    customClass="delete-impact-report-button"
                                                    dataTest="delete-impact-report-button"
                                                    btnText="Delete report"
                                                    onClick={() =>
                                                        setImpactReportToDelete({
                                                            open: true,
                                                            impactReportId: impactReport?.id,
                                                            termId: values.term
                                                        })
                                                    }
                                                />
                                            </Grid>
                                        ) : null}
                                    </Grid>
                                </>
                            ) : null}

                            <Collapse in={!!impactReport}>
                                {showAlertDialog ? (
                                    <Alert
                                        sx={{ backgroundColor: showAlertDialog.backgroundColor, width: 'fit-content', lineHeight: '1.5' }}
                                        icon={
                                            <HelpOutlineIcon
                                                sx={{
                                                    color: showAlertDialog.iconColor
                                                }}
                                                fontSize="medium"
                                            />
                                        }>
                                        {showAlertDialog.message}
                                    </Alert>
                                ) : null}

                                <Grid container>
                                    <Heading3 text={'Write a note for school'} />
                                    <Grid item md={12} lg={12}>
                                        <InputField
                                            md={7}
                                            lg={7}
                                            label="SPM note"
                                            value={values.spmNote}
                                            name="spmNote"
                                            rows={6}
                                            multiline
                                            inputComponent={'textarea'}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            disabled={impactReportsByTermLoading}
                                        />
                                    </Grid>

                                    <Grid item container gap={4}>
                                        <LWPButton
                                            btnText="Save"
                                            disabled={impactReportsByTermLoading || generateReportLoading || updateReportLoading}
                                            onClick={handleSubmit}
                                        />
                                        {impactReport ? (
                                            <LWPButton
                                                btnText="Preview"
                                                startIcon="visibility"
                                                variant="contained"
                                                color="inherit"
                                                onClick={() => {
                                                    setIsPreviewModal(true);
                                                }}
                                                disabled={impactReportsByTermLoading || generateReportLoading || updateReportLoading}
                                            />
                                        ) : null}
                                    </Grid>

                                    {impactReport?.isPublished === false ? (
                                        <Grid item container gap={4} marginTop={'20px'}>
                                            <LWPButton
                                                btnText="Publish"
                                                loading={publishImpactReportLoading}
                                                onClick={() => handlePublishImpactReport(values?.term)}
                                            />
                                        </Grid>
                                    ) : null}

                                    {impactReport?.isPublished ? (
                                        <Grid item container gap={4} marginTop={'20px'}>
                                            <LWPButton
                                                btnText="Generate magic link"
                                                onClick={() => {
                                                    /**
                                                     * For version 1 of the report, the report type must be specified to generate the magic link.
                                                     * For version 2, the report type is not required as there is only one combined report.
                                                     */
                                                    const reportType =
                                                        impactReport?.version === ImpactReportVersion.VERSION_1 ? values?.reportType : null;

                                                    generateSchoolImpactReportMagicLinkMutation({
                                                        variables: {
                                                            schoolId,
                                                            termId: values?.term,
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
                                                disabled={generateSchoolImpactReportMagicLinkLoading}
                                                loading={generateSchoolImpactReportMagicLinkLoading}
                                            />
                                        </Grid>
                                    ) : null}
                                </Grid>
                            </Collapse>

                            {haveImpactReports ? (
                                <>
                                    <Divider customClass="mt5" />

                                    <Grid item container>
                                        <Grid item xs={12}>
                                            <Heading3 text={'Generate email link for school leaders'} />
                                        </Grid>

                                        <LWPButton
                                            btnText="Generate email"
                                            onClick={() => handleSendSchoolLeadersEmailLinkDataForEmail(values?.term)}
                                            loading={getSchoolLeadersEmailLinkDataLoading}
                                        />
                                    </Grid>
                                </>
                            ) : null}
                        </Grid>
                    );
                }}
            </Formik>

            {isPreviewModal ? (
                <DialogWrapper
                    contentWidth="880px"
                    open={isPreviewModal}
                    dialogFooter
                    onClose={() => setIsPreviewModal(false)}
                    setOpen={() => setIsPreviewModal(false)}
                    cancelBtnText="Close">
                    {impactReport?.version === ImpactReportVersion.VERSION_1 ? (
                        <ImpactReportV1Preview
                            reportType={formikRef?.current.values?.reportType}
                            schoolId={schoolId}
                            termId={formikRef?.current.values?.term}
                        />
                    ) : (
                        <ImpactReportV2Preview schoolId={schoolId} termId={formikRef?.current.values?.term} />
                    )}
                </DialogWrapper>
            ) : null}

            {schoolImpactReportMagicLink?.url ? (
                <DialogWrapper
                    className="reset_password_modal"
                    open={schoolImpactReportMagicLink?.url ? true : false}
                    setOpen={() => setSchoolImpactReportMagicLink({ expiryTime: null, url: null })}
                    contentWidth="768px"
                    heading="School impact report Link">
                    <Paragraph
                        customClass="title"
                        text={`Use this link to access school impact report. This link will expire in ${moment
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

            {impactReportToDelete?.open && (
                <ConfirmationModal
                    heading="Delete impact report"
                    open={impactReportToDelete?.open}
                    onCancel={() => setImpactReportToDelete({ open: false, impactReportId: null, termId: null })}
                    loading={deleteImpactReportLoading}
                    onConfirm={() => handleDeleteImpactReport(impactReportToDelete?.impactReportId, impactReportToDelete?.termId)}>
                    Are you sure you want to delete this impact report?
                </ConfirmationModal>
            )}
        </div>
    );
};

export default ImpactReport;
