/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import React, { useContext } from 'react';

import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { addTagValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import CustomColorPicker from '../CustomColorPicker';
import InputField from './../InputField/InputField';

// Queries

export const getAllTagsForTagsOverview = gql`
    query allTags {
        allTags {
            id
            name
            color
        }
    }
`;

export const getTagsForAdmin = gql`
    query getTagsForAdmin {
        getTagsForAdmin {
            id
            name
            color
        }
    }
`;

// Mutations

export const addTagForTagsOverview = gql`
    mutation addTag($input: LwpActivityTagInput!) {
        addTag(input: $input) {
            id
        }
    }
`;

export const upadateTagForTagsOverview = gql`
    mutation updateTag($input: LwpTagUpdateInput!) {
        updateTag(input: $input) {
            id
        }
    }
`;

interface TagsOptions {
    addATags: boolean;
    currentFilter: boolean;
    defaultValues?: any;
    tabs: 'Topics' | 'Activities' | 'Schools';
}

interface AddTagProps {
    tagsOptions: TagsOptions;
    setActions: (actions: Partial<TagsOptions>) => void;
}

const AddTag = ({ tagsOptions, setActions }: AddTagProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const defaultValues = tagsOptions?.defaultValues;

    const [addTagFormMutation, { loading: addTagFormIsLoading }] = useMutation(addTagForTagsOverview, {
        refetchQueries: [
            {
                query: getTagsForAdmin
            }
        ],
        awaitRefetchQueries: true
    });

    const [updateTagFormMutation, { loading: getAllTagFormIsLoading }] = useMutation(upadateTagForTagsOverview, {
        refetchQueries: [{ query: getAllTagsForTagsOverview }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            validationSchema={addTagValidation}
            enableReinitialize
            initialValues={
                defaultValues
                    ? {
                          name: defaultValues?.name ? defaultValues?.name : '',
                          color: defaultValues?.color ? defaultValues?.color : '#F28D00'
                      }
                    : {
                          name: '',
                          color: '#F28D00'
                      }
            }
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
                                    color: values?.color
                                }
                            }
                        });

                        callSnackbar('Update tag successfully!', 'success');
                    } else {
                        await addTagFormMutation({
                            variables: {
                                input: {
                                    name,
                                    color: values?.color
                                }
                            }
                        });
                        callSnackbar('Add tag successfully!', 'success');
                    }

                    setActions({ addATags: false, defaultValues: null });
                    resetForm();
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
                    <>
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
                            md={12}
                            lg={12}
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

export default AddTag;
