import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { useParams } from 'next/navigation';
import { FC, useContext, useEffect, useState } from 'react';

import { getClassesAndGroupsInfoOfPupils } from '../../../../graphQl/queries';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { addPupilTagValidation } from '../../../../shared/validations';
import MultiSelect from '../../../Class/ClassReading/MultiSelect';
import CustomColorPicker from '../../../Shared/CustomColorPicker';
import DialogWrapper from '../../../Shared/DialogWrapper';
import InputField from '../../../Shared/InputField/InputField';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import { getPupilsByTagId } from '../../../Shared/ShowPupilsByPupilTagId';
import { getAllSchoolPupilTags, IDialogWrapperOption } from '..';

interface AddPupilTagProps {
    dialogWrapperOption: IDialogWrapperOption;
    handleClose: () => void;
}

export const createPupilTag = gql`
    mutation createPupilTag($input: CreateLwpSchoolPupilTagInput!) {
        createPupilTag(input: $input) {
            id
        }
    }
`;

export const updatePupilTag = gql`
    mutation updatePupilTag($input: UpdateLwpSchoolPupilTagInput!) {
        updatePupilTag(input: $input) {
            id
        }
    }
`;

const AddPupilTag: FC<AddPupilTagProps> = ({ dialogWrapperOption, handleClose }) => {
    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const [openConfirmationModal, setOpenConfirmationModal] = useState(false);

    const schoolId = queryParams?.school_id;

    const { error, data, loading } = useQuery(getClassesAndGroupsInfoOfPupils, {
        variables: { schoolId, classId: queryParams?.class_id, readingOnly: false },
        skip: !dialogWrapperOption.isOpen
    });

    const {
        error: getPupilsError,
        data: getPupilsDate,
        loading: getPupilsLoading
    } = useQuery(getPupilsByTagId, {
        variables: { id: dialogWrapperOption?.tag?.id },
        skip: !dialogWrapperOption?.tag?.id
    });

    const usePupilTagMutation = (mutationFunction) => {
        return useMutation(mutationFunction, {
            refetchQueries: [
                {
                    query: getAllSchoolPupilTags,
                    variables: { schoolId }
                }
            ],
            awaitRefetchQueries: true
        });
    };

    const [createPupilTagMutation, { loading: createPupilTagLoading }] = usePupilTagMutation(createPupilTag);
    const [updatePupilTagMutation, { loading: updatePupilTagLoading }] = usePupilTagMutation(updatePupilTag);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, getPupilsError);
    }, [error]);

    return (
        <Formik
            validationSchema={addPupilTagValidation}
            enableReinitialize
            initialValues={{
                name: dialogWrapperOption?.tag?.name ?? '',
                color: dialogWrapperOption?.tag?.color ?? '#F28D00',
                school: '',
                pupilIds: getPupilsDate?.getPupilsByTagId?.map((pupil) => pupil?.id)
            }}
            onSubmit={async (values, { resetForm }) => {
                try {
                    if (dialogWrapperOption?.tag && !openConfirmationModal) {
                        setOpenConfirmationModal(true);

                        return;
                    }

                    const tagName = values?.name?.trim() || '';

                    if (dialogWrapperOption.tag) {
                        await updatePupilTagMutation({
                            variables: {
                                input: {
                                    id: dialogWrapperOption?.tag?.id,
                                    name: tagName,
                                    color: values?.color,
                                    pupilIds: values?.pupilIds
                                }
                            }
                        });
                        callSnackbar('Update tag successfully!', 'success');
                    } else {
                        await createPupilTagMutation({
                            variables: {
                                input: {
                                    name: tagName,
                                    color: values?.color,
                                    pupilIds: values?.pupilIds,
                                    schoolId: schoolId
                                }
                            }
                        });
                        callSnackbar('Add tag successfully!', 'success');
                    }

                    handleClose();
                    resetForm();
                } catch (error) {
                    callSnackbar(error, 'error');
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        heading={dialogWrapperOption.tag ? 'Update a tag' : 'Add a tag'}
                        open={dialogWrapperOption.isOpen}
                        contentWidth="648px"
                        dialogFooter
                        primaryBtnloading={createPupilTagLoading}
                        primaryBtnHandler={() => handleSubmit()}
                        primaryBtnText={dialogWrapperOption?.tag ? 'Edit' : 'Add'}
                        onClose={handleClose}
                        setOpen={handleClose}
                        cancelBtn>
                        <Grid container gap={3} justifyContent={'end'}>
                            <MultiSelect
                                name="pupilIds"
                                className="mb_24"
                                options={data?.getClassesAndGroupsInfoOfPupils ?? []}
                                error={errors.pupilIds}
                                touched={touched.pupilIds}
                                forSchool={true}
                                onChange={async (value) => {
                                    handleChange({
                                        target: { value, name: 'pupilIds' }
                                    });
                                }}
                                selected={values.pupilIds ?? []}
                                disabled={loading || getPupilsLoading}
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
                                category={'Pupil'}
                            />
                        </Grid>

                        <ConfirmationModal
                            open={openConfirmationModal}
                            onCancel={() => setOpenConfirmationModal(false)}
                            loading={updatePupilTagLoading}
                            onConfirm={handleSubmit}
                            heading="Are you sure want to edit this tag?"
                            btnText="Save changes">
                            {`This will replace the existing "${dialogWrapperOption?.tag?.name}" tag with the new one. All pupils with the
                            original tag will receive the updated tag.`}
                        </ConfirmationModal>
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default AddPupilTag;
