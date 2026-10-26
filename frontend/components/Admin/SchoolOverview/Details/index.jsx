import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import {
    changeSchoolPeriod,
    deleteSchool,
    pullWondeSchoolData,
    removeWondeAndUnusedLwpDataFromWonde,
    removeWondeSchoolId
} from '../../../../graphQl/mutations';
import {
    allStaticPeriods,
    getImportedSchoolPupils,
    getSchoolForSchoolDetailsForAdmin,
    getSchoolImportStatus
} from '../../../../graphQl/queries';
import { ThemeContext } from '../../../../shared/Services/handler';
import { socialLoginCheck } from '../../../../shared/validations';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonCheckBox from '../../../Shared/CommonCheckBox';
import CommonInfoWithMessage from '../../../Shared/CommonInfoWithMessage';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonSelectField from '../../../Shared/CommonSelectField';
import CommonTabs from '../../../Shared/CommonTabs';
import Divider from '../../../Shared/Divider';
import InputField from '../../../Shared/InputField/InputField';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import CSVImportColumnMatchingModal from '../../../Shared/Modals/CSVImportColumnMatchingModal';
import LinkClassesToSimsModal from '../../../Shared/Modals/LinkClassesToSimsModal';
import Heading2 from '../../../Shared/Typography/Heading2';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import SchoolClassLicenceSection from './../SchoolClassLicenceSection';
import SchoolDetails from './../SchoolDetails';
import CSVImport from './CSVImport';
import ImportDataButtons from './ImportDataButtons';
import WondeImport from './WondeImport';
import { ImportStatus } from 'lwp-shared';

const checkImportedSchoolData = gql`
    query checkImportedSchoolData($lwpSchoolId: String!) {
        checkImportedSchoolData(lwpSchoolId: $lwpSchoolId) {
            parentChanges {
                pupilId
                pupilName
                importedNames
                importedEmails
                importedPhones
                lwpNames
                lwpEmails
                lwpPhones
            }
            missedMatches
        }
    }
`;

// Mutations

const updateSocialLoginPermissions = gql`
    mutation updateSocialLoginPermissions($input: UpdateSocialLoginPermissionsInput!) {
        updateSocialLoginPermissions(input: $input)
    }
`;

const importSchoolData = gql`
    mutation importSchoolData($lwpSchoolId: String!, $file: Upload!) {
        importSchoolData(lwpSchoolId: $lwpSchoolId, file: $file)
    }
`;

const promoteProposedSchool = gql`
    mutation promoteProposedSchool($lwpSchoolId: String!) {
        promoteProposedSchool(lwpSchoolId: $lwpSchoolId)
    }
`;

const reimportCachedData = gql`
    mutation reimportCachedData($lwpSchoolId: String!, $wondeSchoolId: String!) {
        reimportCachedData(lwpSchoolId: $lwpSchoolId, wondeSchoolId: $wondeSchoolId)
    }
`;

