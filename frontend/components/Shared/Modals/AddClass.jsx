import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { createSchoolClass, updateSchoolClass } from '../../../graphQl/mutations';
import {
    getAllYearGroups,
    getSchoolClass,
    getSchoolClasses,
    getSchoolClassesForClassOverview,
    getSchoolForSchoolOverview,
    getSchoolTeachers
} from '../../../graphQl/queries';
import { ADMIN, TEACHER, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import sharedJson from '../../../shared/json/index.json';
import { _removeWhiteSpace, defaultWeeklyReadingTarget, ThemeContext } from '../../../shared/Services/handler';
import { addClassValidation } from '../../../shared/validations';
import CommonCheckBox from './../CommonCheckBox';
import CommonMultiSelect from './../CommonMultiSelect';
import CommonSelectField from './../CommonSelectField';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';

const AddClassModal = ({ open, setOpen, defaultValues, schoolId }) => {
    const { callSnackbar, token } = useContext(ThemeContext);

    const { error, data: schoolTeachers } = useQuery(getSchoolTeachers, { variables: { schoolId } });
    const { schoolError, data: schoolData } = useQuery(getSchoolForSchoolOverview, { variables: { id: schoolId } });
    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        schoolError?.message && callSnackbar(schoolError, 'error');
    }, [schoolError]);

    useEffect(() => {
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
    }, [yearGroupError]);

    let [addClass, { loading }] = useMutation(createSchoolClass, {
        refetchQueries: [{ query: getSchoolClasses, variables: { schoolId } }],
        awaitRefetchQueries: true
    });

    let [updateClass, { loading: updateClassIsLoading }] = useMutation(updateSchoolClass, {
        refetchQueries: [{ query: getSchoolClasses, variables: { schoolId } }],
        awaitRefetchQueries: true
    });

    if (token?.userType === ADMIN) {
        [addClass, { loading }] = useMutation(createSchoolClass, {
            refetchQueries: [{ query: getSchoolClassesForClassOverview, variables: { schoolId } }],
            awaitRefetchQueries: true
        });
    }

    if (token?.userType === TEACHER) {
        [updateClass, { loading: updateClassIsLoading }] = useMutation(updateSchoolClass, {
            refetchQueries: [{ query: getSchoolClass, variables: { id: defaultValues?.id } }],
            awaitRefetchQueries: true
        });
    }

    const getMainTeachers = (teachers) => {
        let result = [];

        if (teachers.length && schoolTeachers) {
            result = schoolTeachers?.['getSchoolTeachers']
                .filter((i) => {
                    return teachers.find((j) => j.key !== i.id);
                })
                .map((teacher) => ({
                    value: `${teacher.firstname} ${teacher.lastname}`,
                    key: teacher.id
                }));
        } else {
            result = (schoolTeachers?.['getSchoolTeachers'] || []).map((teacher) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id
            }));
        }

        return result;
    };

    const getOtherTeachers = (mainTeacherId) => {
        return schoolTeachers?.['getSchoolTeachers']
            .filter((i) => i.id !== mainTeacherId)
            .map((teacher) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id
            }));
    };

    return (
        <Formik
            validationSchema={addClassValidation}
            enableReinitialize
            initialValues={
                defaultValues
                    ? {
                          name: defaultValues?.name,
                          yearGroup: defaultValues?.yearGroup?.id,
                          mainTeacher: defaultValues?.mainTeacher?.id,
                          teachers: defaultValues?.teachers
                              ?.filter((i) => defaultValues?.mainTeacher?.id !== i.id)
                              ?.map((i) => ({ value: `${i.firstname} ${i.lastname}`, key: i.id })),
                          isReadingLogsEnabled: defaultValues?.IsReadingLogsEnabled,
                          readingTarget: defaultValues?.readingTarget,
                          inheritClassId: null
                      }
                    : {
                          ...formInitialStates['addClass'],
                          readingTarget: defaultWeeklyReadingTarget()
                      }
            }
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { name, yearGroup, mainTeacher, teachers, isReadingLogsEnabled, inheritClassId, readingTarget } = values;

                    name = _removeWhiteSpace(name);

                    if (defaultValues) {
                        await updateClass({
                            variables: {
                                input: {
                                    id: defaultValues?.id,
                                    name,
                                    yearGroup: yearGroup,
                                    readingTarget,
                                    mainTeacher: mainTeacher,
                                    teachers: (teachers || []).map((i) => i.key),
                                    isReadingLogsEnabled,
                                    lastYearsInheritedClassId: inheritClassId
                                }
                            }
                        });
                        setOpen();
                        resetForm({ values: '' });
                        callSnackbar('Class has been updated.', 'success');
                    } else {
                        await addClass({
                            variables: {
                                input: {
                                    name,
                                    yearGroup: yearGroup,
                                    schoolId: schoolId,
                                    readingTarget,
                                    mainTeacher: mainTeacher,
                                    teachers: (teachers || []).map((i) => i.key),
                                    periodId: schoolData?.['getSchool']?.curentPeriod?.index
                                }
                            }
                        });
                        setOpen();
                        resetForm({ values: '' });
                        callSnackbar('New class created', 'success');
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
                    <DialogWrapper
                        primaryBtnHandler={handleSubmit}
                        primaryBtnloading={loading || updateClassIsLoading}
                        dialogFooter
                        open={open}
                        setOpen={setOpen}
                        primaryBtnText={defaultValues ? 'Update class' : 'Add class'}
                        cancelBtn
                        heading={defaultValues ? 'Update a class' : 'Add a class'}>
                        <InputField
                            name="name"
                            value={values.name}
                            error={errors.name}
                            touched={touched.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Class name"
                            type="text"
                            md={12}
                            lg={12}
                        />

                        <CommonSelectField
                            label={'Main teacher'}
                            options={getMainTeachers(values.teachers)}
                            value={values.mainTeacher}
                            error={errors.mainTeacher}
                            touched={touched.mainTeacher}
                            onChange={(e) => {
                                handleChange({
                                    target: { name: 'mainTeacher', value: e.target.value }
                                });
                            }}
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'mainTeacher', value: e.target.value }
                                })
                            }
                        />
                        <CommonSelectField
                            label={'Year group'}
                            options={(yearGroups?.allYearGroup || []).map((item) => ({ value: item.year, key: item.id.toString() }))}
                            value={values.yearGroup}
                            error={errors.yearGroup}
                            touched={touched.yearGroup}
                            onChange={(e) =>
                                handleChange({
                                    target: { name: 'yearGroup', value: e.target.value }
                                })
                            }
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'yearGroup', value: e.target.value }
                                })
                            }
                        />

                        <CommonMultiSelect
                            value={values.teachers}
                            options={getOtherTeachers(values.mainTeacher)}
                            label="Other teachers"
                            name="teachers"
                            error={errors.teachers}
                            touched={touched.teachers}
                            onChange={(value) =>
                                handleChange({
                                    target: { name: 'teachers', value: value }
                                })
                            }
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'teachers', value: value }
                                })
                            }
                        />

                        <CommonCheckBox
                            name="isReadingLogsEnabled"
                            checked={values.isReadingLogsEnabled}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            label="Enable weekly reading log"
                            error={errors.isReadingLogsEnabled}
                            touched={touched.isReadingLogsEnabled}
                        />
                        {values.isReadingLogsEnabled && (
                            <CommonSelectField
                                label={'Weekly reading target'}
                                options={sharedJson?.weeklyReadingTarget}
                                value={values.readingTarget}
                                error={errors.readingTarget}
                                touched={touched.readingTarget}
                                onChange={(e) =>
                                    handleChange({
                                        target: { name: 'readingTarget', value: +e.target.value }
                                    })
                                }
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'readingTarget', value: +e.target.value }
                                    })
                                }
                            />
                        )}
                    </DialogWrapper>
                );
            }}
        </Formik>
    );
};

AddClassModal.propTypes = {
    open: PropTypes.bool,
    setOpen: PropTypes.func,
    setUpdateClassValues: PropTypes.func,
    setOpenConfirm: PropTypes.func,
    defaultValues: PropTypes.object,
    schoolId: PropTypes.string
};

export default AddClassModal;
