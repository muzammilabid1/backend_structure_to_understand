import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { makeStyles } from '@mui/styles';
import { Form, Formik } from 'formik';
import moment from 'moment';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { updateSchoolClass } from '../../../graphQl/mutations';
import {
    getAllYearGroups,
    getPreAdmissionClasses,
    getSchoolClassesAndGroups,
    getSchoolClassForClassDetailsPage,
    getSchoolForSchoolOverview,
    getSchoolTeachers
} from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import {
    _removeWhiteSpace,
    defaultWeeklyReadingTarget,
    getFutureDate,
    getReceptionYearGroupId,
    ThemeContext
} from '../../../shared/Services/handler';
import { addClassValidation } from '../../../shared/validations';
import { ILwpSchoolClassDetails } from '../../../types/ILwpSchoolClass';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonNavTabs from '../../Shared/CommonNavTabs';
import CommonProgrammeOptions from '../../Shared/CommonProgrammeOptions';
import CommonSelectField from '../../Shared/CommonSelectField';
import InputField from '../../Shared/InputField/InputField';
import AddTeacherModal from '../../Shared/Modals/AddTeacher';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading3 from '../../Shared/Typography/Heading3';
import ClassHeader from '../ClassHeader';

// Queries
const schoolClassHaveReadingTopics = gql`
    query schoolClassHaveReadingTopics($classId: String!) {
        schoolClassHaveReadingTopics(classId: $classId) {
            readingTopicExist
            readingTopicReleased
        }
    }
`;

const useStyles = makeStyles({
    registrationCheckboxContainer: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '22px',
        marginBottom: '10px'
    },
    readingLogNotAvailable: {
        display: 'flex',
        marginBottom: '10px'
    },
    readingLogClassIcon: {
        marginLeft: '10px'
    },
    programmeClassError: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '3px',
        marginBottom: '10px',
        '& .MuiSvgIcon-root': {
            fontSize: '14px',
            marginTop: '2px',
            color: '#e8492a'
        },
        '& p': {
            marginTop: '8px',
            fontSize: '12px',
            color: '#e8492a'
        }
    }
});

interface ClassDetailsSettingProps {
    schoolClassData: {
        schoolClass: ILwpSchoolClassDetails | null;
    };
}

