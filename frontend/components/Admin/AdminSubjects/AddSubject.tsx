/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation } from '@apollo/client';
import { Formik } from 'formik';
import { SubjectProgrammeType } from 'lwp-shared';
import React, { useContext } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import { addSubjectFromAdminValidation } from '../../../shared/validations';
import CommonSelectField from '../../Shared/CommonSelectField';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';
import { renderSubjectProgrammeType } from '.';

const addSubject = gql`
    mutation addSubject($subjectName: String!, $programmeType: SubjectProgrammeType!) {
        addSubject(subjectName: $subjectName, programmeType: $programmeType) {
            id
        }
    }
`;

const updateSubject = gql`
    mutation updateSubject($input: UpdateSubjectInput!) {
        updateSubject(input: $input) {
            id
        }
    }
`;

type AddSubjectProps = {
    open: {
        isEdit: boolean;
        item?: {
            id: string;
            name: string;
            programmeType: SubjectProgrammeType;
        };
        isAddSubject: boolean;
    };
    setOpen: React.Dispatch<React.SetStateAction<{ isFilterOpen: boolean }>>;
    getAllSubjects: any;
};

const AddSubject = ({ open, setOpen, getAllSubjects }: AddSubjectProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [addSubjectMutation, { loading }] = useMutation(addSubject, {
        refetchQueries: [{ query: getAllSubjects }],
        awaitRefetchQueries: true
    });

    const [updateSubjectMutation, { loading: updateSubjectLoading }] = useMutation(updateSubject, {
        refetchQueries: [{ query: getAllSubjects }],
        awaitRefetchQueries: true
    });

    return (
        <Formik
            enableReinitialize
            initialValues={{
                name: open?.isEdit ? open?.item?.name : '',
                programmeType: open?.isEdit ? open?.item?.programmeType : ''
            }}
            validationSchema={addSubjectFromAdminValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    if (open?.isEdit) {
                        await updateSubjectMutation({
                            variables: {
                                input: { id: open?.item?.id, subjectName: values.name, programmeType: values.programmeType }
                            }
                        });
                    } else {
                        await addSubjectMutation({
                            variables: {
                                subjectName: values.name,
                                programmeType: values.programmeType
                            }
                        });
                    }

                    setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }));
                    resetForm();
                    callSnackbar(open?.isEdit ? 'Edit subject successfully' : 'New subject created', 'success');
                } catch (error) {
                    callSnackbar(error, 'error');
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                return (
                    <DialogWrapper
                        heading={open?.isEdit ? 'Edit subject' : 'Add a subject'}
                        open={open?.isAddSubject || open?.isEdit}
                        className="add_teacher_modal"
                        dialogFooter
                        primaryBtnloading={loading || updateSubjectLoading}
                        primaryBtnHandler={handleSubmit}
                        primaryBtnText={open?.isEdit ? 'Edit' : 'Add'}
                        onClose={() => setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }))}
                        setOpen={() => setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }))}
                        cancelBtn>
                        <InputField
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.name}
                            touched={touched.name}
                            label="Subject name"
                            type="text"
                            md={12}
                            lg={12}
                        />
                        <CommonSelectField
                            name="programmeType"
                            label="Programme Type"
                            options={Object.values(SubjectProgrammeType).map((type) => ({
                                value: renderSubjectProgrammeType(type),
                                key: type
                            }))}
                            value={values.programmeType}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.programmeType}
                            touched={touched.programmeType}
                            dataTest="subject-programme-type-select"
                        />
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

export default AddSubject;
