import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Alert, Snackbar, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Form, Formik } from 'formik';
import moment from 'moment';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { activationDestination } from '../../../components/Class/AssignSequence/activationDestination';
import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonCheckBox from '../../../components/Shared/CommonCheckBox';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonMultiSelect from '../../../components/Shared/CommonMultiSelect';
import CommonProgrammeOptions from '../../../components/Shared/CommonProgrammeOptions';
import CommonSelectField from '../../../components/Shared/CommonSelectField';
import CommonStatus from '../../../components/Shared/CommonStatus';
import CommonTooltipIcon from '../../../components/Shared/CommonTooltipIcon';
import InputField from '../../../components/Shared/InputField/InputField';
import AddTeacherModal from '../../../components/Shared/Modals/AddTeacher';
import Heading3 from '../../../components/Shared/Typography/Heading3';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { getPreAdmissionClasses, getSchoolClassesAndGroups } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, SchoolClassStatus, unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import {
    _removeWhiteSpace,
    defaultWeeklyReadingTarget,
    getFutureDate,
    getReceptionYearGroupId,
    ThemeContext
} from '../../../shared/Services/handler';
import { activateClassValidation } from '../../../shared/validations';
import { PageType } from '../../../types/enums/PageType';

// Queries

const getSchoolTeachersForActivateClass = gql`
    query getSchoolTeachers($schoolId: String!) {
        getSchoolTeachers(schoolId: $schoolId) {
            id
            firstname
            lastname
        }
    }
`;

const getAllYearGroupsForActivateClass = gql`
    query allYearGroup($showHiddenYearGroup: Boolean) {
        allYearGroup(showHiddenYearGroup: $showHiddenYearGroup) {
            id
            year
            shortName
        }
    }
`;

export const getSchoolClassForActivateClass = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            isRegistrationClass
            readingTarget
            readingStartDay
            IsReadingLogsEnabled
            isReadyTeddyEnabled
            isPreAdmissionClass
            isFullProgramme
            readingLaunchDate
            status
            school {
                id
                misName
                isReadyTeddyAvailable
                isReadyTeddyEnabled
                curentPeriod {
                    index
                }
                numOfTotalClassesAllowed
                numOfFullProgrammeClassesAllowed
                isMoneySkillsAvailable
                remainingAllowedClassesInfo {
                    fullProgramme
                    total
                }
            }
            importedSchoolClass {
                name
            }
            teachers {
                id
                firstname
                lastname
            }
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
            }
            period {
                index
            }
        }
    }
`;

/**
 * Whether to offer this class Money Skills auto-scheduling, asked after activation to decide where to
 * send the leader. One resolved boolean, which is the whole of the decision: the API answers the
 * school's licence, the class's own entitlement, whether a Money Skills sequence exists for its year
 * group, and the academic year, all against the class as it has just been written.
 *
 * The same field the school overview's button is driven by, so the two entry points cannot disagree
 * about which classes can be auto-scheduled.
 *
 * No id, because `no-cache` at the call site means there is nothing to normalise: this must neither
 * read an answer from before the class was activated nor leave one behind for a later page to find,
 * since both would be answers to a question about a different class.
 */
const getMoneySkillsAutoScheduleAvailability = gql`
    query getMoneySkillsAutoScheduleAvailability($id: String!) {
        schoolClass(id: $id) {
            canAutoScheduleMoneySkills
        }
    }
`;

// Mutation

const updateSchoolClassForActivateClass = gql`
    mutation updateSchoolClass($input: UpdateSchoolClassInput!) {
        updateSchoolClass(input: $input) {
            id
        }
    }
