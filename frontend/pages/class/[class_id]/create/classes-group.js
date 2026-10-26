import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Alert, Checkbox, TableCell, TableRow } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import LWPButton from '../../../../components/Shared/Button/LWPButton';
import CommonCheckBox from '../../../../components/Shared/CommonCheckBox';
import CommonLoading from '../../../../components/Shared/CommonLoading';
import CommonMultiSelect from '../../../../components/Shared/CommonMultiSelect';
import CommonRadioButton from '../../../../components/Shared/CommonRadioButton';
import CommonSelectField from '../../../../components/Shared/CommonSelectField';
import CommonStatus from '../../../../components/Shared/CommonStatus';
import CommonTable from '../../../../components/Shared/CommonTable';
import InputField from '../../../../components/Shared/InputField/InputField';
import AddTeacherModal from '../../../../components/Shared/Modals/AddTeacher';
import Heading3 from '../../../../components/Shared/Typography/Heading3';
import Paragraph from '../../../../components/Shared/Typography/Paragraph';
import {
    getClassGroups,
    getSchoolClassesAndGroups,
    getSchoolClassForClassDetailsPage,
    getSchoolTeachers
} from '../../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { capitalizeFirstLetter, ThemeContext } from '../../../../shared/Services/handler';
import { addClassGroupValidation } from '../../../../shared/validations';
import { PageType } from '../../../../types/enums/PageType';

const getClassPupils = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            id
            fullname
            yearGroup

            classes {
                id
                name
                isRegistrationClass
            }
        }
    }
`;

const createGroupWithinSchoolClass = gql`
    mutation createGroupWithinSchoolClass($input: GroupWithinSchoolClassInput!) {
        createGroupWithinSchoolClass(input: $input) {
            id
        }
    }
`;

const getSubjectsForClassGroupCreation = gql`
    query getSubjectsForClassGroupCreation($classId: String!) {
        getSubjectsForClassGroupCreation(classId: $classId) {
            id
            name
        }
    }
