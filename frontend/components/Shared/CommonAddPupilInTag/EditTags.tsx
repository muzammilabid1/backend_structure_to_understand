/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation, useQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Collapse, Divider, Grid } from '@mui/material';
import { Formik } from 'formik';
import React, { useContext, useEffect, useState } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { editPupilTagValidation } from '../../../shared/validations';
import { IPupil } from '../../../types/entities/IPupil';
import { getAllSchoolPupilTags } from '../../School/PupilTag';
import CommonMultiSelect from '../CommonMultiSelect';
import CommonTag from '../CommonTag';
import CustomColorPicker from '../CustomColorPicker';
import DialogWrapper from '../DialogWrapper';
import InputField from '../InputField/InputField';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';
import { IDialogWrapperOptionPupilTag } from '.';

const addPupilTagsInPupils = gql`
    mutation addPupilTagsInPupils($input: AddPupilTagsInPupilInput!) {
        addPupilTagsInPupils(input: $input)
    }
`;

const updatePupilTagsInPupils = gql`
    mutation updatePupilTagsInPupils($input: AddPupilTagsInPupilInput!) {
        updatePupilTagsInPupils(input: $input)
    }
`;

interface EditTagsProps {
    options: IDialogWrapperOptionPupilTag;
    handleClose: () => void;
    onSuccess: () => void;
    query: any;
    variables: any;
    tags: any;
    pupils?: IPupil[];
}

const EditTags: React.FC<EditTagsProps> = ({ options, handleClose, query, variables, tags, pupils = null, onSuccess }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [createTag, setCreateTag] = useState(false);

    const { data, error } = useQuery(getAllSchoolPupilTags, {
        variables: { schoolId: options.schoolId },
        skip: !options.isOpen
    });

    const [addPupilTagsInPupilMutation, { loading: addPupilTagsInPupilLoading }] = useMutation(addPupilTagsInPupils, {
        refetchQueries: [{ query: query, variables: variables }],
        awaitRefetchQueries: true
    });
    const [updatePupilTagsInPupilsMutation, { loading: updatePupilTagsInPupilsLoading }] = useMutation(updatePupilTagsInPupils, {
        refetchQueries: [{ query: query, variables: variables }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    return (
        <Formik
            validationSchema={() => editPupilTagValidation(createTag)}
            enableReinitialize
            initialValues={{
                tags: tags?.map((tag) => ({ id: tag?.id, value: tag?.name, ...tag })),
                color: '#F28D00',
                name: '',
                pupils: pupils
                    ? options?.pupilIds?.map((id) => ({ id, value: pupils?.find((x) => x?.id === id)?.fullname }))
                    : [{ id: options?.pupilIds[0], value: '' }]
            }}
            onSubmit={async (values) => {
                try {
                    const mutationVariables = {
                        input: {
                            tagIds: values?.tags?.map(({ id }) => id),
                            color: createTag ? values?.color : null,
                            name: createTag ? values?.name : null,
                            pupilIds: values?.pupils?.map(({ id }) => id),
                            schoolId: options?.schoolId
                        }
                    };

                    const mutation = pupils ? addPupilTagsInPupilMutation : updatePupilTagsInPupilsMutation;

                    await mutation({ variables: mutationVariables });
                    onSuccess();
                } catch (error) {
                    callSnackbar(error, 'error');
                    handleClose();
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        heading={tags?.length > 0 ? 'Edit tags' : 'Add tags'}
                        open={options.isOpen}
                        contentWidth="648px"
                        dialogFooter
                        primaryBtnloading={addPupilTagsInPupilLoading || updatePupilTagsInPupilsLoading}
                        primaryBtnHandler={handleSubmit}
                        primaryBtnText={createTag ? 'Add tag ' : 'Save'}
                        onClose={handleClose}
                        setOpen={handleClose}
                        cancelBtn>
                        <Grid container>
                            {pupils && (
                                <CommonMultiSelect
                                    name="pupils"
                                    label="Pupils"
                                    value={values.pupils}
                                    displayEmpty
                                    shrink={values.pupils}
                                    options={pupils?.map((item) => ({
                                        value: item.fullname,
                                        id: item.id
                                    }))}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'pupils', value: value }
                                        });
                                    }}
                                    renderTags={(value, getTagProps) =>
                                        value.map((option: any, index) => (
                                            <CommonTag
                                                name={option?.value}
                                                textColor={'#000'}
                                                deleteIcon={<CloseIcon />}
                                                {...getTagProps({ index })}
                                            />
                                        ))
                                    }
                                />
                            )}

                            <CommonMultiSelect
                                name="tags"
                                label="Tags"
                                value={values.tags}
                                displayEmpty
                                shrink={values.tags}
                                options={[{ value: 'createNewTag' }, ...(data?.getAllSchoolPupilTags || [])].map((item) => ({
                                    value: item.name,
                                    id: item.id,
                                    ...item
                                }))}
                                renderOption={(props, option: any) => {
                                    if (option?.value === 'createNewTag') {
                                        return (
                                            <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                                <Grid container gap={1} alignItems={'center'} flexDirection={'column'}>
                                                    <Paragraph text="+ Create a new tag" />
                                                    <Divider />
                                                </Grid>
                                            </Box>
                                        );
                                    }

                                    return (
                                        <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
                                            <CommonTag name={option?.value} bgColor={option?.color} />
                                        </Box>
                                    );
                                }}
                                onChange={(value) => {
                                    if (value?.some((x) => x.value == 'createNewTag')) {
                                        setCreateTag(true);
                                    } else {
                                        handleChange({
                                            target: { name: 'tags', value: value }
                                        });
                                    }
                                }}
                                onBlur={(value) =>
                                    handleBlur({
                                        target: { name: 'tags', value: value }
                                    })
                                }
                                renderTags={(value, getTagProps) =>
                                    value.map((option: any, index) => (
                                        <CommonTag
                                            name={option?.value}
                                            bgColor={option?.color}
                                            deleteIcon={<CloseIcon />}
                                            {...getTagProps({ index })}
                                        />
                                    ))
                                }
                            />

                            <Collapse in={createTag} unmountOnExit>
                                <Grid container>
                                    <Grid container justifyContent={'space-between'} mb={1}>
                                        <Heading3 text="Creating a new tag" />
                                        <Paragraph text="Cancel" customClass="ul cp" onClick={() => setCreateTag(false)} />
                                    </Grid>

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
                                        category={'Pupil'}
                                    />
                                </Grid>
                            </Collapse>
                        </Grid>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default EditTags;