`;

// Component

const useStyles = makeStyles({
    form: {
        maxWidth: 376,
        margin: '0 auto',
        marginTop: 64
    },
    addTeacherContainer: {
        maxWidth: '100%',
        maxHeight: 67,
        background: '#FFFFFF',
        boxShadow: '0px 4px 8px 0px #D6D1CB80',
        padding: '10px 16px',
        margin: '20px auto 33px auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 4,
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    title: {
        // maxWidth: 150
        padding: '16px 8px 16px 8px',
        fontSize: 14
    },
    btn_group: {
        marginTop: 40,
        display: 'flex',
        justifyContent: 'flex-end'
    },
    addBtn: {
        // backgroundColor: '#F28D00',
        border: '3px solid #F28D00',
        borderRadius: '50%',
        cursor: 'pointer',
        color: '#F28D00',
        fontWeight: 'bold'
    },
    cancleBtn: {
        marginRight: 20,
        width: 100
    },
    heading: {
        marginTop: 33,
        marginBottom: 20
    },
    registrationCheckboxContainer: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '22px'
    },
    readingLogSelect: {
        marginTop: '14px'
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

const ActivateClass = () => {
    const classes = useStyles();
    const { push, replace, query } = useRouter();
    const { callSnackbar, token } = useContext(ThemeContext);

    const [open, setOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);

    /**
     * Whether activating is still under way, which outlasts the mutation.
     *
     * The mutation's own `loading` covers only the write, and activating now continues past it to
     * work out where to send the leader. Between the two the button would come back to life for long
     * enough to be pressed again, so this covers the whole act and is deliberately never cleared on
     * the way out: the page is navigating away, and a button that re-enables mid-navigation invites a
     * second activation of a class that already has one.
     */
    const [isActivating, setIsActivating] = useState(false);

    const ref = useRef(null);

    const {
        error: schoolClassError,
        data: schoolClassData,
        loading: schoolClassLoading
    } = useQuery(getSchoolClassForActivateClass, {
        variables: { id: query?.class_id }
    });
    const { loading: getAllYearGroupsIsLoading, error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroupsForActivateClass);
    const [schoolTeachersQuery, { loading: schoolTeachersLoading, error, data: schoolTeachers }] =
        useLazyQuery(getSchoolTeachersForActivateClass);

    const futureDate = getFutureDate(
        schoolClassData?.schoolClass?.readingLaunchDate ? schoolClassData?.schoolClass?.readingStartDay : sharedJson?.readingDays[0].key
    );

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
        schoolClassError?.message && callSnackbar(schoolClassError, 'error');
    }, [error, yearGroupError, schoolClassError]);

    const [updateSchoolClassMutation, { loading: updateClassLoading }] = useMutation(updateSchoolClassForActivateClass);

    const [moneySkillsAvailabilityQuery] = useLazyQuery(getMoneySkillsAutoScheduleAvailability, { fetchPolicy: 'no-cache' });

    /**
     * Whether to offer this class Money Skills, which is a routing decision rather than a fact about
     * the class. Named for the decision on purpose: `canAutoScheduleMoneySkills` is the API's field
     * and answers only when it is asked successfully, and a predicate borrowing that name would be
     * claiming a fact in the one case below where there is none.
     *
     * Asked of the class id alone, so the answer comes from the licences and year group the class has
     * just been given rather than from anything this page was holding beforehand. The API applies
     * every rule, which is why nothing is mirrored here: a browser-side copy of a server rule is a
     * thing to keep in step for no gain, and this one query is the whole answer.
     *
     * **A failed request answers yes, deliberately, and this is the interesting case.** It means we do
     * not know, and the two ways of being wrong are not equal. Answering no sends the leader to the
     * school overview and silently costs them a step they may well have been entitled to, with nothing
     * to tell them or us. Answering yes sends them to the Money Skills page, which asks the same
     * question of the API for itself and has a state saying the load failed, so the problem is
     * reported rather than buried. Fail open into something that can report it.
     */
    const shouldOfferMoneySkills = async (classId) => {
        try {
            const { data, error: availabilityError } = await moneySkillsAvailabilityQuery({ variables: { id: classId } });

            if (availabilityError) return true;

            return Boolean(data?.schoolClass?.canAutoScheduleMoneySkills);
        } catch {
            return true;
        }
    };

    useEffect(() => {
        if (schoolClassData?.schoolClass?.school?.id) {
            schoolTeachersQuery({ variables: { schoolId: schoolClassData?.schoolClass?.school?.id } });
        }
    }, [schoolClassData]);

    const getOtherTeachers = (mainTeacherId) => {
        return schoolTeachers?.['getSchoolTeachers']
            .filter((i) => i.id !== mainTeacherId)
            .map((teacher) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id
            }));
    };

    const getMainTeachers = (teachers) => {
        let result = [];

        if (teachers.length) {
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

    useEffect(() => {
        if (schoolClassData && ref?.current) {
            ref?.current.setValues({
                ...ref?.current.values,
                name: schoolClassData?.schoolClass?.name,
                mainTeacher: schoolClassData?.schoolClass?.mainTeacher?.id ?? '',
                teachers:
                    schoolClassData?.schoolClass?.teachers
                        ?.filter((i) => schoolClassData?.schoolClass?.mainTeacher?.id !== i.id)
                        ?.map((i) => ({ value: `${i.firstname} ${i.lastname}`, key: i.id })) ?? [],
                isReadingLogsEnabled: schoolClassData?.schoolClass?.IsReadingLogsEnabled,
                isRegistrationClass: schoolClassData?.schoolClass?.isRegistrationClass,
                readingTarget: schoolClassData?.schoolClass?.readingTarget,
                readingLaunchDate: schoolClassData?.schoolClass?.readingLaunchDate
                    ? new Date(schoolClassData?.schoolClass?.readingLaunchDate)
                    : moment(futureDate, 'DD/MM/YYYY').toDate(),
                readingStartDay: schoolClassData?.schoolClass?.readingStartDay,
                isFullProgramme: schoolClassData?.schoolClass?.isFullProgramme,
                wondeClassName: schoolClassData?.schoolClass?.importedSchoolClass?.name ?? null,
                fullProgrammeClassesAllowed: schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.fullProgramme,
                totalClassesAllowed: schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.total,
                isMoneySkillsAvailable: schoolClassData?.schoolClass?.school?.isMoneySkillsAvailable || false
            });
        }
    }, [schoolClassData]);

    useEffect(() => {
        if (yearGroups && ref?.current) {
            ref?.current?.setFieldValue(
                'yearGroup',
                yearGroups?.allYearGroup?.find((yearGroup) => yearGroup?.id === schoolClassData?.schoolClass?.yearGroup?.id)?.id ?? ''
            );
        }
    }, [yearGroups]);

    const schoolDetail = schoolClassData?.schoolClass?.school;

    const getDefaultValueForYearGroup = () => {
        // if the class is pre-admission then year group will be reception
        if (schoolClassData?.schoolClass?.isPreAdmissionClass) {
            const receptionYearGroup = getReceptionYearGroupId(yearGroups?.allYearGroup);

            return receptionYearGroup;
        }

        return yearGroups?.allYearGroup?.find((yearGroup) => yearGroup?.id === schoolClassData?.schoolClass?.yearGroup?.id)?.id ?? '';
    };

    const isFutureReadyTeddyClass = schoolClassData?.schoolClass?.period?.index > schoolClassData?.schoolClass?.school?.curentPeriod?.index;

    if (schoolTeachersLoading || getAllYearGroupsIsLoading || schoolClassLoading) return <CommonLoading />;

    return (
        <Formik
            validationSchema={activateClassValidation}
            // enableReinitialize
            innerRef={ref}
            initialValues={{
                name: schoolClassData?.schoolClass?.name,
                yearGroup: getDefaultValueForYearGroup(),
                mainTeacher: schoolClassData?.schoolClass?.mainTeacher?.id ?? '',
                teachers:
                    schoolClassData?.schoolClass?.teachers
                        ?.filter((i) => schoolClassData?.schoolClass?.mainTeacher?.id !== i.id)
                        ?.map((i) => ({ value: `${i.firstname} ${i.lastname}`, key: i.id })) ?? [],
                isReadingLogsEnabled: schoolClassData?.schoolClass?.IsReadingLogsEnabled,
                isRegistrationClass: schoolClassData?.schoolClass?.isRegistrationClass,
                /**
                 * If the class is imported, it means there is no default reading log enabled and no reading target set for the class.
                 * Therefore, we need to assign the default reading target to the class.
                 */
                readingTarget: defaultWeeklyReadingTarget(),
                readingLaunchDate: schoolClassData?.schoolClass?.readingLaunchDate
                    ? new Date(schoolClassData?.schoolClass?.readingLaunchDate)
                    : moment(futureDate, 'DD/MM/YYYY').toDate(),
                readingStartDay: schoolClassData?.schoolClass?.readingStartDay,
                isFullProgramme: schoolClassData?.schoolClass?.isFullProgramme,
                wondeClassName: schoolClassData?.schoolClass?.importedSchoolClass?.name ?? null,
                fullProgrammeClassesAllowed: schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.fullProgramme,
                totalClassesAllowed: schoolClassData?.schoolClass?.school?.remainingAllowedClassesInfo?.total,
                /**
                 * isReadyTeddy indicates whether the Ready Teddy programme is enabled for the class.
                 * By default, it is set to false for regular classes, and the teacher can manually enable the Ready Teddy programme.
                 * For pre-admission classes (which only offer the Ready Teddy programme), the value is true by default because the programme is always enabled for these classes.
                 * The checkbox for enabling the programme is disabled (non-interactive) for pre-admission classes. If the school doesn't have enough licenses for the Ready Teddy programme, the checkbox will not be visible to the teacher. This condition is checked inside the CommonProgramOption component.
                 * The value is determined by the isPreAdmissionClass flag.
                 */
                isReadyTeddy: schoolClassData?.schoolClass?.isPreAdmissionClass || false,
                isMoneySkillsAvailable: schoolClassData?.schoolClass?.school?.isMoneySkillsAvailable || false
            }}
            onSubmit={async (values) => {
                try {
                    let {
                        name,
                        yearGroup,
                        mainTeacher,
                        teachers,
                        isReadingLogsEnabled,
                        readingTarget,
                        readingStartDay,
                        isFullProgramme,
                        readingLaunchDate,
                        isReadyTeddy: isReadyTeddyProgrammeEnabled
                    } = values;

                    name = _removeWhiteSpace(name);

                    const { total } = schoolClassData.schoolClass.school.remainingAllowedClassesInfo;

                    if (isFutureReadyTeddyClass && !schoolClassData.schoolClass.school.isReadyTeddyAvailable) return;

                    if (!values?.isFullProgramme && !values?.isReadingLogsEnabled && !isReadyTeddyProgrammeEnabled) {
                        if (total !== 0 || schoolClassData.schoolClass.school.isReadyTeddyAvailable) setAlertOpen(true);
                    } else {
                        // From here on the leader is committed, and the button stays down until this
                        // page navigates away. Set before the write rather than at the top of the
                        // handler so the guards above, which leave the leader on the form, do not
                        // have to remember to clear it.
                        setIsActivating(true);

                        await updateSchoolClassMutation({
                            variables: {
                                input: {
                                    id: schoolClassData?.schoolClass?.id,
                                    name,
                                    yearGroup: yearGroup,
                                    mainTeacher,
                                    status: SchoolClassStatus.ACTIVE,
                                    teachers: (teachers || []).map((i) => i.key),
                                    isReadingLogsEnabled,
                                    readingTarget,
                                    isFullProgramme,
                                    readingStartDay,
                                    readingLaunchDate,
                                    isReadyTeddy: isReadyTeddyProgrammeEnabled
                                }
                            },
                            refetchQueries: [
                                {
                                    query: getSchoolClassesAndGroups,
                                    variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: true }
                                },
                                token?.isSchoolLeader && {
                                    query: getSchoolClassesAndGroups,
                                    variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
                                },
                                {
                                    query: getPreAdmissionClasses,
                                    variables: { schoolId: schoolClassData?.schoolClass?.school?.id }
                                }
                            ],
                            awaitRefetchQueries: true
                        });
                        callSnackbar('Class activated successfully!', 'success');
                        /**
                         * Straight into Money Skills, which is the point at which a leader is most
                         * likely to set a class's topics up for the year, but only when that page has
                         * something to offer the class it has just been given.
                         *
                         * Two questions, in cost order.
                         *
                         * The first is whether this user is a school leader, which is free. Rarely
                         * false here, because a class awaiting activation usually has no teachers to
                         * see it, but nothing enforces that and one shape of class is both inactive
                         * and teacher-assigned. See activationDestination, which owns the reasoning.
                         * It is not the API's question to answer: the field below is a fact about the
                         * class rather than about the user.
                         *
                         * The second is whether the class can be given a Money Skills sequence at all,
                         * which only the database knows and which is asked with the class's newly
                         * written licences and year group rather than anything held here.
                         *
                         * Any other class goes to the school overview, which is where it went before
                         * the auto-schedule page existed. A Ready Teddy or full programme class with a
                         * sequence of its own is no longer offered one here: it is offered one from its
                         * schedule page, and this journey belongs to Money Skills.
                         *
                         * `replace` rather than `push` on both branches, so Back from either
                         * destination does not return to the activate page of a class that is now
                         * active. On the Money Skills page it also leaves Back free to mean what that
                         * page needs it to mean, which is its own first step.
                         *
                         * The two answers meet in activationDestination, which is a route decision and
                         * nothing more: it is kept out of here so both conditions can be unit tested,
                         * and the leader check in particular cannot be dropped unnoticed.
                         */
                        // Asked only when it can change the answer, which is what keeps a teacher's
                        // activation free of it. The destination checks the same flag for itself, so
                        // this is a cost decision rather than the decision.
                        const offerMoneySkills = token?.isSchoolLeader
                            ? await shouldOfferMoneySkills(schoolClassData?.schoolClass?.id)
                            : false;

                        replace(
                            activationDestination({
                                classId: schoolClassData?.schoolClass?.id,
                                schoolId: schoolClassData?.schoolClass?.school?.id,
                                isSchoolLeader: token?.isSchoolLeader,
                                shouldOfferMoneySkills: offerMoneySkills
                            })
                        );
                    }
                } catch (error) {
                    setIsActivating(false);

                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setValues, setFieldValue }) => {
                return (
                    <div className="class-activate-container">
                        <CommonStatus
                            heading={'Activate this class'}
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala_activate_teacher.png`}
                            className="mb5"
                        />
                        <Form className={classes.form} onSubmit={(e) => e.preventDefault()}>
                            {[SchoolClassStatus.IMPORTED, SchoolClassStatus.HIDDEN].includes(schoolClassData?.schoolClass?.status) && (
                                <InputField
                                    name="wondeClassName"
                                    value={values.wondeClassName}
                                    error={errors.wondeClassName}
                                    touched={touched.wondeClassName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    disabled
                                    label={`${schoolClassData?.schoolClass?.school?.misName} class name`}
                                    type="text"
                                    md={12}
                                    lg={12}
                                />
                            )}

                            <Heading3 text={'Class details'} customClass={classes.heading} />
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
                                label={'Year group'}
                                dataTest="yearGroup"
                                options={(yearGroups?.allYearGroup || []).map((item) => ({ value: item.year, key: item.id.toString() }))}
                                value={values.yearGroup}
                                error={errors.yearGroup}
                                touched={touched.yearGroup}
                                disabled={schoolClassData?.schoolClass?.isPreAdmissionClass}
                                onChange={(e) => {
                                    handleChange({
                                        target: { name: 'yearGroup', value: e.target.value }
                                    });
                                    setFieldValue('isReadyTeddy', false);
                                }}
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'yearGroup', value: e.target.value }
                                    })
                                }
                            />
                            {!isFutureReadyTeddyClass && (
                                <Typography variant="body1">
                                    If you have a mixed year group class, we suggest selecting the lowest year group: this won&apos;t limit
                                    your options.
                                </Typography>
                            )}

                            <div className={classes.registrationCheckboxContainer}>
                                <CommonCheckBox
                                    name="isRegistrationClass"
                                    checked={values.isRegistrationClass}
                                    onBlur={handleBlur}
                                    disabled
                                    onChange={handleChange}
                                    label="This is a registration class"
                                    error={errors.isRegistrationClass}
                                    touched={touched.isRegistrationClass}
                                />

                                <CommonTooltipIcon
                                    text="Each child should have a single registration class - this is used to get their details when allocating rewards. If you have a school signup page rather than using invites, this is listed in the options for parents when signing up."
                                    customIconClass={classes.customIconClass}
                                />
                            </div>
                            <Heading3 text={'Teachers'} customClass={classes.heading} />
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
                                dataTest="activate-main-teacher-select"
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
                                dataTest="activate-other-teacher-multi-select"
                            />

                            <div className={classes.addTeacherContainer} onClick={() => setOpen(true)}>
                                <span className={classes.title}>Add a teacher who isn’t registered with Learning with Parents</span>
                                <span className={`material-icons ${classes.addBtn}`} onClick={() => setOpen(true)}>
                                    add
                                </span>
                            </div>

                            <CommonProgrammeOptions
                                values={values}
                                errors={errors}
                                touched={touched}
                                handleChange={handleChange}
                                handleBlur={handleBlur}
                                setValues={setValues}
                                classes={classes}
                                classId={schoolClassData?.schoolClass?.id}
                                schoolId={schoolDetail?.id}
                                remainingFullProgrammedClassInfo={schoolDetail?.remainingAllowedClassesInfo?.fullProgramme}
                                remainingTotalClassInfo={schoolDetail?.remainingAllowedClassesInfo?.total}
                                classDetail={schoolClassData?.schoolClass}
                                schoolDetails={schoolDetail}
                                isVisibleReadyTeddyCheckBox={
                                    values?.yearGroup && values?.yearGroup === getReceptionYearGroupId(yearGroups?.allYearGroup)
                                }
                            />

                            <div className={classes.btn_group}>
                                <LWPButton
                                    customClass={`${classes.cancleBtn} cancel_btn`}
                                    variant="text"
                                    onClick={() => push(`/school/${schoolClassData?.schoolClass?.school?.id}`)}
                                    btnText="Cancel"
                                    color="inherit"
                                />
                                {/* Loading disables the button in LWPButton, so this holds it down for
                                    the whole act: the write, then working out where to go, then the
                                    navigation itself. The mutation's own flag is kept alongside so a
                                    write that somehow begins before the state lands is still covered. */}
                                <LWPButton btnText="Activate class" loading={isActivating || updateClassLoading} onClick={handleSubmit} />
                            </div>
                        </Form>
                        {alertOpen && (
                            <Snackbar
                                open={alertOpen}
                                autoHideDuration={6000}
                                message="Note archived"
                                onClose={() => setAlertOpen(false)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                                <Alert onClose={() => setAlertOpen(false)} severity="error" sx={{ width: '100%' }}>
                                    <Paragraph>
                                        Please choose at least one of the programme options for
                                        <br /> this class
                                    </Paragraph>
                                </Alert>
                            </Snackbar>
                        )}
                        {open && (
                            <AddTeacherModal
                                open={open}
                                setOpen={() => setOpen(!open)}
                                schoolId={schoolClassData?.schoolClass?.school?.id}
                            />
                        )}
                    </div>
                );
            }}
        </Formik>
    );
};

ActivateClass.pageType = PageType.TEACHER;
ActivateClass.pageTitle = 'Class: Activate';

export default ActivateClass;
