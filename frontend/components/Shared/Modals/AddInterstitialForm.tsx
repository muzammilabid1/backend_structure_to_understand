import { gql, useMutation, useQuery } from '@apollo/client';
import { Formik, FormikHelpers } from 'formik';
import React, { useContext, useEffect } from 'react';

import { addInterstitialForm, updateInterstitialForm } from '../../../graphQl/mutations';
import { unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import sharedJson from '../../../shared/json/index.json';
import { _removeWhiteSpace, handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { addFormValidation } from '../../../shared/validations';
import { InterstitialForm } from '../../../types/entities/IStaticLwpInterstitial';
import { IStaticLwpSchoolTag } from '../../../types/entities/IStaticLwpSchoolTag';
import { IStaticLwpSubject } from '../../../types/entities/IStaticLwpSubject';
import { getAllInterstitialFormForSiteForm } from '../../Admin/SiteForms';
import CommonCheckBox from '../CommonCheckBox';
import CommonLoading from '../CommonLoading';
import CommonMultiSelect from '../CommonMultiSelect';
import CommonSelectField from '../CommonSelectField';
import CommonTooltipIcon from '../CommonTooltipIcon';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';

const getSchoolTagsForAdmin = gql`
    query getSchoolTagsForAdmin {
        getSchoolTagsForAdmin {
            id
            name
            color
        }
    }
`;

const getSubjectsForAddInterstitialForm = gql`
    query getSubjectsForAdmin {
        getSubjectsForAdmin {
            id
            name
        }
    }
`;

type Option = {
    key: string;
    value: string;
};

type FormValues = {
    heading: string;
    text: string;
    typeformId: string;
    averageTime: number | string;
    name: string;
    showQuestion: boolean;
    userOptions: Option[];
    subjectId?: string;
    schoolTags: Option[];
};

interface AddInterstitialFormProps {
    open: boolean;
    setOpen: () => void;
    defaultValues?: InterstitialForm | null;
}

interface InterstitialFormData {
    getSubjectsForAdmin: IStaticLwpSubject[];
}
interface SchoolTagsData {
    getSchoolTagsForAdmin: IStaticLwpSchoolTag[];
}

const AddInterstitialForm: React.FC<AddInterstitialFormProps> = ({ open, setOpen, defaultValues }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading: getSubjectsLoading,
        data: getSubjectsData,
        error: subjectsError
    } = useQuery<InterstitialFormData>(getSubjectsForAddInterstitialForm);

    const { loading: schoolTagsLoading, data: schoolTagsData, error: schoolTagsError } = useQuery<SchoolTagsData>(getSchoolTagsForAdmin);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, subjectsError);
        handleErrorSnackbar(callSnackbar, schoolTagsError);
    }, [subjectsError, schoolTagsError]);

    const [addInterstitialFormMutation, { loading: addLoading }] = useMutation(addInterstitialForm, {
        refetchQueries: [{ query: getAllInterstitialFormForSiteForm }],
        awaitRefetchQueries: true
    });

    const [updateInterstitialFormMutation, { loading: updateLoading }] = useMutation(updateInterstitialForm, {
        refetchQueries: [{ query: getAllInterstitialFormForSiteForm }],
        awaitRefetchQueries: true
    });

    const initialValues: FormValues = defaultValues
        ? {
              heading: defaultValues.heading,
              text: defaultValues.text || '',
              typeformId: defaultValues.typeformId,
              averageTime: defaultValues.averageTime || '',
              name: defaultValues.name,
              showQuestion: defaultValues.showQuestion,
              subjectId: defaultValues.subject?.id ? defaultValues.subject.id : '-1',
              userOptions: sharedJson?.interstitialUserOptions?.filter((option) =>
                  (defaultValues?.userOptions || [])?.includes(option?.key)
              ),
              schoolTags: defaultValues?.schoolTags?.map((tag) => ({ key: tag.id, value: tag.name })) || []
          }
        : formInitialStates['addForm'];

    const handleSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
        try {
            let { heading, text } = values;
            const { typeformId, userOptions, averageTime, name, showQuestion, subjectId, schoolTags } = values;

            heading = _removeWhiteSpace(heading);
            text = _removeWhiteSpace(text);

            let newUserOptions = userOptions.map((i) => i.key);

            if (newUserOptions.includes('PARENT')) {
                newUserOptions = newUserOptions.filter((o) => o !== 'NEW_PARENT');
            }

            if (newUserOptions.includes('TEACHER')) {
                newUserOptions = newUserOptions.filter((o) => o !== 'NEW_TEACHER');
            }

            const input = {
                type: 'FORM',
                heading,
                text: text || null,
                typeformId,
                userOptions: newUserOptions,
                averageTime,
                name,
                subjectId: subjectId === '-1' ? null : subjectId,
                showQuestion,
                schoolTagsIds: schoolTags?.length > 0 ? schoolTags?.map((tag) => tag?.key) : []
            };

            if (defaultValues) {
                await updateInterstitialFormMutation({
                    variables: { input: { ...input, id: defaultValues.id } }
                });
                callSnackbar('Update form successfully!', 'success');
            } else {
                await addInterstitialFormMutation({ variables: { input } });
                callSnackbar('Add form successfully!', 'success');
            }

            setOpen();
            resetForm({ values: initialValues });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError?.(error, {
                    caught: true,
                    handled: false
                });
                callSnackbar(unexpectedError, 'error');
            }
        }
    };

    if (getSubjectsLoading || schoolTagsLoading) return <CommonLoading />;

    return (
        <Formik validationSchema={addFormValidation} enableReinitialize initialValues={initialValues} onSubmit={handleSubmit}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <DialogWrapper
                    primaryBtnHandler={handleSubmit}
                    primaryBtnloading={addLoading || updateLoading}
                    dialogFooter
                    open={open}
                    setOpen={setOpen}
                    primaryBtnText={defaultValues ? 'Update form' : 'Add form'}
                    cancelBtn
                    contentWidth="750px"
                    heading={defaultValues ? 'Update a form' : 'Add a form'}>
                    <InputField
                        name="name"
                        value={values.name}
                        error={errors.name}
                        touched={touched.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Form name"
                        endCommonTooltipIcon={<CommonTooltipIcon text="This field is shown on the parent card and teacher menu" />}
                        md={12}
                        lg={12}
                    />
                    <InputField
                        name="heading"
                        value={values.heading}
                        error={errors.heading}
                        touched={touched.heading}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Heading"
                        endCommonTooltipIcon={<CommonTooltipIcon text="This field is shown at the top of the modal" />}
                        md={12}
                        lg={12}
                    />
                    <InputField
                        name="text"
                        value={values.text}
                        error={errors.text}
                        touched={touched.text}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Text"
                        endCommonTooltipIcon={<CommonTooltipIcon text="This message is shown on the modal" />}
                        md={12}
                        lg={12}
                    />
                    <InputField
                        name="typeformId"
                        value={values.typeformId}
                        error={errors.typeformId}
                        touched={touched.typeformId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Typeform id"
                        md={12}
                        lg={12}
                    />
                    <InputField
                        name="averageTime"
                        value={values.averageTime}
                        error={errors.averageTime}
                        touched={touched.averageTime}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        type="number"
                        label="Average time (in minutes)"
                        md={12}
                        lg={12}
                    />
                    <CommonMultiSelect
                        disabled={defaultValues?.lastAction === 'RELEASED'}
                        value={values.userOptions}
                        label="User options"
                        name="userOptions"
                        error={errors.userOptions}
                        touched={touched.userOptions}
                        options={sharedJson?.interstitialUserOptions}
                        onChange={(value) =>
                            handleChange({
                                target: { name: 'userOptions', value }
                            })
                        }
                        onBlur={(value) =>
                            handleBlur({
                                target: { name: 'userOptions', value }
                            })
                        }
                        dataTest="add-interstitial-form-user-options-multi-select"
                    />

                    <CommonMultiSelect
                        disabled={defaultValues?.lastAction === 'RELEASED'}
                        value={values.schoolTags}
                        label="School tags"
                        name="schoolTags"
                        error={errors.schoolTags}
                        touched={touched.schoolTags}
                        options={
                            schoolTagsData?.getSchoolTagsForAdmin?.map((tag) => ({
                                key: tag?.id,
                                value: tag?.name
                            })) || []
                        }
                        onChange={(value) =>
                            handleChange({
                                target: { name: 'schoolTags', value }
                            })
                        }
                        onBlur={(value) =>
                            handleBlur({
                                target: { name: 'schoolTags', value }
                            })
                        }
                        dataTest="add-interstitial-form-school-tags-multi-select"
                    />
                    <CommonSelectField
                        label="Subject"
                        name="subjectId"
                        dataTest="add-interstitial-form-subject-select"
                        disabled={defaultValues?.lastAction === 'RELEASED'}
                        onChange={(e) =>
                            handleChange({
                                target: { name: 'subjectId', value: e.target.value }
                            })
                        }
                        onBlur={(e) =>
                            handleBlur({
                                target: { name: 'subjectId', value: e.target.value }
                            })
                        }
                        value={values?.subjectId}
                        options={(getSubjectsData?.getSubjectsForAdmin || [])
                            ?.map((subject: IStaticLwpSubject) => ({
                                key: subject?.id,
                                value: subject?.name
                            }))
                            .concat([{ key: '-1', value: 'No subject' }])}
                    />
                    <CommonCheckBox
                        label="Show number of questions"
                        name="showQuestion"
                        checked={values.showQuestion}
                        onChange={(e) =>
                            handleChange({
                                target: {
                                    name: 'showQuestion',
                                    value: e.target.checked
                                }
                            })
                        }
                        onBlur={handleBlur}
                        error={errors.showQuestion}
                        touched={touched.showQuestion}
                    />
                </DialogWrapper>
            )}
        </Formik>
    );
};

export default AddInterstitialForm;
