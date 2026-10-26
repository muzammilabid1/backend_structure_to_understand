import { gql, useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getSchoolForSchoolDetailsForAdmin } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { getPluralizedLabel, showDate, ThemeContext } from '../../../shared/Services/handler';
import { updateSchoolClassLicenceDetailsValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import InputField from '../../Shared/InputField/InputField';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

// Queries

const getSchoolForSchoolClassLicenceSection = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            logSchoolClassLicenses {
                id
                operationType
                fullProgrammeClassCount
                readyTeddyClassCount
                totalClassCount
                requestedFullProgrammeClassCount
                requestedReadingOnlyClassCount
                requestedUpgradeClassCount
                requestedReadyTeddyClassCount
                logCreatedAt
                logCreatedBy {
                    firstname
                }
            }
        }
    }
`;

// Mutations

const updateSchoolClassLicenceForSchoolClassLicenceSection = gql`
    mutation updateSchoolClassLicence($input: UpdateSchoolClassLicenceInput!) {
        updateSchoolClassLicence(input: $input)
    }
`;

// Component

const SchoolClassLicenceSection = ({ schoolId, fullProgrammedClassesAllowed, classesAllowed }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { error: error, data: schoolData, loading } = useQuery(getSchoolForSchoolClassLicenceSection, { variables: { id: schoolId } });

    const [updateSchoolClassLicenceMutaion, { loading: updateSchoolClassLicenceLoading }] = useMutation(
        updateSchoolClassLicenceForSchoolClassLicenceSection,
        {
            refetchQueries: [
                { query: getSchoolForSchoolDetailsForAdmin, variables: { id: schoolId } },
                {
                    query: getSchoolForSchoolClassLicenceSection,
                    variables: { id: schoolId }
                }
            ],
            awaitRefetchQueries: true
        }
    );

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const getChangeRequested = (schoolClassLicenceLog) => {
        if (schoolClassLicenceLog?.operationType === 'UPDATED_BY_SCHOOL') {
            const changeRequestedArray = [];

            if (schoolClassLicenceLog?.requestedFullProgrammeClassCount > 0)
                changeRequestedArray.push(
                    `${schoolClassLicenceLog?.requestedFullProgrammeClassCount} additional full programme ${getPluralizedLabel(schoolClassLicenceLog?.requestedFullProgrammeClassCount, 'class', 'es')}`
                );

            if (schoolClassLicenceLog?.requestedReadingOnlyClassCount > 0)
                changeRequestedArray.push(
                    `${schoolClassLicenceLog?.requestedReadingOnlyClassCount} additional reading only ${getPluralizedLabel(schoolClassLicenceLog?.requestedReadingOnlyClassCount, 'class', 'es')}`
                );

            if (schoolClassLicenceLog?.requestedUpgradeClassCount > 0)
                changeRequestedArray.push(`${schoolClassLicenceLog?.requestedUpgradeClassCount} converting reading to full programme`);

            return changeRequestedArray?.join(' and ');
        }

        return '-';
    };

    const head = [
        { accessor: 'col1', width: 100, Header: 'Total full programme licences' },
        { accessor: 'col2', width: 100, Header: 'Total class licences' },
        { accessor: 'col3', width: 200, Header: 'Change requested' },
        { accessor: 'col4', width: 200, Header: 'Log created' }
    ];

    const row = (schoolData?.getSchool?.logSchoolClassLicenses || []).map((schoolClassLicenceLog) => {
        return {
            id: schoolClassLicenceLog?.id,
            col1: schoolClassLicenceLog?.fullProgrammeClassCount,
            col2: schoolClassLicenceLog?.totalClassCount,
            col3: <Paragraph text={getChangeRequested(schoolClassLicenceLog)} isTruncate />,
            col4: schoolClassLicenceLog?.logCreatedAt
                ? `${showDate({ date: schoolClassLicenceLog?.logCreatedAt, time: true })} by ${schoolClassLicenceLog?.logCreatedBy?.firstname}`
                : '-'
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="class-licence-section">
            <Heading2 text={'Class licence section'} />
            <Formik
                initialValues={{
                    fullProgrammedClassesAllowed,
                    classesAllowed
                }}
                enableReinitialize
                validationSchema={updateSchoolClassLicenceDetailsValidation}
                onSubmit={async (values) => {
                    try {
                        const input = {
                            schoolId,
                            fullProgrammedClassesAllowed: +values?.fullProgrammedClassesAllowed,
                            classesAllowed: +values?.classesAllowed
                        };

                        await updateSchoolClassLicenceMutaion({
                            variables: {
                                input
                            }
                        });
                        callSnackbar(`School class licence has been successfully updated.`, 'success');
                    } catch (error) {
                        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(error, 'error');
                        } else {
                            window.newrelic?.noticeError(error, { caught: true, handled: false });
                            callSnackbar(unexpectedError, 'error');
                        }
                    }
                }}>
                {({ values, handleChange, handleBlur, handleSubmit, errors, touched }) => {
                    return (
                        <Form className="mt10">
                            <InputField
                                md={4}
                                lg={4}
                                label="Full programme classes allowed"
                                value={values.fullProgrammedClassesAllowed}
                                name="fullProgrammedClassesAllowed"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                inputProps={{
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*',
                                    'data-test': 'school-class-license-full-programme-classes-allowed-input'
                                }}
                                error={errors.fullProgrammedClassesAllowed}
                                touched={touched.fullProgrammedClassesAllowed}
                            />

                            <InputField
                                md={4}
                                lg={4}
                                label="Total classes allowed"
                                value={values.classesAllowed}
                                name="classesAllowed"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                inputProps={{
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*',
                                    'data-test': 'school-class-license-total-classes-allowed-input'
                                }}
                                error={errors.classesAllowed}
                                touched={touched.classesAllowed}
                            />
                            <br />
                            <LWPButton
                                btnText={'Update school class licence'}
                                onClick={handleSubmit}
                                loading={updateSchoolClassLicenceLoading}
                                disabled={updateSchoolClassLicenceLoading}
                            />
                        </Form>
                    );
                }}
            </Formik>

            <Heading2 text={'Change history of class licence'} />
            <CommonDraggableTable rows={row} columns={head} customClass="row-height" />
        </div>
    );
};

SchoolClassLicenceSection.propTypes = {
    schoolId: PropTypes.number,
    fullProgrammedClassesAllowed: PropTypes.number,
    classesAllowed: PropTypes.number
};

export default SchoolClassLicenceSection;