`;

const ClassesGroup = () => {
    const { goBack, callSnackbar, token } = useContext(ThemeContext);
    const { query, push } = useRouter();

    const [open, setOpen] = useState(false);

    const {
        loading: schoolClassDataLoading,
        error: schoolClassDataError,
        data: schoolClassData
    } = useQuery(getSchoolClassForClassDetailsPage, {
        variables: { id: query?.class_id }
    });

    const {
        data: subjectsData,
        loading: subjectsLoading,
        error: subjectsError
    } = useQuery(getSubjectsForClassGroupCreation, {
        variables: { classId: query?.class_id },
        skip: !query?.class_id
    });
    const {
        loading: getClassPupilsLoading,
        error: getClassPupilsError,
        data
    } = useQuery(getClassPupils, {
        variables: { classId: query?.class_id }
    });

    const [schoolTeachersQuery, { loading: schoolTeachersLoading, error: schoolTeachersError, data: schoolTeachers }] =
        useLazyQuery(getSchoolTeachers);

    const [createGroupWithinSchoolClassMutation, { loading }] = useMutation(createGroupWithinSchoolClass, {
        refetchQueries: [
            { query: getClassGroups, variables: { classId: query?.class_id } },
            { query: getSchoolClassesAndGroups, variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: true } },
            token?.isSchoolLeader && {
                query: getSchoolClassesAndGroups,
                variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (schoolClassDataError?.message) callSnackbar(schoolClassDataError, 'error');
        if (schoolTeachersError?.message) callSnackbar(schoolTeachersError, 'error');
        if (getClassPupilsError?.message) callSnackbar(getClassPupilsError, 'error');
        if (subjectsError?.message) callSnackbar(subjectsError, 'error');
    }, [schoolClassDataError, schoolTeachersError, getClassPupilsError, subjectsError]);

    useEffect(() => {
        if (schoolClassData?.schoolClass?.school?.id) {
            schoolTeachersQuery({ variables: { schoolId: schoolClassData?.schoolClass?.school?.id } });
        }
    }, [schoolClassData]);

    const icon = <span className="material-icons">check_box_outline_blank</span>;
    const checkedIcon = <span className="material-icons">check_box</span>;

    const head = ['Pupil name', ''];

    const isFullProgramme = schoolClassData?.schoolClass?.isFullProgramme;
    const isReadyTeddyEnabled = schoolClassData?.schoolClass?.isReadyTeddyEnabled;
    const isReadingLogEnabled = schoolClassData?.schoolClass?.IsReadingLogsEnabled;

    const subjectDropdownVisible = isFullProgramme || isReadyTeddyEnabled || schoolClassData?.schoolClass?.school?.isMoneySkillsAvailable;

    const subjectsForGroup = useMemo(() => subjectsData?.getSubjectsForClassGroupCreation || [], [subjectsData]);

    const subjectOptions = useMemo(() => {
        if (!subjectDropdownVisible) return [];

        const schoolSubjects = subjectsForGroup.map((sub) => ({
            value: capitalizeFirstLetter(sub.name),
            key: sub.id
        }));

        if (isReadingLogEnabled) schoolSubjects.push({ value: 'Reading', key: 'Reading' });

        return schoolSubjects;
    }, [subjectsForGroup, subjectDropdownVisible, isReadingLogEnabled, isFullProgramme]);

    const filterSkipGroup = (value, join = false) => {
        const parentClassSubjects = subjectsForGroup?.map((sub) => capitalizeFirstLetter(sub?.name));

        if (join) {
            const filteredValues = value?.filter((item) => parentClassSubjects.includes(item?.value)).map((t) => t.value) ?? [];

            if (filteredValues.length > 2) {
                return filteredValues.slice(0, -1).join(', ') + ', and ' + filteredValues.slice(-1);
            }

            return filteredValues.join(' and ');
        }

        return value?.filter((item) => parentClassSubjects.includes(item?.value));
    };

    const getMainTeachers = (otherteachers) => {
        const schoolTeachersList = schoolTeachers?.['getSchoolTeachers'] || [];

        const result = otherteachers.length
            ? schoolTeachersList.filter((i) => !otherteachers.some((j) => j.key === i.id))
            : schoolTeachersList;

        return result.map((teacher) => ({
            value: `${teacher.firstname} ${teacher.lastname}`,
            key: teacher.id
        }));
    };

    const getOtherTeachers = (mainTeacherId) => {
        const schoolTeachersList = schoolTeachers?.['getSchoolTeachers'] || [];

        return schoolTeachersList
            .filter((teacher) => teacher.id !== mainTeacherId)
            .map((teacher) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id
            }));
    };

    const handleOnSubmit = async (values) => {
        let skipGroupRadio = values?.skipGroupRadio === 'true';

        const isReadingLogEnabled = values?.subjects?.some((t) => t.key == 'Reading');
        const subjectIds = values?.subjects?.filter((t) => t.key !== 'Reading')?.map((t) => t.key);

        if (values?.subjects?.length === 1 && values?.subjects[0]?.key === 'Reading') {
            skipGroupRadio = false;
        }

        try {
            const payload = {
                classId: query?.class_id,
                teacherIds: values?.otherteachers?.map((t) => t.key),
                pupilIds: values?.addPupil?.map((t) => t.key),
                subjectIds,
                mainTeacher: values?.mainTeacher,
                inviteImportedTeachers: values?.invite,
                skipGroupPupils: skipGroupRadio,
                name: values?.groupName,
                isReadingLogEnabled
            };

            await createGroupWithinSchoolClassMutation({
                variables: {
                    input: payload
                }
            });

            push(`/class/${query?.class_id}/class-groups`);
        } catch (error) {
            console.log('error:', error);
        }
    };

    if (schoolClassDataLoading || getClassPupilsLoading || schoolTeachersLoading || subjectsLoading) return <CommonLoading />;

    const showInviteTeacher = ({ values, errors, touched, handleChange }) => {
        const otherTeachers = values?.otherteachers ?? [];
        const allTeachers = [...otherTeachers.map((otherteacher) => otherteacher?.key), values?.mainTeacher];

        const filterTeachersList = (schoolTeachers?.['getSchoolTeachers'] || [])?.filter((teacher) =>
            allTeachers?.some((item) => item === teacher.id && teacher?.userStatus === 'IMPORTED')
        );

        if (!filterTeachersList?.length) {
            return;
        }

        return (
            <Alert severity="info">
                <Paragraph text="Some of these teachers have not been invited to use the Learning with Parents platform yet so they will not be able to log in." />

                <CommonCheckBox
                    name="invite"
                    checked={values.invite}
                    error={errors.invite}
                    touched={touched.invite}
                    onChange={handleChange}
                    label="Invite them now"
                />
                <br />

                <Paragraph text="(If you do not invite them now, they can be invited later from the “Teacher details” tab of the “School Overview” page.)" />
            </Alert>
        );
    };

    return (
        <div className="classes_group">
            <LWPButton btnText="Go back" startIcon="navigate_before" color="inherit" variant="text" size="medium" onClick={goBack} />

            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala_activate_teacher.png`}
                imageAlt={'teacher-img'}
                heading={'Create class group'}
                className="main_heading"
            />

            <Formik
                initialValues={{
                    groupName: '',
                    subjects: subjectDropdownVisible ? [] : [{ value: 'Reading', key: 'Reading' }],
                    skipGroupRadio: 'true',
                    mainTeacher: '',
                    addPupil: [],
                    otherteachers: [],
                    searchPupil: [],
                    invite: false
                }}
                validationSchema={addClassGroupValidation}
                enableReinitialize
                onSubmit={handleOnSubmit}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <div className="classes_group_form">
                        <InputField label="Class name" name="className" type="text" value={schoolClassData?.schoolClass?.name} disabled />
                        <Heading3 text={`Group details`} customClass="mb_16 mt_32" />
                        <InputField
                            label="Group name"
                            name="groupName"
                            type="text"
                            value={values.groupName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.groupName}
                            touched={touched.groupName}
                        />

                        {subjectDropdownVisible ? (
                            <>
                                <CommonMultiSelect
                                    label="This group will be used for:"
                                    name="subjects"
                                    options={subjectOptions}
                                    renderOption={(props, option, { selected }) => (
                                        <li {...props}>
                                            <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                                            {option.value}
                                        </li>
                                    )}
                                    filterSelectedOptions={false}
                                    value={values.subjects}
                                    error={errors.subjects}
                                    touched={touched.subjects}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'subjects', value: value }
                                        });
                                    }}
                                    dataTest="class-group-subjects-select"
                                />
                                {!!filterSkipGroup(values.subjects)?.length && (
                                    <>
                                        <CommonRadioButton
                                            name="skipGroupRadio"
                                            value={values.skipGroupRadio}
                                            error={errors.skipGroupRadio}
                                            touched={touched.skipGroupRadio}
                                            onChange={handleChange}
                                            options={[
                                                {
                                                    value: 'true',
                                                    heading: 'Set topics different from the class',
                                                    dataTest: 'set-topics-different-from-the-class',
                                                    text: `These pupils will be set ${filterSkipGroup(values.subjects, true)}
                                             topics in this group instead of the ones set for their registration class. (They will not be sent the
                                             ${filterSkipGroup(values.subjects, true)} topics set for the registration class.)`
                                                },
                                                {
                                                    value: 'false',
                                                    heading: 'Set topics additional to the class',
                                                    dataTest: 'set-topics-additional-to-the-class',
                                                    text: `These pupils will be set additional ${filterSkipGroup(values.subjects, true)}
                                             topics, and will be asked to complete topics set for their registration class as well as topics set for this group.`
                                                }
                                            ]}
                                        />
                                    </>
                                )}
                            </>
                        ) : null}

                        <Heading3 text="Add existing pupils to group" customClass="mt_32" />
                        <Paragraph text="Please select which existing pupils should be added to this group." customClass="mb_16" />
                        <CommonMultiSelect
                            name="searchPupil"
                            placeholder="Search for a pupil"
                            options={data?.getClassPupils?.map((t) => ({ ...t, value: t?.fullname, key: t?.id }))}
                            filterSelectedOptions={false}
                            value={values.searchPupil}
                            error={errors.searchPupil}
                            touched={touched.searchPupil}
                            onChange={(value) => {
                                const uniqueArr = [...new Map([...values.addPupil, ...value].map((v) => [v.key, v])).values()];

                                handleChange({
                                    target: {
                                        name: 'addPupil',
                                        value: uniqueArr
                                    }
                                });
                            }}
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'searchPupil', value: value }
                                })
                            }
                            dataTest="class-group-add-pupil-multi-select"
                        />
                        <CommonTable head={head} isChild={true} bold={false}>
                            {values?.addPupil.map((item) => {
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Paragraph>{`${item?.fullname}`}</Paragraph>
                                        </TableCell>

                                        <TableCell align="right">
                                            <div
                                                className="cp"
                                                onClick={() => {
                                                    const delteItem = values.addPupil?.filter((pupil) => pupil.id !== item.id);

                                                    handleChange({
                                                        target: {
                                                            name: 'addPupil',
                                                            value: delteItem
                                                        }
                                                    });
                                                }}>
                                                <span className="material-icons">delete</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </CommonTable>
                        <Heading3 text="Teachers" customClass="mt_32 mb_16" />
                        <CommonSelectField
                            label="Main  teacher"
                            name="mainTeacher"
                            options={getMainTeachers(values.otherteachers)}
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
                            dataTest="class-group-main-teacher-select"
                        />
                        <CommonMultiSelect
                            label="Other teachers"
                            name="otherteachers"
                            className="mb_24"
                            options={getOtherTeachers(values.mainTeacher)}
                            value={values.otherteachers}
                            error={errors.otherteachers}
                            touched={touched.otherteachers}
                            onChange={(value) => {
                                handleChange({
                                    target: { name: 'otherteachers', value: value }
                                });
                            }}
                            onBlur={(value) =>
                                handleBlur({
                                    target: { name: 'otherteachers', value: value }
                                })
                            }
                        />

                        {token?.isSchoolLeader && (
                            <div className={'addTeacherContainer'} onClick={() => setOpen(true)}>
                                <span className={'title'}>Add a teacher who isn’t registered with Learning with Parents</span>
                                <span className={`material-icons addBtn`}>add</span>
                            </div>
                        )}

                        {showInviteTeacher({ values, errors, touched, handleChange })}

                        <div className="btn_group">
                            <LWPButton
                                customClass="cancel_btn"
                                variant="text"
                                onClick={goBack}
                                btnText="Cancel"
                                color="inherit"
                                disabled={loading}
                            />
                            <LWPButton btnText="Create group" onClick={handleSubmit} loading={loading} />
                        </div>
                    </div>
                )}
            </Formik>

            {open && <AddTeacherModal open={open} setOpen={() => setOpen(!open)} schoolId={schoolClassData?.schoolClass?.school?.id} />}
        </div>
    );
};

ClassesGroup.pageType = PageType.TEACHER;
ClassesGroup.pageTitle = 'Class: Create classes group';

export default ClassesGroup;
