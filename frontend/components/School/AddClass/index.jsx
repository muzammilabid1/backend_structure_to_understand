import { gql, useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Alert, Snackbar } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Form, Formik } from 'formik';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { createSchoolClass } from '../../../graphQl/mutations';
import {
    getAllYearGroups,
    getPreAdmissionClasses,
    getSchoolClasses,
    getSchoolClassesAndGroups,
    getSchoolForClass,
    getSchoolTeachers
} from '../../../graphQl/queries';
import { ADMIN, MINIO_PUBLIC_PATHS, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import sharedJson from '../../../shared/json/index.json';
import {
    _removeWhiteSpace,
    defaultWeeklyReadingTarget,
    getFutureDate,
    getReceptionYearGroupId,
    ThemeContext
} from '../../../shared/Services/handler';
import { addClassValidation } from '../../../shared/validations';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonProgrammeOptions from '../../Shared/CommonProgrammeOptions';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonLoading from './../../Shared/CommonLoading';
import CommonMultiSelect from './../../Shared/CommonMultiSelect';
import CommonSelectField from './../../Shared/CommonSelectField';
import CommonStatus from './../../Shared/CommonStatus';
import InputField from './../../Shared/InputField/InputField';
import AddTeacherModal from './../../Shared/Modals/AddTeacher';
import Heading3 from './../../Shared/Typography/Heading3';
import Paragraph from './../../Shared/Typography/Paragraph';

const getCurrentAndFutureStaticPeriods = gql`
    query getCurrentAndFutureStaticPeriods {
        getCurrentAndFutureStaticPeriods {
            index
            longName
        }
    }
`;

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
        marginTop: 34,
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
        marginBottom: 18
    },
    registrationCheckboxContainer: {
        display: 'flex',
        alignItems: 'center',
        marginTop: '22px',
        marginBottom: '10px'
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

const AddClass = () => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar, token } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);

    const futureDate = getFutureDate(sharedJson?.readingDays[0].key);
    const ref = useRef();
    const [isFormMounted, setIsFormMounted] = useState(false);
    const isAdminSide = searchParams.get('adminView') === 'true' && token?.userType === ADMIN;
    const isFutureReadyTeddyClass = searchParams.get('future-ready-teddy-class') === 'true';

    const classes = useStyles();

    const {
        loading: getSchoolTeachersIsLoading,
        error,
        data: schoolTeachers
    } = useQuery(getSchoolTeachers, {
        variables: { schoolId: queryParams?.school_id }
    });

    const { loading: getAllYearGroupsIsLoading, error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);

    const {
        loading: schoolLoading,
        error: schoolError,
        data: schoolData
    } = useQuery(getSchoolForClass, { variables: { id: queryParams?.school_id } });

    const {
        error: staticPeriodsError,
        data: staticPeriodsData,
        loading: staticPeriodsLoading
    } = useQuery(getCurrentAndFutureStaticPeriods, { skip: !isAdminSide });

    useEffect(() => {
        if (schoolData && ref?.current) {
            ref.current.setValues({
                ...ref.current.values,
                periodId: schoolData?.['getSchool']?.curentPeriod?.index ?? '',
                fullProgrammeClassesAllowed: schoolData?.['getSchool']?.remainingAllowedClassesInfo?.fullProgramme,
                totalClassesAllowed: schoolData?.['getSchool']?.remainingAllowedClassesInfo?.total,
                isMoneySkillsAvailable: schoolData?.['getSchool']?.isMoneySkillsAvailable ?? false
            });
        }
    }, [schoolData, isFormMounted]);

    useEffect(() => {
        if (isFutureReadyTeddyClass && ref?.current && yearGroups && schoolData) {
            ref.current.setValues({
                ...ref.current.values,
                yearGroup: getReceptionYearGroupId(yearGroups?.allYearGroup),
                periodId: schoolData?.['getSchool']?.nextPeriod?.index ?? '',
                isReadyTeddy: true
            });
        }
    }, [yearGroups, schoolData, isFutureReadyTeddyClass, isFormMounted]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
        schoolError?.message && callSnackbar(schoolError, 'error');
        staticPeriodsError?.message && callSnackbar(staticPeriodsError, 'error');
    }, [error, yearGroupError, schoolError, staticPeriodsError]);

    const [addClass, { loading }] = useMutation(createSchoolClass, {
        refetchQueries: [
            { query: getSchoolClasses, variables: { schoolId: queryParams?.school_id } },
            { query: getSchoolClassesAndGroups, variables: { schoolId: queryParams?.school_id, myClasses: true } },
            token?.isSchoolLeader && {
                query: getSchoolClassesAndGroups,
                variables: { schoolId: queryParams?.school_id, myClasses: false }
            },
            { query: getPreAdmissionClasses, variables: { schoolId: queryParams?.school_id } }
        ],
        awaitRefetchQueries: true
    });

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
                    key: teacher.id,
                    dataTest: `main-teacher-select-option`
                }));
        } else {
            result = (schoolTeachers?.['getSchoolTeachers'] || []).map((teacher, index) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id,
                dataTest: `main-teacher-select-option`
            }));
        }

        return result;
    };

    const isReceptionYearGroup = (yearGroupId) => {
        return yearGroupId === getReceptionYearGroupId(yearGroups?.allYearGroup);
    };

    const handleSelectPeriod = (e) => {
        ref.current.setValues({
            ...ref.current.values,
            isReadyTeddy:
                e.target.value > schoolData?.['getSchool']?.curentPeriod?.index && isReceptionYearGroup(ref.current.values?.yearGroup),
            isFullProgramme: false,
            isReadingLogsEnabled: false,
            periodId: e.target.value
        });
    };

    if (getSchoolTeachersIsLoading || getAllYearGroupsIsLoading || staticPeriodsLoading || schoolLoading) return <CommonLoading />;

    return (
        <Formik
            innerRef={(r) => {
                ref.current = r;
                if (r && !isFormMounted) setIsFormMounted(true);
            }}
            validationSchema={addClassValidation}
            initialValues={{
                ...formInitialStates['addClass'],
                readingTarget: defaultWeeklyReadingTarget(),
                readingStartDay: +sharedJson?.readingDays[0].key,
                readingLaunchDate: moment(futureDate, 'DD/MM/YYYY').toDate(),
                periodId: schoolData?.['getSchool']?.curentPeriod?.index ?? '',
                inheritClassId: null,
                fullProgrammeClassesAllowed: schoolData?.['getSchool']?.fullProgrammeClassesAllowed ?? 0,
                totalClassesAllowed: schoolData?.['getSchool']?.numOfTotalClassesAllowed ?? 0,
                inactive: false,
                isMoneySkillsAvailable: schoolData?.['getSchool']?.isMoneySkillsAvailable ?? false
            }}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let {
                        name,
                        yearGroup,
                        mainTeacher,
                        teachers,
                        isReadingLogsEnabled,
                        isFullProgramme,
                        periodId,
                        inheritClassId,
                        readingTarget,
                        readingStartDay,
                        isRegistrationClass,
                        readingLaunchDate,
                        isReadyTeddy,
                        inactive
                    } = values;

                    name = _removeWhiteSpace(name);
                    const { total } = schoolData.getSchool.remainingAllowedClassesInfo;

                    if (schoolData?.getSchool?.curentPeriod?.index < periodId && !schoolData.getSchool.isReadyTeddyAvailable) return;

                    if (!isFullProgramme && !isReadingLogsEnabled && !isReadyTeddy) {
                        if (total !== 0 || schoolData.getSchool.isReadyTeddyAvailable) setAlertOpen(true);

                        return;
                    }

                    await addClass({
                        variables: {
                            input: {
                                name,
                                yearGroup: yearGroup,
                                schoolId: queryParams?.school_id,
                                mainTeacher: mainTeacher,
                                periodId: isAdminSide || isFutureReadyTeddyClass ? periodId : null,
                                readingTarget,
                                readingStartDay,
                                lastYearsInheritedClassId: inheritClassId,
                                teachers: (teachers || []).map((i) => i.key),
                                isReadingLogsEnabled,
                                isFullProgramme,
                                isRegistrationClass,
                                readingLaunchDate,
                                isReadyTeddy,
                                status:
                                    isAdminSide && periodId > schoolData?.['getSchool']?.curentPeriod?.index && inactive ? 'INACTIVE' : null
                            }
                        }
                    });
                    resetForm({ values: '' });
                    callSnackbar('A new class has been added', 'success');
                    if (isAdminSide) {
                        router?.push({ pathname: '/admin/school/[schoolId]', query: { schoolId: queryParams?.school_id } });
                    } else {
                        router?.push(`/school/${queryParams?.school_id}`);
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
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setValues }) => {
                return (
                    <div className="add-class-page">
                        <CommonStatus
                            heading={'Create a new class'}
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala_activate_teacher.png`}
                            className="mb5"
                        />
                        <Form className={classes.form} onSubmit={(e) => e.preventDefault()}>
                            <Heading3 text={'General'} customClass={classes.heading} />
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
                                dataTest={'add-class-name-input'}
                            />
                            <CommonSelectField
                                label={'Year group'}
                                options={(yearGroups?.allYearGroup || []).map((item) => ({
                                    value: item.year,
                                    key: item.id.toString(),
                                    dataTest: `add-class-select-option-${item.year}`
                                }))}
                                value={values.yearGroup}
                                error={errors.yearGroup}
                                touched={touched.yearGroup}
                                onChange={(e) => {
                                    const isReceptionClass = isReceptionYearGroup(e.target.value);
                                    const isFutureAcademicYear = values?.periodId > schoolData?.['getSchool']?.curentPeriod?.index;

                                    setValues({
                                        ...values,
                                        yearGroup: e.target.value,
                                        isReadyTeddy: (isReceptionClass && isFutureAcademicYear) || false
                                    });
                                }}
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'yearGroup', value: e.target.value }
                                    })
                                }
                                disabled={isFutureReadyTeddyClass}
                                dataTest={'add-class-year-group-select'}
                            />

                            {isAdminSide ? (
                                <>
                                    {values?.periodId > schoolData?.['getSchool']?.curentPeriod?.index ? (
                                        <CommonCheckBox
                                            name="inactive"
                                            checked={values.inactive}
                                            onBlur={handleBlur}
                                            onChange={handleChange}
                                            label="Create class as inactive"
                                            error={errors.inactive}
                                            touched={touched.inactive}
                                        />
                                    ) : null}

                                    <Heading3 text={'Academic year'} customClass={classes.heading} />

                                    <CommonSelectField
                                        label={'Academic year'}
                                        options={(staticPeriodsData?.getCurrentAndFutureStaticPeriods || []).map((item) => ({
                                            value: item.longName,
                                            key: item.index,
                                            dataTest: ``
                                        }))}
                                        value={values.periodId}
                                        error={errors.periodId}
                                        touched={touched.periodId}
                                        onChange={handleSelectPeriod}
                                        onBlur={handleSelectPeriod}
                                        dataTest={'add-class-academic-year-select'}
                                    />
                                </>
                            ) : null}

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
                                dataTest={'add-class-main-teacher-select'}
                            />
                            <CommonMultiSelect
                                label="Other teachers"
                                options={getOtherTeachers(values.mainTeacher)}
                                value={values.teachers}
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
                            <div className={classes.addTeacherContainer} onClick={() => setOpen(true)}>
                                <span className={classes.title}>Add a teacher who isn’t registered with Learning with Parents</span>
                                <span className={`material-icons ${classes.addBtn}`}>add</span>
                            </div>
                            <CommonProgrammeOptions
                                values={values}
                                errors={errors}
                                touched={touched}
                                handleChange={handleChange}
                                handleBlur={handleBlur}
                                setValues={setValues}
                                classes={classes}
                                schoolId={schoolData?.['getSchool']?.id}
                                remainingFullProgrammedClassInfo={schoolData?.['getSchool']?.remainingAllowedClassesInfo?.fullProgramme}
                                remainingTotalClassInfo={schoolData?.['getSchool']?.remainingAllowedClassesInfo?.total}
                                schoolDetails={schoolData?.['getSchool']}
                                isVisibleReadyTeddyCheckBox={
                                    values?.yearGroup && values?.yearGroup === getReceptionYearGroupId(yearGroups?.allYearGroup)
                                }
                                isAdminSide={isAdminSide}
                            />
                            <div className={classes.btn_group}>
                                <LWPButton
                                    customClass={`${classes.cancleBtn} cancel_btn`}
                                    variant="text"
                                    onClick={() => router?.push(`/school/${queryParams?.school_id}`)}
                                    btnText="Cancel"
                                    color="inherit"
                                />
                                <LWPButton
                                    btnText="Create class"
                                    loading={loading}
                                    onClick={handleSubmit}
                                    dataTest={'add-class-submit-button'}
                                />
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
                                        {
                                            // The "Ready Teddy" checkbox is visible only when the year group is Reception. If a future academic year is selected and a year group other than Reception is chosen, the "Ready Teddy" checkbox will not appear. In this case, we need to prompt the user to select the Reception year group.
                                        }
                                        {values?.periodId > schoolData?.['getSchool']?.curentPeriod?.index &&
                                        !isReceptionYearGroup(values?.yearGroup)
                                            ? 'Please select the "Reception" year group for future year classes'
                                            : 'Please choose at least one of the programme options for this class'}
                                    </Paragraph>
                                </Alert>
                            </Snackbar>
                        )}
                        {open && <AddTeacherModal open={open} setOpen={() => setOpen(!open)} schoolId={queryParams?.school_id} />}
                    </div>
                );
            }}
        </Formik>
    );
};

export default AddClass;
