/* eslint-disable react/prop-types */
import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { updateSchool } from '../../../graphQl/mutations';
import { getSchoolForSchoolDetailsForAdmin, getSchoolTagsForAdmin } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _getBase64ToFile, ThemeContext } from '../../../shared/Services/handler';
import { updateSchoolDetailsValidation } from '../../../shared/validations';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonEditor from '../../Shared/CommonEditor';
import CommonError from '../../Shared/CommonError';
import CommonTag from '../../Shared/CommonTag';
import Paragraph from '../../Shared/Typography/Paragraph';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonFileUpload from './../../Shared/CommonFileUpload';
import CommonMultiSelect from './../../Shared/CommonMultiSelect';
import DateField from './../../Shared/InputField/DateField';
import InputField from './../../Shared/InputField/InputField';

const SchoolDetails = (props) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [filename, setFileName] = useState(null);

    const [updateSchoolDetailsMutation, { loading }] = useMutation(updateSchool, {
        refetchQueries: [{ query: getSchoolForSchoolDetailsForAdmin, variables: { id: props.schoolId } }],
        awaitRefetchQueries: true
    });

    const { error, data: allTagFormData } = useQuery(getSchoolTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <Formik
            initialValues={props}
            enableReinitialize
            validationSchema={updateSchoolDetailsValidation}
            onSubmit={async (values) => {
                try {
                    let files = [];

                    let newFile = values.logo && values.logo.startsWith('data:') && filename && _getBase64ToFile(values.logo, filename);

                    if (newFile) files.push(newFile);

                    const termsAndConditions = values?.showTermsAndConditions ? values?.termsAndConditions : null;

                    const privacyPolicy = values?.showPrivacyPolicy ? values?.privacyPolicy : null;

                    await updateSchoolDetailsMutation({
                        variables: {
                            file: files,
                            input: {
                                id: props.schoolId,
                                schoolName: values?.schoolName,
                                organisations: values?.organisations,
                                termsAndConditions: values?.showTermsAndConditions ? termsAndConditions : null,
                                privacyPolicy: values?.showPrivacyPolicy ? privacyPolicy : null,
                                urn: values?.urn ? values?.urn?.trim() : null,
                                isTestSchool: values?.isTestSchool,
                                hasImage: values?.logo ? true : false,
                                inactive: values?.inactive,
                                ignoreAcademicYearCheckDuringImport: values?.ignoreAcademicYearCheckDuringImport,
                                tags: values?.tags?.map((tag) => tag.key),
                                enableAddClasses: values?.enableAddClasses,
                                skipAutoWondeImport: values?.skipAutoWondeImport,
                                isMoneySkillsAvailable: values?.isMoneySkillsAvailable,
                                isReadyTeddyAvailable: values?.isReadyTeddyAvailable
                            }
                        }
                    });

                    callSnackbar(`School has been successfully updated.`, 'success');
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
            {({ values, handleChange, handleBlur, handleSubmit, errors, touched, setFieldValue }) => {
                return (
                    <Form className="mt10">
                        <InputField
                            label="School name"
                            name="schoolName"
                            value={values.schoolName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.schoolName}
                            touched={touched.schoolName}
                            inputProps={{ 'data-test': 'add-school-name-input' }}
                        />
                        <InputField
                            label="URN"
                            value={values.urn}
                            name="urn"
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.urn}
                            touched={touched.urn}
                            inputProps={{ 'data-test': 'add-school-urn-input' }}
                        />
                        <CommonMultiSelect
                            value={values.tags}
                            options={(allTagFormData?.getSchoolTagsForAdmin || [])?.map((tag) => ({
                                value: tag.name,
                                key: tag.id,
                                color: tag.color
                            }))}
                            label="School tags"
                            name="tags"
                            error={errors.tags}
                            touched={touched.tags}
                            md={6}
                            lg={6}
                            onChange={(value) =>
                                handleChange({
                                    target: { name: 'tags', value: value }
                                })
                            }
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'tags', value: value }
                                })
                            }
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                ))
                            }
                        />
                        <InputField label="Comments and photos" value={values.commentsAndPhotos} disabled />
                        <InputField label="Mis integration" value={values.misName || 'none'} disabled />
                        <InputField label="Wonde school name" value={values.wondeSchoolName || 'none'} disabled />
                        <InputField label="Wonde school urn" value={values.wondeSchoolRrn || 'none'} disabled />
                        <InputField
                            name="organisations"
                            label="Organisations"
                            value={values.organisations}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.organisations}
                            touched={touched.organisations}
                        />
                        <CommonCheckBox
                            label="Override terms & conditions"
                            name="showTermsAndConditions"
                            checked={values.showTermsAndConditions}
                            error={errors.showTermsAndConditions}
                            touched={touched.showTermsAndConditions}
                            onChange={handleChange}
                        />
                        {values?.showTermsAndConditions && (
                            <CommonCard>
                                <Paragraph style={{ fontWeight: 'bold' }}>Terms and conditions</Paragraph>
                                <CommonCheckBox
                                    checked={values.termsEditAsHtml}
                                    onChange={() => setFieldValue('termsEditAsHtml', !values.termsEditAsHtml)}
                                    label="Edit As Html"
                                />
                                <CommonEditor
                                    value={values.termsAndConditions}
                                    onChange={(editorState) => setFieldValue('termsAndConditions', editorState)}
                                    editAsHtml={values.termsEditAsHtml}
                                />
                                <CommonError error={errors?.termsAndConditions} touched={touched?.termsAndConditions} />
                            </CommonCard>
                        )}
                        <CommonCheckBox
                            label="Override privacy policy"
                            name="showPrivacyPolicy"
                            checked={values.showPrivacyPolicy}
                            error={errors.showPrivacyPolicy}
                            touched={touched.showPrivacyPolicy}
                            onChange={handleChange}
                        />
                        {values?.showPrivacyPolicy && (
                            <CommonCard>
                                <Paragraph style={{ fontWeight: 'bold' }}>Privacy policy</Paragraph>
                                <CommonCheckBox
                                    checked={values.policyEditAsHtml}
                                    onChange={() => setFieldValue('policyEditAsHtml', !values.policyEditAsHtml)}
                                    label="Edit As Html"
                                />
                                <CommonEditor
                                    value={values.privacyPolicy}
                                    onChange={(editorState) => setFieldValue('privacyPolicy', editorState)}
                                    editAsHtml={values.policyEditAsHtml}
                                />
                                <CommonError error={errors?.privacyPolicy} touched={touched?.privacyPolicy} />
                            </CommonCard>
                        )}
                        {props?.lastImportedAt && (
                            <DateField md={4} lg={4} label="Last imported data" value={new Date(values.lastImportedAt)} disabled />
                        )}
                        <br />
                        <CommonCheckBox label="Wonde data synced with lwp" checked={values.isWondeDataSyncedWithLwp} disabled />
                        <CommonCheckBox
                            label="Set school INACTIVE"
                            name="inactive"
                            checked={values.inactive}
                            error={errors.inactive}
                            touched={touched.inactive}
                            onChange={handleChange}
                            dataTest={'set-school-inactive-checkbox'}
                        />
                        <CommonCheckBox
                            label="Set test school"
                            name="isTestSchool"
                            checked={values.isTestSchool}
                            error={errors.isTestSchool}
                            touched={touched.isTestSchool}
                            onChange={handleChange}
                            dataTest={'set-test-school-checkbox'}
                        />
                        <CommonCheckBox
                            label="Enable 'Add class' option"
                            name="enableAddClasses"
                            checked={values.enableAddClasses}
                            error={errors.enableAddClasses}
                            touched={touched.enableAddClasses}
                            onChange={handleChange}
                            dataTest={'enable-add-class-checkbox'}
                        />
                        <CommonCheckBox
                            label="Skip automatic Wonde reimport for this school"
                            name="skipAutoWondeImport"
                            checked={values.skipAutoWondeImport}
                            error={errors.skipAutoWondeImport}
                            touched={touched.skipAutoWondeImport}
                            onChange={handleChange}
                            dataTest={'skip-automatic-wonde-import-checkbox'}
                        />

                        <CommonCheckBox
                            label="Ignore academic year check during import"
                            name="ignoreAcademicYearCheckDuringImport"
                            checked={values.ignoreAcademicYearCheckDuringImport}
                            error={errors.ignoreAcademicYearCheckDuringImport}
                            touched={touched.ignoreAcademicYearCheckDuringImport}
                            onChange={handleChange}
                            dataTest={'ignore-academic-year-check-during-import-checkbox'}
                        />

                        <CommonCheckBox
                            label="Enable money skills for this school"
                            name="isMoneySkillsAvailable"
                            checked={values.isMoneySkillsAvailable}
                            error={errors.isMoneySkillsAvailable}
                            touched={touched.isMoneySkillsAvailable}
                            onChange={handleChange}
                            dataTest={'enable-money-skills-checkbox'}
                        />

                        <CommonCheckBox
                            label="Enable ready teddy for this school"
                            name="isReadyTeddyAvailable"
                            checked={values.isReadyTeddyAvailable}
                            error={errors.isReadyTeddyAvailable}
                            touched={touched.isReadyTeddyAvailable}
                            onChange={handleChange}
                            dataTest={'enable-ready-teddy-checkbox'}
                        />

                        <CommonFileUpload
                            name="logo"
                            previewImage={values?.logo}
                            customClass="add-resource-file-upload"
                            icon="folder"
                            error={errors.logo}
                            touched={touched.logo}
                            heading="Logo"
                            setFileName={setFileName}
                            onClose={() => handleChange({ target: { name: 'logo', value: '' } })}
                            onSave={(croppedImage) => {
                                handleChange({ target: { name: 'logo', value: croppedImage } });
                            }}
                        />
                        <br />
                        <LWPButton
                            btnText={'Update details'}
                            onClick={handleSubmit}
                            loading={loading}
                            disabled={loading}
                            dataTest={'school-details-submit-button'}
                        />
                    </Form>
                );
            }}
        </Formik>
    );
};

SchoolDetails.propTypes = { schoolId: PropTypes.string, props: PropTypes.object };

export default SchoolDetails;
