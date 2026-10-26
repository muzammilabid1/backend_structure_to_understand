import { useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useContext, useEffect, useState } from 'react';

import { createStaticTrophy } from '../../../graphQl/mutations';
import { unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { _getBase64ToFile, handleErrorSnackbar, isCertificateValid, ThemeContext } from '../../../shared/Services/handler';
import { addTrophyCertificateFromAdminValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonFieldArrayForTrophyCertificate from './../../Shared/CommonFieldArrayForTrophyCertificate';
import CommonFileUpload from './../../Shared/CommonFileUpload';
import Divider from './../../Shared/Divider';
import DateField from './../../Shared/InputField/DateField';
import InputField from './../../Shared/InputField/InputField';
import Heading2 from './../../Shared/Typography/Heading2';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import { getSubjectsForTrophyCertificate } from '../../../graphQl/queries';

const AddTrophyCertificate = () => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [certificateFileName, setCertificateFileName] = useState(null);

    const { data: allSubjects, error: subjectsError } = useQuery(getSubjectsForTrophyCertificate);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, subjectsError);
    }, [subjectsError]);
    const [createStaticTrophyMutation, { loading: createStaticTrophyLoading }] = useMutation(createStaticTrophy);

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

    return (
        <div className="add-trophy-certificate-container">
            <Formik
                initialValues={{
                    title: '',
                    order: 0,
                    startDate: new Date(),
                    endDate: new Date(),
                    isActive: true,
                    isPupilMail: false,
                    isTeacherMail: false,
                    logo: null,
                    subjects: [{ key: '0', value: 'ALL' }],
                    logoId: null,
                    hasMathscot: false,
                    mathscotScale: null,
                    mathscotXValue: null,
                    certificatePdf: null,
                    certificatePdfId: null,
                    mathsoctYValue: null,
                    addFieldDataType: sharedJson?.trophy_certificate_fieldData_types?.[0]?.key,
                    fieldData: []
                }}
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

                        if (isCertificateValid(values) && logoFile && certificatePdfFile) {
                            files.push(logoFile);
                            files.push(certificatePdfFile);

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

                            await createStaticTrophyMutation({
                                variables: {
                                    file: files,
                                    input: {
                                        certificate: JSON.stringify(certificate),
                                        order: +order,
                                        subjects: subjectIds,
                                        ...rest
                                    }
                                }
                            })
                                .then(({ data }) => {
                                    callSnackbar('Trophy Certificate Created!', 'success');
                                    router?.push(`/admin/edit-trophy-certificate/${data?.createStaticTrophy?.id}`);
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
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
                            <Heading2 text="Add Trophy Certificate" />
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
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                name="order"
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
                                        error={errors?.mathscotXValue}
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
                                        error={errors?.mathsoctYValue}
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
                                        error={errors?.mathscotScale}
                                        touched={true}
                                    />
                                </div>
                            )}

                            <CommonFieldArrayForTrophyCertificate
                                handleChange={handleChange}
                                handleBlur={handleBlur}
                                values={values}
                                errors={errors}
                            />

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
                                btnText="Add Trophy Certificate"
                                loading={createStaticTrophyLoading}
                                onClick={handleSubmit}
                            />
                        </Form>
                    );
                }}
            </Formik>
        </div>
    );
};

export default AddTrophyCertificate;