const Details = ({ schoolId, setSchoolName, setIsSchoolMIS, setSchoolHolidayPeriod }) => {
    const router = useRouter();

    const { callSnackbar } = useContext(ThemeContext);
    const [linkClassesModal, setlinkClassesModal] = useState(false);
    const [schoolPeriod, setSchoolPeriod] = useState({});
    const [open, setOpen] = useState(false);
    const [openDeleteSchoolModal, setOpenDeleteSchoolModal] = useState(false);
    const [removeWondeDataConfirmation, setRemoveWondeDataConfirmation] = useState(false);
    const [removeWondeIdConfirmation, setRemoveWondeIdConfirmation] = useState(false);
    const [importStatus, setImportStatus] = useState(null);
    const [csvColumns, setCsvColumns] = useState([]);
    const [csvFile, setCsvFile] = useState(null);
    const [csvColumnMap, setCsvColumnMap] = useState(null);
    const [active, setActive] = useState(0);

    const [getSchoolForSchoolDetailsQuery, { loading: schoolLoading, error, data: schoolData }] =
        useLazyQuery(getSchoolForSchoolDetailsForAdmin);

    const [importedSchoolPupilsQuery, { error: importedSchoolPupilsError, data: importedSchoolPupilsData }] =
        useLazyQuery(getImportedSchoolPupils);

    const [getSchoolImportStatusQuery, { error: wondeStatusUpdateError, data: wondeStatusUpdate }] = useLazyQuery(getSchoolImportStatus, {
        fetchPolicy: 'network-only'
    });

    const [checkImportedSchoolDataQuery, { loading: checkImportedSchoolDataLoading, data: checkedImportedSchoolData }] = useLazyQuery(
        checkImportedSchoolData,
        {
            fetchPolicy: 'network-only'
        }
    );

    const { error: allStaticPeriodsError, data: allStaticPeriodsData } = useQuery(allStaticPeriods);

    const [deleteSchoolMutation, { loading: deleteSchoolLoading }] = useMutation(deleteSchool);
    const [importSchoolDataMutation, { loading: importSchoolDataLoading }] = useMutation(importSchoolData, {
        refetchQueries: [getSchoolForSchoolDetailsForAdmin]
    });
    const [promoteProposedSchoolMutation, { loading: promoteProposedSchoolLoading }] = useMutation(promoteProposedSchool, {
        refetchQueries: [getSchoolForSchoolDetailsForAdmin]
    });

    useEffect(() => {
        getSchoolForSchoolDetailsQuery({ variables: { id: schoolId } });
        importedSchoolPupilsQuery({ variables: { id: schoolId } });
    }, [schoolId]);

    useEffect(() => {
        if (schoolData) {
            setSchoolPeriod(schoolData?.getSchool?.curentPeriod?.index);
            setSchoolName(schoolData?.getSchool?.schoolName);
            setSchoolHolidayPeriod(schoolData?.getSchool?.curentPeriod?.index);
            setActive(schoolData?.['getSchool']?.misName == 'CSV' ? 1 : 0);
        }

        if (schoolData?.getSchool?.importedSchool?.id) {
            setIsSchoolMIS(true);
        }
    }, [schoolData]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        importedSchoolPupilsError?.message && callSnackbar(importedSchoolPupilsError, 'error');
    }, [importedSchoolPupilsError]);

    useEffect(() => {
        wondeStatusUpdateError?.message && callSnackbar(wondeStatusUpdateError, 'error');
    }, [wondeStatusUpdateError]);

    useEffect(() => {
        setImportStatus(wondeStatusUpdate?.getSchool?.importStatus);

        if (wondeStatusUpdate?.getSchool?.importStatus !== ImportStatus.IMPORTING_DATA) {
            getSchoolForSchoolDetailsQuery({ variables: { id: schoolId } });
            importedSchoolPupilsQuery({ variables: { id: schoolId } });
        }
    }, [wondeStatusUpdate]);

    useEffect(() => {
        allStaticPeriodsError?.message && callSnackbar(allStaticPeriodsError, 'error');
    }, [allStaticPeriodsError]);

    const [deleteWondeDataMutation, { loading: deleteWondeDataLoading }] = useMutation(removeWondeAndUnusedLwpDataFromWonde, {
        refetchQueries: [{ query: getSchoolForSchoolDetailsForAdmin, variables: { id: schoolId } }],
        awaitRefetchQueries: true
    });

    const [removeWondeSchoolIdMutation, { loading: removeWondeSchoolIdLoading }] = useMutation(removeWondeSchoolId, {
        refetchQueries: [{ query: getSchoolForSchoolDetailsForAdmin, variables: { id: schoolId } }],
        awaitRefetchQueries: true
    });

    const [pullWondeSchoolDataMutation, { loading: pullWondeSchoolDataLoading, called }] = useMutation(pullWondeSchoolData, {
        refetchQueries: [{ query: getImportedSchoolPupils, variables: { id: schoolId } }],
        awaitRefetchQueries: true
    });

    const [reimportCachedDataMutation, { loading: reimportCachedDataLoading }] = useMutation(reimportCachedData, {
        refetchQueries: [{ query: getImportedSchoolPupils, variables: { id: schoolId } }],
        awaitRefetchQueries: true
    });

    const [updateSocialLoginMutaion, { loading: updateSocialLoginLoading }] = useMutation(updateSocialLoginPermissions, {
        refetchQueries: [{ query: getSchoolForSchoolDetailsForAdmin, variables: { id: schoolId } }],
        awaitRefetchQueries: true
    });

    const refetchSchoolStatus =
        (error = false) =>
        (errorObj = {}) => {
            getSchoolImportStatusQuery({ variables: { id: schoolId } });
            if (error && errorObj) callSnackbar(Object.values(errorObj), 'error');
        };

    useEffect(() => {
        let interval;

        if (
            (called && wondeStatusUpdate?.getSchool?.importStatus === ImportStatus.IMPORTING_DATA) ||
            wondeStatusUpdate?.getSchool?.importStatus === ImportStatus.IMPORTING_DATA ||
            schoolData?.getSchool?.importStatus === ImportStatus.IMPORTING_DATA
        ) {
            interval = setInterval(() => {
                getSchoolImportStatusQuery({ variables: { id: schoolId } });
            }, 5000);
        } else if (wondeStatusUpdate?.getSchool?.importStatus !== ImportStatus.IMPORTING_DATA) {
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [wondeStatusUpdate, called, schoolData]);

    const [changeSchoolPeriodMutation, { loading: schoolPeriodLoading }] = useMutation(changeSchoolPeriod, {
        refetchQueries: [{ query: getSchoolForSchoolDetailsForAdmin, variables: { id: schoolId } }],
        awaitRefetchQueries: true
    });

    const getImportStatus = (importStatus, lastImportedAt) => {
        if (!importStatus) return '';
        switch (importStatus) {
            case ImportStatus.IMPORTING_DATA:
                return `Import in progress`;
            case ImportStatus.DATA_IMPORTED:
                return `Data imported${lastImportedAt}`;
            case ImportStatus.LINKING_PUPILS:
                return `Linking pupils`;
            case ImportStatus.LINKING_CLASSES:
                return `Linking classes`;
            case ImportStatus.DIFFING_ENTITIES:
                return `Processing changes`;
            case ImportStatus.COMPLETE:
                return `Import complete${lastImportedAt}`;
            case ImportStatus.FAILED:
                return `Import failed${lastImportedAt}`;
            case ImportStatus.PERMISSION_NEED_UPDATING:
                return `Permission update required${lastImportedAt}`;
            case ImportStatus.WRONG_ACADEMIC_YEAR:
                return `Wrong academic year data detected${lastImportedAt}`;
            default:
                return `Unknown status ${lastImportedAt}`;
        }
    };

    const doPromoteProposedSchool = () => {
        promoteProposedSchoolMutation({
            variables: {
                lwpSchoolId: schoolId
            }
        })
            .then(() => callSnackbar('Promoted proposed school!', 'success'))
            .catch(() => callSnackbar('Failed to promote - is there a proposed school?', 'error'));
    };

    /**
     * getTenantIssuer gets the issuer of a Microsoft tenant
     * based on their domain name.
     *
     * @param {string} domain the domain name
     * @return {Promise<string | false>} the issuer, or false if none could be identified
     */
    const getTenantIssuer = async (domain) => {
        return fetch(`https://login.microsoftonline.com/${domain}/v2.0/.well-known/openid-configuration`)
            .then((resp) => resp.json().then((json) => json.issuer ?? false))
            .catch(() => false);
    };

    if (schoolLoading) return <CommonLoading />;

    const misName = schoolData?.['getSchool']?.misName;
    const isCSVAndActive = misName === 'CSV' && active === 1;
    const isWondeAndActive = misName && misName !== 'CSV' && active === 0;
    const disPlayMisName = misName === 'CSV' ? misName : 'Wonde';

    const wondeSchoolId =
        schoolData?.['getSchool']?.misName !== null && schoolData?.['getSchool']?.importedSchool?.id
            ? schoolData?.['getSchool']?.importedSchool?.id
            : schoolData?.['getSchool']?.importedSchoolId;

    return (
        <div className="details">
            {schoolData?.getSchool ? (
                <SchoolDetails
                    schoolId={schoolId}
                    inactive={schoolData?.getSchool?.inactive}
                    isTestSchool={schoolData?.getSchool?.isTestSchool}
                    urn={schoolData?.getSchool?.urn}
                    skipAutoWondeImport={schoolData?.getSchool?.skipAutoWondeImport}
                    schoolName={schoolData?.getSchool?.schoolName}
                    commentsAndPhotos={schoolData?.getSchool?.commentsAndPhotos}
                    lastImportedAt={schoolData?.getSchool?.lastImportedAt}
                    misName={schoolData?.getSchool?.misName}
                    isWondeDataSyncedWithLwp={schoolData?.getSchool?.isWondeDataSyncedWithLwp}
                    wondeSchoolName={schoolData?.getSchool?.importedSchool?.name}
                    wondeSchoolRrn={schoolData?.getSchool?.importedSchool?.urn}
                    enableAddClasses={schoolData?.getSchool?.enableAddClasses}
                    logo={schoolData?.getSchool?.logo}
                    organisations={schoolData?.getSchool?.organisations}
                    showTermsAndConditions={!!schoolData?.getSchool?.termsAndConditions}
                    showPrivacyPolicy={!!schoolData?.getSchool?.privacyPolicy}
                    tags={schoolData?.getSchool?.tags?.map((tags) => ({ key: tags?.id, value: tags?.name, color: tags?.color })) ?? []}
                    termsAndConditions={schoolData?.getSchool?.termsAndConditions ?? ''}
                    privacyPolicy={schoolData?.getSchool?.privacyPolicy ?? ''}
                    termsEditAsHtml={false}
                    policyEditAsHtml={false}
                    isMoneySkillsAvailable={schoolData?.getSchool?.isMoneySkillsAvailable}
                    isReadyTeddyAvailable={schoolData?.getSchool?.isReadyTeddyAvailable}
                    ignoreAcademicYearCheckDuringImport={schoolData?.getSchool?.ignoreAcademicYearCheckDuringImport}
                />
            ) : null}

            <Divider customClass="mtb-20" />
            <SchoolClassLicenceSection
                schoolId={schoolId}
                fullProgrammedClassesAllowed={schoolData?.getSchool?.numOfFullProgrammeClassesAllowed}
                classesAllowed={schoolData?.getSchool?.numOfTotalClassesAllowed}
            />
            <Divider customClass="mtb-20" />
            <div className="remove_imported_data">
                <Heading2 text={'Delete School'} />
                <LWPButton customClass="mb-10" btnText={'Delete School'} onClick={() => setOpenDeleteSchoolModal(!openDeleteSchoolModal)} />
            </div>

            <Divider customClass="mtb-20" />

            <Heading2 text={'Set School Period'} />

            <CommonSelectField
                xs={12}
                sm={12}
                md={4}
                lg={4}
                // displayEmpty
                shrink
                value={schoolPeriod}
                label="School Period"
                options={(allStaticPeriodsData?.['allStaticPeriods'] || []).map((period) => ({
                    key: period?.index,
                    value: period?.index
                }))}
                onChange={(e) => setSchoolPeriod(e.target.value)}
            />

            <LWPButton
                btnText={'Save school period'}
                onClick={() => setOpen(!open)}
                // loading={pullWondeSchoolDataLoading}
            />

            <Divider customClass="mtb-20" />

            {/* Wonde Section Starts */}

            <Heading2 text={'Connect existing database'} />

            <CommonTabs tebs={['Wonde import', 'CSV import']} value={active} onChange={setActive}>
                {active === 0 ? (
                    <WondeImport
                        misName={misName}
                        wondeSchoolId={wondeSchoolId}
                        setImportStatus={setImportStatus}
                        pullWondeSchoolDataMutation={pullWondeSchoolDataMutation}
                        schoolId={schoolId}
                        refetchSchoolStatus={refetchSchoolStatus}
                        getImportStatus={getImportStatus}
                        importStatus={importStatus}
                        schoolData={schoolData}
                        pullWondeSchoolDataLoading={pullWondeSchoolDataLoading}
                        setRemoveWondeIdConfirmation={setRemoveWondeIdConfirmation}
                    />
                ) : (
                    <CSVImport
                        setCsvFile={setCsvFile}
                        setCsvColumns={setCsvColumns}
                        setCsvColumnMap={setCsvColumnMap}
                        isCSVAndActive={isCSVAndActive}
                        wondeSchoolId={wondeSchoolId}
                        misName={misName}
                        schoolData={schoolData}
                        importSchoolDataLoading={importSchoolDataLoading}
                        getImportStatus={getImportStatus}
                        importStatus={importStatus}
                    />
                )}
            </CommonTabs>

            {(isCSVAndActive || isWondeAndActive) && (
                <ImportDataButtons
                    schoolData={schoolData}
                    misName={misName}
                    pullWondeSchoolDataLoading={pullWondeSchoolDataLoading}
                    disPlayMisName={disPlayMisName}
                    setlinkClassesModal={setlinkClassesModal}
                    linkClassesModal={linkClassesModal}
                    reimportCachedDataMutation={reimportCachedDataMutation}
                    schoolId={schoolId}
                    wondeSchoolId={wondeSchoolId}
                    refetchSchoolStatus={refetchSchoolStatus}
                    reimportCachedDataLoading={reimportCachedDataLoading}
                    checkImportedSchoolDataQuery={checkImportedSchoolDataQuery}
                    checkImportedSchoolDataLoading={checkImportedSchoolDataLoading}
                    checkedImportedSchoolData={checkedImportedSchoolData}
                    isCSVAndActive={isCSVAndActive}
                    doPromoteProposedSchool={doPromoteProposedSchool}
                    setRemoveWondeDataConfirmation={setRemoveWondeDataConfirmation}
                    promoteProposedSchoolLoading={promoteProposedSchoolLoading}
                />
            )}

            {/* Wonde Section Ends */}

            <Formik
                initialValues={{
                    emailAndPassword: schoolData?.getSchool?.socialLoginPermissions?.email ?? true,
                    microsoft: schoolData?.getSchool?.socialLoginPermissions?.microsoft ?? false,
                    google: schoolData?.getSchool?.socialLoginPermissions?.google ?? false,
                    tenantDomain: schoolData?.getSchool?.tenantDomain ?? '',
                    msTenantIssuer: schoolData?.getSchool?.msTenantIssuer ?? ''
                }}
                enableReinitialize
                validationSchema={socialLoginCheck}
                onSubmit={(values) => {
                    updateSocialLoginMutaion({
                        variables: {
                            input: {
                                id: schoolId,
                                email: values.emailAndPassword,
                                microsoft: values.microsoft,
                                google: values.google,
                                tenantDomain: values.tenantDomain,
                                msTenantIssuer: values.msTenantIssuer
                            }
                        }
                    })
                        .then(() => {
                            callSnackbar(`Social Login updated.`, 'success');
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                        });
                }}>
                {({ values, handleChange, handleBlur, handleSubmit, setFieldValue, errors, touched }) => (
                    <div className="social_login">
                        <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                            <Heading2 text={'Allow login using'} />
                            <CommonCheckBox
                                label="Email and password"
                                name="emailAndPassword"
                                checked={values.emailAndPassword}
                                error={errors.emailAndPassword}
                                touched={touched.emailAndPassword}
                                onChange={handleChange}
                            />
                            <CommonCheckBox
                                label="Google"
                                name="google"
                                checked={values.google}
                                error={errors.google}
                                touched={touched.google}
                                onChange={handleChange}
                            />
                            <CommonCheckBox
                                label="Microsoft"
                                name="microsoft"
                                checked={values.microsoft}
                                error={errors.microsoft}
                                touched={touched.microsoft}
                                onChange={handleChange}
                            />

                            <Heading3 text={'Restrict attaching accounts to specific tenant'} />

                            <InputField
                                label="Tenant domain"
                                md={10}
                                lg={10}
                                name="tenantDomain"
                                value={values.tenantDomain}
                                onChange={handleChange}
                                onBlur={(e) => {
                                    getTenantIssuer(e.target.value).then((issuer) => {
                                        console.log(issuer);
                                        if (issuer) {
                                            setFieldValue('msTenantIssuer', issuer);
                                        } else {
                                            setFieldValue('msTenantIssuer', null);
                                            if (values.microsoft) {
                                                window.alert(
                                                    "That doesn't look like a valid Microsoft tenant; please check and try again."
                                                );

                                                e.preventDefault();

                                                return false;
                                            }
                                        }
                                    });

                                    handleBlur(e);
                                }}
                                error={errors.tenantDomain}
                                touched={touched.tenantDomain}
                            />

                            <InputField
                                label="Microsoft tenant issuer endpoint"
                                md={10}
                                lg={10}
                                disabled
                                name="msTenantIssuer"
                                value={values.msTenantIssuer}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.msTenantIssuer}
                                touched={touched.msTenantIssuer}
                            />

                            <CommonInfoWithMessage
                                text={
                                    'If a tenant restriction is in place, teachers will only be allowed to link accounts within this tenant.'
                                }
                            />

                            {errors && <p style={{ fontSize: '12px', color: 'red' }}>{errors?.socialLoginCheck}</p>}
                            <LWPButton btnText={'Save changes'} onClick={handleSubmit} loading={updateSocialLoginLoading} />
                        </Form>
                    </div>
                )}
            </Formik>

            {open && (
                <ConfirmationModal
                    open={open}
                    onCancel={() => setOpen(!open)}
                    loading={schoolPeriodLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        changeSchoolPeriodMutation({ variables: { index: schoolPeriod, schoolId } })
                            .then(() => {
                                callSnackbar('School Period Updated!', 'success');
                                setOpen(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpen(false);
                            });
                    }}>
                    <Paragraph text="This will reset the statistics on the School Overview page." />
                </ConfirmationModal>
            )}
            {removeWondeDataConfirmation && (
                <ConfirmationModal
                    open={removeWondeDataConfirmation}
                    onCancel={() => setRemoveWondeDataConfirmation(!removeWondeDataConfirmation)}
                    loading={deleteWondeDataLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteWondeDataMutation({ variables: { lwpSchoolId: schoolId } })
                            .then(() => {
                                callSnackbar('Wonde data has been removed', 'success');
                                getSchoolImportStatusQuery({ variables: { id: schoolId } });
                                setRemoveWondeDataConfirmation(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                getSchoolImportStatusQuery({ variables: { id: schoolId } });
                                setRemoveWondeDataConfirmation(false);
                            });
                    }}>
                    <Paragraph text="This will remove wonde data and unused lwp data related to this school." />
                </ConfirmationModal>
            )}
            {removeWondeIdConfirmation && (
                <ConfirmationModal
                    open={removeWondeIdConfirmation}
                    onCancel={() => setRemoveWondeIdConfirmation(false)}
                    loading={removeWondeSchoolIdLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        removeWondeSchoolIdMutation({ variables: { lwpSchoolId: schoolId } })
                            .then(() => {
                                callSnackbar('Wonde ID has been removed', 'success');
                                getSchoolImportStatusQuery({ variables: { id: schoolId } });
                                setRemoveWondeIdConfirmation(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setRemoveWondeIdConfirmation(false);
                            });
                    }}>
                    <Paragraph text="This will remove the Wonde ID, along with any wonde data and unused lwp data related to this school." />
                </ConfirmationModal>
            )}
            {openDeleteSchoolModal && (
                <ConfirmationModal
                    open={openDeleteSchoolModal}
                    onCancel={() => setOpenDeleteSchoolModal(!openDeleteSchoolModal)}
                    loading={deleteSchoolLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteSchoolMutation({
                            variables: {
                                id: schoolId
                            }
                        })
                            .then(() => {
                                callSnackbar('School deleted!', 'success');
                                setOpenDeleteSchoolModal(!openDeleteSchoolModal);
                                router?.push('/admin/schools/active');
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDeleteSchoolModal(!openDeleteSchoolModal);
                            });
                    }}>
                    <Paragraph text="This will permanently delete the school." />
                </ConfirmationModal>
            )}

            {csvColumnMap === false && (
                <CSVImportColumnMatchingModal
                    csvColumns={csvColumns}
                    close={() => setCsvColumnMap(null)}
                    onComplete={async (columnMap) => {
                        /** @type {string[]} */
                        const csvSplitOnLine = (await csvFile.text()).split('\n');

                        let headerLine = csvSplitOnLine.shift();

                        for (const colPair of Object.entries(columnMap).filter((e) => e[1] /* has some truthy value! */)) {
                            headerLine = headerLine.replace(
                                new RegExp(`"${colPair[0]}"|(?<=,)${colPair[0]}(?=,|$)|^${colPair[0]}(?=,|$)`),
                                `"${colPair[1]}"`
                            );
                        }

                        const file = new Blob([headerLine, '\n', csvSplitOnLine.join('\n')], {
                            type: 'text/csv'
                        });

                        await importSchoolDataMutation({
                            variables: {
                                file,
                                lwpSchoolId: schoolId
                            }
                        })
                            .then((imported) => {
                                setCsvColumnMap(null);

                                if (imported.data.importSchoolData?.length) {
                                    callSnackbar(
                                        `Imported school data with errors - please check and run next steps manually:\n\n${imported.data.importSchoolData.join('\n')}`,
                                        'error'
                                    );
                                } else {
                                    callSnackbar('Imported data successfully!', 'success');

                                    checkImportedSchoolDataQuery({
                                        variables: {
                                            lwpSchoolId: schoolId
                                        }
                                    }).then((result) => {
                                        if (
                                            result.data.checkImportedSchoolData &&
                                            !result.data.checkImportedSchoolData?.parentChanges?.length &&
                                            !result.data.checkImportedSchoolData?.missedMatches?.length
                                        ) {
                                            doPromoteProposedSchool();
                                        } else {
                                            callSnackbar('Potential mismatches found in data! See tables below for more info.', 'warning');
                                        }
                                    });
                                }
                            })
                            .catch((error) => {
                                setCsvColumnMap(null);
                                callSnackbar(error, 'error');
                            });
                    }}
                />
            )}

            {linkClassesModal && (
                <LinkClassesToSimsModal
                    subHeading={schoolData?.['getSchool']?.schoolName}
                    toggle={() => setlinkClassesModal(!linkClassesModal)}
                    lwpClasses={schoolData?.['getSchool']?.classes}
                    wondeClasses={schoolData?.['getSchool']?.importedSchool?.classes}
                    schoolMisIntegrationVariable={schoolData?.['getSchool']?.misName}
                    schoolId={schoolId}
                />
            )}
        </div>
    );
};

Details.propTypes = {
    schoolId: PropTypes.string,
    setSchoolName: PropTypes.func,
    setIsSchoolMIS: PropTypes.func,
    setSchoolHolidayPeriod: PropTypes.func
};

export default Details;
