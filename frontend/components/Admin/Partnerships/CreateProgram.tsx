import { gql, useMutation, useQuery } from '@apollo/client';
import { Formik } from 'formik';
import React, { useContext, useMemo } from 'react';

import { _getBase64ToFile, ThemeContext } from '../../../shared/Services/handler';
import { createProgramFromAdminValidation } from '../../../shared/validations';
import { IStaticLwpProgram } from '../../../types/entities/IStaticLwpProgram';
import CommonFileUpload from '../../Shared/CommonFileUpload';
import CommonSelectField from '../../Shared/CommonSelectField';
import DialogWrapper from '../../Shared/DialogWrapper';
import Divider from '../../Shared/Divider';
import InputField from '../../Shared/InputField/InputField';
import { getProgramsForAdmin } from '.';

const createNewProgram = gql`
    mutation createNewProgram($input: CreateNewProgramInput!, $logo: Upload, $character: Upload) {
        createNewProgram(input: $input, logo: $logo, character: $character) {
            id
        }
    }
`;

const updateProgram = gql`
    mutation updateProgram($input: UpdateProgramInput!, $logo: Upload, $character: Upload) {
        updateProgram(input: $input, logo: $logo, character: $character) {
            id
        }
    }
`;

export const getSchoolTagsForAdmin = gql`
    query getSchoolTagsForAdmin {
        getSchoolTagsForAdmin {
            id
            name
            color
        }
    }
`;

interface ICreateProgramInput {
    id?: string;
    name: string;
    schoolTagId: string;
    removeLogo?: boolean;
    removeCharacter?: boolean;
}

interface ICreateProgramProps {
    isOpen: boolean;
    program: IStaticLwpProgram;
    handleClose: () => void;
}

const CreateProgram = ({ isOpen, program, handleClose }: ICreateProgramProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const { data: allTagsData } = useQuery(getSchoolTagsForAdmin);

    const [createNewProgramMutation, { loading }] = useMutation(createNewProgram, {
        refetchQueries: [{ query: getProgramsForAdmin }],
        awaitRefetchQueries: true
    });

    const [updateProgramMutation, { loading: updateSubjectLoading }] = useMutation(updateProgram, {
        refetchQueries: [{ query: getProgramsForAdmin }],
        awaitRefetchQueries: true
    });

    const schoolTags = useMemo(() => {
        const tags: Array<{ value: string; key: string }> = (allTagsData?.getSchoolTagsForAdmin ?? []).map((schoolTag) => ({
            value: schoolTag.name,
            key: schoolTag.id
        }));

        tags.unshift({ key: '', value: 'None' });

        return tags;
    }, [allTagsData]);

    return (
        <Formik
            enableReinitialize
            initialValues={{
                name: program?.name ?? '',
                logo: program?.logoUrl ?? '',
                character: program?.characterUrl ?? '',
                schoolTagId: program?.schoolTag?.id ?? ''
            }}
            validationSchema={createProgramFromAdminValidation}
            onSubmit={async (values) => {
                try {
                    const input: ICreateProgramInput = {
                        name: values.name,
                        schoolTagId: values.schoolTagId
                    };

                    const logo = values?.logo && values.logo.startsWith('data:') ? _getBase64ToFile(values.logo, undefined) : null;
                    const character =
                        values?.character && values.character.startsWith('data:')
                            ? _getBase64ToFile(values.character, undefined /* FIXME(cj): Shouldn't we be passing a filename here? */)
                            : null;

                    // If no new logo or character is provided during editing, set removeLogo and removeCharacter to true if the existing URLs are present.
                    if (!values?.logo && program?.logoUrl) input.removeLogo = true;
                    if (!values?.character && program?.characterUrl) input.removeCharacter = true;

                    if (program) {
                        input.id = program?.id;
                        await updateProgramMutation({
                            variables: {
                                input,
                                logo,
                                character
                            }
                        });
                    } else {
                        await createNewProgramMutation({
                            variables: {
                                input,
                                logo,
                                character
                            }
                        });
                    }

                    callSnackbar(program ? 'Updated successfully' : 'New partner added successfully', 'success');
                    handleClose();
                } catch (error) {
                    callSnackbar(error, 'error');
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <DialogWrapper
                    primaryBtnHandler={handleSubmit}
                    primaryBtnloading={loading || updateSubjectLoading}
                    dialogFooter
                    open={isOpen}
                    contentWidth="700px"
                    className="add-partnership-modal"
                    heading={program ? 'Edit partnerships' : 'Add a partnerships'}
                    primaryBtnText={program ? 'Update' : 'Save'}
                    onClose={handleClose}
                    setOpen={handleClose}
                    cancelBtn>
                    <InputField
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.name}
                        touched={touched.name}
                        label="Program name"
                        type="text"
                        md={12}
                        lg={12}
                    />

                    <CommonSelectField
                        name="schoolTagId"
                        value={values.schoolTagId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        options={schoolTags}
                        label="Select school tag"
                        md={12}
                        lg={12}
                    />
                    <CommonFileUpload
                        name="logo"
                        previewImage={values.logo}
                        customClass="add-resource-file-upload"
                        icon="folder"
                        heading="Logo"
                        onClose={() => handleChange({ target: { name: 'logo', value: '' } })}
                        onSave={(croppedImage) => {
                            handleChange({ target: { name: 'logo', value: croppedImage } });
                        }}
                    />
                    <Divider />
                    <CommonFileUpload
                        name="character"
                        previewImage={values.character}
                        customClass="add-resource-file-upload"
                        icon="folder"
                        heading="Character"
                        onClose={() => handleChange({ target: { name: 'character', value: '' } })}
                        onSave={(croppedImage) => {
                            handleChange({ target: { name: 'character', value: croppedImage } });
                        }}
                    />
                </DialogWrapper>
            )}
        </Formik>
    );
};

export default CreateProgram;
