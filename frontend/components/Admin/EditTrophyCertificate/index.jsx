import { useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Form, Formik } from 'formik';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';

import { updateStaticTrophy } from '../../../graphQl/mutations';
import { generateTestCertificate, getStaticTrophy, getSubjectsForTrophyCertificate } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { _getBase64ToFile, handleErrorSnackbar, isCertificateValid, ThemeContext } from '../../../shared/Services/handler';
import { addTrophyCertificateFromAdminValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonFieldArrayForTrophyCertificate from './../../Shared/CommonFieldArrayForTrophyCertificate';
import CommonFileUpload from './../../Shared/CommonFileUpload';
import CommonLoading from './../../Shared/CommonLoading';
import Divider from './../../Shared/Divider';
import DateField from './../../Shared/InputField/DateField';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';

const EditTrophyCertificate = () => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [certificateFileName, setCertificateFileName] = useState(null);

    const { data: allSubjects, loading: allSubjectsLoading, error: allSubjectsError } = useQuery(getSubjectsForTrophyCertificate);

    const {
        loading,
        data: trophy,
        error: trophyError
    } = useQuery(getStaticTrophy, {
        variables: { id: queryParams?.trophy_id }
    });

    const {
        loading: testCertificateLoading,
        data,
        error: testCertificateError
    } = useQuery(generateTestCertificate, {
        variables: { id: queryParams?.trophy_id }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, allSubjectsError);
        handleErrorSnackbar(callSnackbar, trophyError);
        handleErrorSnackbar(callSnackbar, testCertificateError);
    }, [allSubjectsError, trophyError, testCertificateError]);

    const [updateStaticTrophyMutation, { loading: updateStaticTrophyLoading }] = useMutation(updateStaticTrophy, {
        refetchQueries: [{ query: generateTestCertificate, variables: { id: queryParams?.trophy_id } }],
        awaitRefetchQueries: true
    });

    const allSubjectsOptions = (allSubjects?.getSubjectsForAdmin || []).map((subject) => ({
        key: subject?.id,
        value: subject?.name
    }));

    const options = [{ key: '0', value: 'All' }, ...allSubjectsOptions];

    const handleSubjectsChange = (newValue, prevValue, handleChange) => {
        let selectedSubjects = [...newValue];

        const allOption = options[0];
        const hasAllInNew = selectedSubjects.some((option) => option.key === '0');
        const hasAllInPrevious = prevValue.some((option) => option.key === '0');

        if (hasAllInNew && !hasAllInPrevious) {
            selectedSubjects = [allOption];
        } else if (hasAllInPrevious && selectedSubjects.length > 1) {
            selectedSubjects = selectedSubjects.filter((option) => option.key !== '0');
        } else if (!hasAllInNew && selectedSubjects.length === allSubjectsOptions.length) {
            selectedSubjects = [allOption];
        }

        handleChange({
            target: { name: 'subjects', value: selectedSubjects }
        });
    };

    if (loading || allSubjectsLoading) return <CommonLoading />;

    const getInitialValues = () => {
        const trophyDetails = trophy?.getStaticTrophy;

        const subjects =
            trophyDetails?.subjects?.length === allSubjectsOptions.length
                ? [options[0]]
                : (trophyDetails?.subjects || []).map((subject) => ({
                      key: subject?.id,
                      value: subject?.name
                  }));

        const mathscotValues = trophyDetails?.certificate ? JSON.parse(trophyDetails?.certificate)?.mathscot : null;

        const certificateData = trophyDetails?.certificate ? JSON.parse(trophyDetails?.certificate) : null;

        return {
            title: trophyDetails?.title,
            order: trophyDetails?.order,
            startDate: new Date(trophyDetails?.startDate),
            endDate: new Date(trophyDetails?.endDate),
            isActive: trophyDetails?.isActive,
            isPupilMail: trophyDetails?.isPupilMail,
            isTeacherMail: trophyDetails?.isTeacherMail,
            logo: trophyDetails?.logo,
            subjects: subjects,
            logoId: null,
            hasMathscot: !mathscotValues?.scale && !mathscotValues?.xValue && !mathscotValues?.yValue ? false : true,
            mathscotScale: mathscotValues?.scale ?? null,
            mathscotXValue: mathscotValues?.xValue ?? null,
            mathsoctYValue: mathscotValues?.yValue ?? null,
            certificatePdf: trophyDetails?.certificatePdf,
            certificatePdfId: null,
            addFieldDataType: sharedJson?.trophy_certificate_fieldData_types?.[0]?.key,
            fieldData: certificateData?.fieldData ?? []
        };
    };

    return (
        <div className="add-trophy-certificate-container">
            <Formik
                initialValues={getInitialValues()}
                validationSchema={addTrophyCertificateFromAdminValidation}
                onSubmit={async (values) => {
                    try {
                        const {
                            logo,
                            certificatePdf,
                            hasMathscot,
                            mathscotScale,
                            mathscotXValue,
                            // eslint-disable-next-line no-unused-vars
                            addFieldDataType,
                            mathsoctYValue,
                            fieldData,
                            subjects,
                            order,
                            ...rest
                        } = values;

                        const updatedFieldData = fieldData.map((item) => {
                            return {
                                ...item,
                                xValue: +item?.xValue,
                                yValue: +item?.yValue,
                                fontSize: +item?.fontSize
                            };
                        });

                        let files = [];

                        const logoFile =
                            logo && logo?.includes(',') && filename && _getBase64ToFile(logo, `${filename}-${values?.logoId}`, true);

                        const certificatePdfFile =
                            certificatePdf &&
                            certificatePdf?.includes(',') &&
                            certificateFileName &&
                            _getBase64ToFile(certificatePdf, `${certificateFileName}-${values?.certificatePdfId}`, true);

                        if (logoFile) files.push(logoFile);
                        if (certificatePdfFile) files.push(certificatePdfFile);

                        if (isCertificateValid(values) && logo && certificatePdf) {
                            const certificate = {
                                fieldData: updatedFieldData
                            };

                            if (hasMathscot) {
                                certificate['mathscot'] = {
                                    scale: +mathscotScale,
                                    xValue: +mathscotXValue,
                                    yValue: +mathsoctYValue
                                };
                            }

                            const subjectIds = subjects.some((option) => option.key === '0')
                                ? allSubjectsOptions.map((sub) => sub.key)
                                : subjects.map((option) => option.key);

                            await updateStaticTrophyMutation({
                                variables: {
                                    file: files,
                                    input: {
                                        id: queryParams?.trophy_id,
                                        certificate: JSON.stringify(certificate),
                                        order: +order,
                                        subjects: subjectIds,
                                        ...rest
                                    }
                                }
                            });
                            callSnackbar('Trophy Certificate Updated!', 'success');
                        }
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
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    return (
                        <Form className="mt10 add-trophy-certificate-form">
                            <Heading2 text="Edit Trophy Certificate" />
                            <InputField
                                md={6}
                                lg={6}
                                label="Title"
                                value={values.title}
                                name="title"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.title}
                                touched={touched.title}
                            />

                            <InputField
                                md={6}
                                lg={6}
                                label="Order"
                                value={values.order}
                                name="order"
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.order}
                                touched={touched.order}
                            />

                            <DateField
                                name="startDate"
                                label="Start date"
                                md={6}
                                lg={6}
                                value={values.startDate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.startDate}
                                touched={touched.startDate}
                            />
                            <br />
                            <DateField
                                name="endDate"
                                label="End date"
                                value={values.endDate}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.endDate}
                                touched={touched.endDate}
                                minDate={values.startDate}
                                md={6}
                                lg={6}
                            />
                            <br />

                            <CommonMultiSelect
                                value={values.subjects}
                                options={options}
                                label="Subjects"
                                name="subjects"
                                error={errors.subjects}
                                touched={touched.subjects}
                                md={6}
                                lg={6}
                                onChange={(newValue) => handleSubjectsChange(newValue, values.subjects, handleChange)}
                                onBlur={(value) =>
                                    handleBlur({
                                        target: { name: 'subjects', value: value }
                                    })
                                }
                            />

                            <CommonCheckBox
                                name="isActive"
                                checked={values.isActive}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Trophy Is Active"
                                error={errors.isActive}
                                touched={touched.isActive}
                            />

                            <CommonCheckBox
                                name="isPupilMail"
                                checked={values.isPupilMail}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Pupil Mail Allowed"
                                error={errors.isPupilMail}
                                touched={touched.isPupilMail}
                            />

                            <CommonCheckBox
                                name="isTeacherMail"
                                checked={values.isTeacherMail}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Teacher Mail Allowed"
                                error={errors.isTeacherMail}
                                touched={touched.isTeacherMail}
                            />

                            <Divider />

                            <CommonCheckBox
                                name="hasMathscot"
                                checked={values.hasMathscot}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Certificate has mathscot?"
                                error={errors.hasMathscot}
                                touched={touched.hasMathscot}
                            />

                            {values.hasMathscot && (
                                <div className="trophy-certificate-mathscot-data">
                                    <InputField
                                        md={6}
                                        lg={6}
                                        label="X Value"
                                        value={values.mathscotXValue}
                                        name="mathscotXValue"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                        error={values.hasMathscot && !values.mathscotXValue && 'This field is required.'}
                                        touched={true}
                                    />

                                    <InputField
                                        md={6}
                                        lg={6}
                                        label="Y Value"
                                        value={values.mathsoctYValue}
                                        name="mathsoctYValue"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                        error={values.hasMathscot && !values.mathsoctYValue && 'This field is required.'}
                                        touched={true}
                                    />

                                    <InputField
                                        md={6}
                                        lg={6}
                                        label="Scale"
                                        value={values.mathscotScale}
                                        name="mathscotScale"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                        error={values.hasMathscot && !values.mathscotScale && 'This field is required.'}
                                        touched={true}
                                    />
                                </div>
                            )}

                            <CommonFieldArrayForTrophyCertificate handleChange={handleChange} handleBlur={handleBlur} values={values} />

                            <Divider />

                            <Grid container className="thumbnail_image_container">
                                <Grid item xs={12} md={6} lg={6}>
                                    <CommonFileUpload
                                        name="'logo'"
                                        previewImage={values.logo}
                                        icon="folder"
                                        heading="Badge"
                                        touched={true}
                                        error={!values.logo && 'Logo is required.'}
                                        onSetFileName={(fileName) => setFileName(fileName)}
                                        onSetFileID={(id) => handleChange({ target: { name: 'logoId', value: id } })}
                                        onClose={() => handleChange({ target: { name: 'logo', value: '' } })}
                                        accept={'image/png, image/jpeg, image/jpg'}
                                        onSave={(croppedImage) => {
                                            handleChange({ target: { name: 'logo', value: croppedImage } });
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Grid container className="thumbnail_image_container">
                                <Grid item xs={12} md={6} lg={6}>
                                    <CommonFileUpload
                                        name="'certificatePdf'"
                                        previewImage={values.certificatePdf}
                                        icon="folder"
                                        heading="Certificate PDF"
                                        touched={true}
                                        error={!values.certificatePdf && 'Certificate is required.'}
                                        onSetFileName={(fileName) => setCertificateFileName(fileName)}
                                        onSetFileID={(id) => handleChange({ target: { name: 'certificatePdfId', value: id } })}
                                        onClose={() => handleChange({ target: { name: 'certificatePdf', value: '' } })}
                                        accept="application/pdf"
                                        onSave={(croppedImage) => {
                                            handleChange({ target: { name: 'certificatePdf', value: croppedImage } });
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <Divider />

                            <LWPButton
                                customClass="add-trophy-button"
                                btnText="Edit Trophy Certificate"
                                loading={updateStaticTrophyLoading}
                                onClick={handleSubmit}
                            />

                            {testCertificateLoading ? (
                                <CommonLoading />
                            ) : data?.generateTestCertificate ? (
                                <>
                                    <Divider />

                                    <LWPButton
                                        customClass="add-trophy-button"
                                        btnText="Test Trophy Certificate"
                                        onClick={() => {
                                            window.location.href = data?.generateTestCertificate;
                                        }}
                                    />
                                </>
                            ) : (
                                ''
                            )}
                        </Form>
                    );
                }}
            </Formik>
        </div>
    );
};

EditTrophyCertificate.propTypes = {
    setClassName: PropTypes.func,
    classtopic_id: PropTypes.number
};

export default EditTrophyCertificate;
