/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import React, { useContext, useEffect } from 'react';

import { getSchoolsForFeedFilter, getSchoolTagsForAdmin } from '../../../../graphQl/queries';
import { _removeWhiteSpace, handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { addTagSchoolValidation } from '../../../../shared/validations';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonMultiSelect from '../../../Shared/CommonMultiSelect';
import CustomColorPicker from '../../../Shared/CustomColorPicker';
import InputField from '../../../Shared/InputField/InputField';

// Mutations

export const addSchoolTag = gql`
    mutation addSchoolTag($input: CreateLwpSchoolTagInput!) {
        addSchoolTag(input: $input) {
            id
        }
    }
`;

export const updateSchoolTag = gql`
    mutation updateSchoolTag($input: UpdateLwpSchoolTagInput!) {
        updateSchoolTag(input: $input) {
            id
        }
    }
`;

export const getSchoolsByTagId = gql`
    query getSchoolsByTagId($tagId: String!) {
        getSchoolsByTagId(tagId: $tagId) {
            id
            schoolName
        }
    }
`;
interface TagsOptions {
    addATags: boolean;
    currentFilter: boolean;
    defaultValues?: any;
    tabs: 'Topics' | 'Activities' | 'Schools';
}

interface AddATagProps {
    tagsOptions: TagsOptions;
    setActions: (actions: Partial<TagsOptions>) => void;
}

const AddSchoolsTag = ({ tagsOptions, setActions }: AddATagProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const defaultValues = tagsOptions?.defaultValues;

    const { error, data: schoolData } = useQuery(getSchoolsForFeedFilter);

    const { error: getSchoolsError, data: getSchoolsData } = useQuery(getSchoolsByTagId, {
        variables: { tagId: defaultValues?.id },
        skip: !defaultValues
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, getSchoolsError);
    }, [error, getSchoolsError]);

    const [addTagFormMutation, { loading: addTagFormIsLoading }] = useMutation(addSchoolTag, {
        refetchQueries: [
            {
                query: getSchoolTagsForAdmin,
                variables: {
                    filter: tagsOptions?.currentFilter
                }
            }
        ],
        awaitRefetchQueries: true
    });

    const [updateTagFormMutation, { loading: getAllTagFormIsLoading }] = useMutation(updateSchoolTag, {
        refetchQueries: [
            {
                query: getSchoolTagsForAdmin,
                variables: {
                    filter: tagsOptions?.currentFilter
                }
            }
        ],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            validationSchema={addTagSchoolValidation}
            enableReinitialize
            initialValues={{
                name: defaultValues?.name ? defaultValues?.name : '',
                color: defaultValues?.color ? defaultValues?.color : '#F28D00',
                school: getSchoolsData?.getSchoolsByTagId?.map((school) => ({ key: school?.id, value: school?.schoolName })) ?? []
            }}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { name } = values;

                    name = _removeWhiteSpace(name);
                    if (defaultValues) {
                        await updateTagFormMutation({
                            variables: {
                                input: {
                                    id: defaultValues.id,
                                    name,
                                    color: values?.color,
                                    schoolIds: values?.school?.map((school) => school.key)
                                }
                            }
                        });
                        callSnackbar('Update tag successfully!', 'success');
                    } else {
                        await addTagFormMutation({
                            variables: {
                                input: {
                                    name,
                                    color: values?.color,
                                    schoolIds: values?.school?.map((school) => school.key)
                                }
                            }
                        });
                        callSnackbar('Add tag successfully!', 'success');
                    }

                    setActions({ addATags: false, defaultValues: null });
                    resetForm();
                } catch (error) {
                    callSnackbar(error, 'error');
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <>
                        <CommonMultiSelect
                            value={values.school}
                            options={(schoolData?.['getSchools'] || []).map((school) => ({
                                value: school.schoolName,
                                key: school.id
                            }))}
                            label="School"
                            name="school"
                            error={errors.school}
                            touched={touched.school}
                            dataTest="add-school-tag-multi-select"
                            md={6}
                            lg={6}
                            onChange={(value) =>
                                handleChange({
                                    target: { name: 'school', value: value }
                                })
                            }
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'school', value: value }
                                })
                            }
                        />
                        <InputField
                            name="name"
                            value={values.name}
                            error={errors.name}
                            touched={touched.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Tag name"
                            md={12}
                            lg={12}
                        />
                        <CustomColorPicker
                            value={values.color}
                            name="color"
                            onChange={handleChange}
                            preview={true}
                            previewText={values.name}
                            category={tagsOptions?.tabs}
                        />
                        <br />
                        <Grid container gap={3} justifyContent={'end'}>
                            <LWPButton
                                variant="text"
                                onClick={() => setActions({ addATags: false, defaultValues: null })}
                                btnText={'Cancel'}
                                color="inherit"
                                disabled={getAllTagFormIsLoading || addTagFormIsLoading}
                            />
                            <LWPButton onClick={handleSubmit} btnText={'Save'} loading={getAllTagFormIsLoading || addTagFormIsLoading} />
                        </Grid>
                    </>
                );
            }}
        </Formik>
    );
};

export default AddSchoolsTag;