const ClassDetailsSetting = ({ schoolClassData }: ClassDetailsSettingProps) => {
    const queryParams = useParams();
    const { callSnackbar, token } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [openProgrammeModel, setOpenProgrammeModel] = useState(false);

    const classes = useStyles();

    const futureDate = getFutureDate(schoolClassData?.schoolClass?.readingStartDay);

    const [schoolTeachersQuery, { loading: schoolTeachersLoading, error, data: schoolTeachers }] = useLazyQuery(getSchoolTeachers);
    const [getAdminSchoolClassesQuery, { loading: schoolDataLoading, error: schoolError, data: schoolData }] =
        useLazyQuery(getSchoolForSchoolOverview);
    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);

    const { error: haveReadingTopicsError, data: haveReadingTopics } = useQuery(schoolClassHaveReadingTopics, {
        variables: { classId: queryParams?.class_id }
    });

    useEffect(() => {
        if (schoolClassData?.schoolClass?.school?.id) {
            schoolTeachersQuery({ variables: { schoolId: schoolClassData?.schoolClass?.school?.id } });
            getAdminSchoolClassesQuery({ variables: { id: schoolClassData?.schoolClass?.school?.id } });
        }
    }, [schoolClassData?.schoolClass?.school?.id]);

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
        if (haveReadingTopicsError?.message) callSnackbar(haveReadingTopicsError, 'error');
        if (schoolError?.message) callSnackbar(schoolError, 'error');
        if (yearGroupError?.message) callSnackbar(yearGroupError, 'error');
    }, [error, haveReadingTopicsError, schoolError, yearGroupError]);

    const [updateClass, { loading: updateClassIsLoading }] = useMutation(updateSchoolClass, {
        refetchQueries: [
            { query: getSchoolClassForClassDetailsPage, variables: { id: queryParams?.class_id } },
            { query: getSchoolClassesAndGroups, variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: true } },
            token?.isSchoolLeader && {
                query: getSchoolClassesAndGroups,
                variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
            },
            { query: getPreAdmissionClasses, variables: { schoolId: schoolClassData?.schoolClass?.school?.id } }
        ],
        awaitRefetchQueries: true
    });

    const [updateClassTeacher, { loading: updateClassTeacherIsLoading }] = useMutation(updateSchoolClass, {
        refetchQueries: [
            { query: getSchoolClassForClassDetailsPage, variables: { id: queryParams?.class_id } },
            { query: getSchoolClassesAndGroups, variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: true } },
            token?.isSchoolLeader && {
                query: getSchoolClassesAndGroups,
                variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
            }
        ],
        awaitRefetchQueries: true
    });

    const [updateReadingLog, { loading: updateReadingLogIsLoading }] = useMutation(updateSchoolClass, {
        refetchQueries: [
            { query: getSchoolClassForClassDetailsPage, variables: { id: queryParams?.class_id } },
            { query: getSchoolClassesAndGroups, variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: true } },
            token?.isSchoolLeader && {
                query: getSchoolClassesAndGroups,
                variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
            },
            { query: getPreAdmissionClasses, variables: { schoolId: schoolClassData?.schoolClass?.school?.id } }
        ],
        awaitRefetchQueries: true
    });

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

    if (schoolTeachersLoading || schoolDataLoading) return <CommonLoading />;

    return (
        <div className="class_details">
            <Formik
                validationSchema={addClassValidation}
                initialValues={{
                    name: schoolClassData?.schoolClass?.name,
                    misClassName: schoolClassData?.schoolClass?.importedSchoolClass?.name,
                    yearGroup: schoolClassData?.schoolClass?.yearGroup?.id,
                    mainTeacher: schoolClassData?.schoolClass?.mainTeacher?.id,
                    teachers: schoolClassData?.schoolClass?.teachers
                        ?.filter((i) => schoolClassData?.schoolClass?.mainTeacher?.id !== i.id)
                        ?.map((i) => ({ value: `${i.firstname} ${i.lastname}`, key: i.id })),
                    isReadingLogsEnabled: schoolClassData?.schoolClass?.IsReadingLogsEnabled,
                    isRegistrationClass: schoolClassData?.schoolClass?.isRegistrationClass,
                    isLocked: schoolClassData?.schoolClass?.isLocked,
                    readingTarget: schoolClassData?.schoolClass?.IsReadingLogsEnabled
                        ? schoolClassData?.schoolClass?.readingTarget
                        : defaultWeeklyReadingTarget(),
                    readingLaunchDate: schoolClassData?.schoolClass?.readingLaunchDate
                        ? new Date(schoolClassData?.schoolClass?.readingLaunchDate)
                        : moment(futureDate, 'DD/MM/YYYY').toDate(),
                    readingStartDay: schoolClassData?.schoolClass?.readingStartDay,
                    isFullProgramme: schoolClassData?.schoolClass?.isFullProgramme,
                    wondeClassId: schoolClassData?.schoolClass?.importedSchoolClass?.id ?? null,
                    inheritClassId: null,
                    fullProgrammeClassesAllowed: schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.fullProgramme,
                    totalClassesAllowed: schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.total,
                    isReadyTeddy: schoolClassData?.schoolClass?.isReadyTeddyEnabled || false,
                    isMoneySkillsAvailable: schoolClassData?.schoolClass?.school?.isMoneySkillsAvailable || false
                }}
                onSubmit={async (values) => {
                    try {
                        const {
                            name,
                            yearGroup,
                            mainTeacher,
                            teachers,
                            isReadingLogsEnabled,
                            inheritClassId,
                            isRegistrationClass,
                            isLocked,
                            readingLaunchDate,
                            isFullProgramme,
                            readingTarget,
                            readingStartDay
                        } = values;

                        const trimmedName = _removeWhiteSpace(name);

                        await updateClass({
                            variables: {
                                input: {
                                    name: trimmedName,
                                    yearGroup: yearGroup,
                                    id: schoolClassData?.schoolClass?.id,
                                    mainTeacher,
                                    teachers: (teachers || []).map((i) => i.key),
                                    isReadingLogsEnabled,
                                    isRegistrationClass,
                                    isLocked,
                                    lastYearsInheritedClassId: inheritClassId,
                                    readingTarget,
                                    readingLaunchDate,
                                    isFullProgramme,
                                    readingStartDay
                                }
                            }
                        });
                        callSnackbar('Class has been updated.', 'success');
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
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setValues }) => {
                    return (
                        <>
                            <ClassHeader schoolClassData={schoolClassData?.schoolClass} />

                            <CommonNavTabs
                                isReading={schoolClassData?.schoolClass?.IsReadingLogsEnabled}
                                isFullProgramme={schoolClassData?.schoolClass?.isFullProgramme}
                                isRegistrationClass={schoolClassData?.schoolClass?.isRegistrationClass}
                                subjects={schoolClassData?.schoolClass?.subjects}
                                attentionRequiredPupilsCount={schoolClassData?.schoolClass?.attentionRequiredPupilsCount}
                                schoolClass={schoolClassData?.schoolClass}
                            />

                            <Form onSubmit={(e) => e.preventDefault()}>
                                <div className="class-detail-form">
                                    {schoolClassData?.schoolClass?.school?.misName && (
                                        <InputField
                                            name="misClassName"
                                            value={values.misClassName}
                                            error={errors.misClassName}
                                            touched={touched.misClassName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            label={`${schoolData?.['getSchool']?.misName} class name`}
                                            disabled
                                        />
                                    )}

                                    <Heading3 text={'Class details'} customClass={'general-heading'} />
                                    <InputField
                                        name="name"
                                        value={values.name}
                                        error={errors.name}
                                        touched={touched.name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        label="Class name"
                                        type="text"
                                    />

                                    <CommonSelectField
                                        label={'Year group'}
                                        options={(yearGroups?.allYearGroup || []).map((item) => ({
                                            value: item.year,
                                            key: item.id.toString()
                                        }))}
                                        value={values.yearGroup}
                                        error={errors.yearGroup}
                                        touched={touched.yearGroup}
                                        disabled={
                                            schoolClassData?.schoolClass?.period?.index >
                                            schoolClassData?.schoolClass?.school?.curentPeriod?.index
                                        }
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

                                    <LWPButton btnText="Update details" loading={updateClassIsLoading} onClick={handleSubmit} />

                                    <Heading3 text={'Teachers'} customClass="teacher-heading" />

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
                                        dataTest="add-teachers-in-class-select"
                                    />

                                    <div className="add-teacher-container cp" onClick={() => setOpen(true)}>
                                        <span className="title">Add a teacher who isn’t registered with Learning with Parents</span>
                                        <span className="material-icons add-btn">add</span>
                                    </div>

                                    <LWPButton
                                        btnText="Update teachers "
                                        loading={updateClassTeacherIsLoading}
                                        onClick={() => {
                                            updateClassTeacher({
                                                variables: {
                                                    input: {
                                                        id: schoolClassData?.schoolClass?.id,
                                                        mainTeacher: values?.mainTeacher,
                                                        teachers: (values?.teachers || []).map((i) => i.key)
                                                    }
                                                }
                                            })
                                                .then(() => {
                                                    callSnackbar('Teachers has been updated.', 'success');
                                                })
                                                .catch((error) => callSnackbar(error, 'error'));
                                        }}
                                    />

                                    <div className="class-detail-programme-section">
                                        <CommonProgrammeOptions
                                            values={values}
                                            errors={errors}
                                            touched={touched}
                                            handleChange={handleChange}
                                            handleBlur={handleBlur}
                                            setValues={setValues}
                                            classes={classes}
                                            isClassDetailPage
                                            classId={parseInt(schoolClassData?.schoolClass?.id)}
                                            haveReadingTopics={haveReadingTopics?.schoolClassHaveReadingTopics}
                                            schoolId={schoolClassData?.schoolClass?.school?.id}
                                            isFullProgramme={schoolClassData?.schoolClass?.isFullProgramme}
                                            remainingFullProgrammedClassInfo={
                                                schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.fullProgramme
                                            }
                                            remainingTotalClassInfo={
                                                schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.total
                                            }
                                            schoolDetails={schoolClassData?.schoolClass?.school}
                                            classDetail={schoolClassData?.schoolClass}
                                            isVisibleReadyTeddyCheckBox={
                                                values?.yearGroup && values?.yearGroup === getReceptionYearGroupId(yearGroups?.allYearGroup)
                                            }
                                        />

                                        <LWPButton
                                            btnText="Save programme options"
                                            loading={updateReadingLogIsLoading}
                                            disabled={updateReadingLogIsLoading || !values?.isRegistrationClass}
                                            onClick={async () => {
                                                const schoolClassDetails = schoolClassData?.schoolClass;

                                                if (!values.isReadyTeddy && !values.isFullProgramme && !values.isReadingLogsEnabled) {
                                                    callSnackbar('Please select at least one programme option.', 'error');
                                                } else if (
                                                    values.isReadyTeddy &&
                                                    schoolClassDetails?.yearGroup?.id !== getReceptionYearGroupId(yearGroups?.allYearGroup)
                                                ) {
                                                    callSnackbar(
                                                        'Please set year group to reception before enabling "Ready Teddy"',
                                                        'error'
                                                    );
                                                } else if (
                                                    (values?.isFullProgramme !== schoolClassDetails?.isFullProgramme &&
                                                        schoolClassDetails?.school?.remainingAllowedClassesInfo?.fullProgramme > 0) ||
                                                    (values?.isReadyTeddy !== schoolClassDetails?.isReadyTeddyEnabled &&
                                                        schoolClassData?.schoolClass?.school?.isReadyTeddyAvailable)
                                                ) {
                                                    setOpenProgrammeModel(!openProgrammeModel);
                                                } else {
                                                    await updateReadingLog({
                                                        variables: {
                                                            input: {
                                                                id: schoolClassDetails?.id,
                                                                isReadingLogsEnabled: values?.isReadingLogsEnabled,
                                                                readingTarget: values?.readingTarget,
                                                                readingStartDay: values?.readingStartDay,
                                                                readingLaunchDate: values?.readingLaunchDate
                                                                    ? values?.readingLaunchDate
                                                                    : null,
                                                                isFullProgramme: values?.isFullProgramme,
                                                                isReadyTeddy: values?.isReadyTeddy
                                                            }
                                                        }
                                                    })
                                                        .then(() => {
                                                            callSnackbar('Class program settings updated.', 'success');
                                                        })
                                                        .catch((error) => callSnackbar(error, 'error'));
                                                }
                                            }}
                                        />
                                    </div>
                                    {/* )} */}
                                </div>
                            </Form>

                            {open && (
                                <AddTeacherModal
                                    open={open}
                                    setOpen={() => setOpen(!open)}
                                    schoolId={schoolClassData?.schoolClass?.school?.id}
                                />
                            )}

                            {openProgrammeModel && (
                                <ConfirmationModal
                                    open={openProgrammeModel}
                                    onCancel={() => setOpenProgrammeModel(false)}
                                    loading={updateReadingLogIsLoading}
                                    heading={'Are you sure?'}
                                    btnText={'Confirm'}
                                    contentWidth={'768px'}
                                    className="class-detail-programme-modal"
                                    onConfirm={async () => {
                                        await updateReadingLog({
                                            variables: {
                                                input: {
                                                    id: schoolClassData?.schoolClass?.id,
                                                    isReadingLogsEnabled: values?.isReadingLogsEnabled,
                                                    readingTarget: values?.readingTarget,
                                                    readingStartDay: values?.readingStartDay,
                                                    readingLaunchDate: values?.readingLaunchDate ? values?.readingLaunchDate : null,
                                                    isFullProgramme: values?.isFullProgramme,
                                                    isReadyTeddy: values?.isReadyTeddy
                                                }
                                            }
                                        })
                                            .then(() => {
                                                callSnackbar('Class program settings updated.', 'success');
                                                setOpenProgrammeModel(false);
                                            })
                                            .catch((error) => callSnackbar(error, 'error'));
                                    }}>
                                    Some changes to the programme options for the class cannot easily be reversed - please make sure you
                                    have checked the details.
                                </ConfirmationModal>
                            )}
                        </>
                    );
                }}
            </Formik>
        </div>
    );
};

export default ClassDetailsSetting;
