/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import React, { useContext, useEffect } from 'react';

import { getAllTopicsForFeedFilter, getTopicTagsForAdmin } from '../../../../graphQl/queries';
import { _removeWhiteSpace, handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { addTopicTagValidation } from '../../../../shared/validations';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonMultiSelect from '../../../Shared/CommonMultiSelect';
import CustomColorPicker from '../../../Shared/CustomColorPicker';
import InputField from '../../../Shared/InputField/InputField';

// Mutations

export const addTopicTag = gql`
    mutation addTopicTag($input: LwpTopicTagInput!) {
        addTopicTag(input: $input) {
            id
        }
    }
`;

export const updateTopicTag = gql`
    mutation updateTopicTag($input: LwpTopicTagUpdateInput!) {
        updateTopicTag(input: $input) {
            id
        }
    }
`;

export const getTagTopics = gql`
    query getTagTopics($id: String!) {
        getTagTopics(id: $id) {
            id
            teacherTopicName
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
const AddTopicsTag = ({ tagsOptions, setActions }: AddATagProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const defaultValues = tagsOptions?.defaultValues;

    const { error, data } = useQuery(getAllTopicsForFeedFilter);

    const { error: tagTopicsError, data: tagTopicsData } = useQuery(getTagTopics, {
        variables: { id: defaultValues?.id },
        skip: !defaultValues
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, tagTopicsError);
    }, [error, tagTopicsError]);

    const [addTagFormMutation, { loading: addTagFormIsLoading }] = useMutation(addTopicTag, {
        refetchQueries: [
            {
                query: getTopicTagsForAdmin,
                variables: {
                    filter: tagsOptions?.currentFilter
                }
            }
        ],
        awaitRefetchQueries: true
    });

    const [updateTagFormMutation, { loading: getAllTagFormIsLoading }] = useMutation(updateTopicTag, {
        refetchQueries: [
            {
                query: getTopicTagsForAdmin,
                variables: {
                    filter: tagsOptions?.currentFilter
                }
            }
        ],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            validationSchema={addTopicTagValidation}
            enableReinitialize
            initialValues={{
                name: defaultValues?.name ? defaultValues?.name : '',
                color: defaultValues?.color ? defaultValues?.color : '#F28D00',
                topics: tagTopicsData?.getTagTopics?.map((tagTopic) => ({ key: tagTopic?.id, value: tagTopic?.teacherTopicName })) ?? []
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
                                    topicIds: values?.topics?.map((topic) => topic.key)
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
                                    topicIds: values?.topics?.map((topic) => topic.key)
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
                            value={values.topics}
                            options={(data?.['allTopics'] || []).map((topic) => ({
                                value: `${topic?.teacherTopicName}, (${topic?.yearGroups
                                    ?.map((y) => y?.shortName)
                                    .join(', ')}), ${topic?.domains?.map((d) => d?.title).join(', ')}`,
                                key: topic.id
                            }))}
                            label="Select topics"
                            name="topics"
                            error={errors.topics}
                            touched={touched.topics}
                            md={6}
                            lg={6}
                            onChange={(value) =>
                                handleChange({
                                    target: { name: 'topics', value: value }
                                })
                            }
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'topics', value: value }
                                })
                            }
                            dataTest="add-topic-tags-topic-multi-select"
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
                            <LWPButton
                                onClick={handleSubmit}
                                dataTest="add-topic-tags-submit-button"
                                btnText={'Save'}
                                loading={getAllTagFormIsLoading || addTagFormIsLoading}
                            />
                        </Grid>
                    </>
                );
            }}
        </Formik>
    );
};

export default AddTopicsTag;
