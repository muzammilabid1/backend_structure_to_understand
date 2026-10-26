import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { adminCreateThisWeekReadingTopic, deleteSchoolClass, updateSchoolClass } from '../../../graphQl/mutations';
import { getAllYearGroups, getSchoolTeachers } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, getFutureDate, isDateSameOrInFuture, ThemeContext } from '../../../shared/Services/handler';
import { addClassFromAdminClassDetailsPageValidation } from '../../../shared/validations';
import { ReadingWeekStartDayForm } from '../../Shared/ReadingWeekStartDayForm';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonLoading from './../../Shared/CommonLoading';
import CommonMultiSelect from './../../Shared/CommonMultiSelect';
import CommonSelectField from './../../Shared/CommonSelectField';
import CommonTooltipIcon from './../../Shared/CommonTooltipIcon';
import Divider from './../../Shared/Divider';
import InputField from './../../Shared/InputField/InputField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

// Queries

const getSchoolClassForClassDetails = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            name
            classSize
            registerCount
            missingCount
            isRegistrationClass
            activeCount
            readingStartDay
            isLocked
            readingTarget
            IsReadingLogsEnabled
            readingLaunchDate
            yearGroup {
                id
                year
            }
            mainTeacher {
                id
                firstname
                lastname
                nameForChildren
            }
            teachers {
                id
                firstname
                lastname
            }
            school {
                id
                schoolName
                misName
                isWondeDataSyncedWithLwp
                curentPeriod {
                    index
                }
            }
            period {
                index
                shortName
            }
            importedSchoolClass {
                id
                name
                code
            }
            currentReadingWeek {
                id
            }
        }
    }
`;

const ClassDetails = ({ setClassName, schoolId }) => {
    const router = useRouter();

    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const [openDeleteClassModal, setOpenDeleteClassModal] = useState(false);

    const {
        loading: getSchoolClassIsLoading,
        error: getSchoolClassError,
        data: classDetails
    } = useQuery(getSchoolClassForClassDetails, {
        variables: { id: queryParams?.class_id }
    });

    const [deleteSchoolClassMutation, { loading: deleteSchoolClassLoading }] = useMutation(deleteSchoolClass);
    const [adminCreateThisWeekReadingTopicMutation, { loading: createThisWeekReadingTopicLoading }] = useMutation(
        adminCreateThisWeekReadingTopic,
        {
            refetchQueries: [{ query: getSchoolClassForClassDetails, variables: { id: queryParams?.class_id } }],
            awaitRefetchQueries: true
        }
    );
    const [getSchoolTeachersQuery, { error: getSchoolTeachersError, data: schoolTeachers }] = useLazyQuery(getSchoolTeachers);

    useEffect(() => {
        if (schoolId) {
            getSchoolTeachersQuery({
                variables: {
                    schoolId
                }
            });
        }
    }, [schoolId]);

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);

    useEffect(() => {
        if (classDetails) {
            setClassName(`${classDetails?.schoolClass?.name}`);
        }
    }, [classDetails]);

    const [updateClassDetails, { loading: updateClassDetailsIsLoading, error: updateClassDetailsError }] = useMutation(updateSchoolClass, {
        refetchQueries: [{ query: getSchoolClassForClassDetails, variables: { id: queryParams?.class_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        updateClassDetailsError?.message && callSnackbar(updateClassDetailsError, 'error');
    }, [updateClassDetailsError]);

    useEffect(() => {
        getSchoolClassError?.message && callSnackbar(getSchoolClassError, 'error');
    }, [getSchoolClassError]);

    useEffect(() => {
        getSchoolTeachersError?.message && callSnackbar(getSchoolTeachersError, 'error');
    }, [getSchoolTeachersError]);

    useEffect(() => {
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
    }, [yearGroupError]);

    if (getSchoolClassIsLoading) return <CommonLoading />;

    const getOtherTeachers = (mainTeacherId) => {
        return (schoolTeachers?.['getSchoolTeachers'] || [])
            .filter((i) => i.id !== mainTeacherId)
            .map((teacher) => ({
                value: `${teacher.firstname} ${teacher.lastname}`,
                key: teacher.id
            }));
    };

    const getMainTeachers = (teachers) => {
        let result = [];

        if (teachers?.length) {
            result = (schoolTeachers?.['getSchoolTeachers'] || [])
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

    const ifReadingLaunchDateExist = (date) => {
        if (!date) return false;

        return isDateSameOrInFuture(date);
    };

    const isToday = (day) => {
        const nextReleaseDate = getFutureDate(day);

        const nextReleaseDay = moment(nextReleaseDate).day();
        const today = moment().day();

        return nextReleaseDay === today;
    };

    return (
        <div className="class_overview">
            <Formik
                initialValues={{
                    name: classDetails?.schoolClass?.name,
                    activeCount: classDetails?.schoolClass?.activeCount,
                    missingCount: classDetails?.schoolClass?.missingCount,
                    registerCount: classDetails?.schoolClass?.registerCount,
                    isRegistrationClass: classDetails?.schoolClass?.isRegistrationClass,
                    isLocked: classDetails?.schoolClass?.isLocked,
                    yearGroup: classDetails?.schoolClass?.yearGroup?.id,
                    mainTeacher: classDetails?.schoolClass?.mainTeacher?.id,
                    teachers: classDetails?.schoolClass?.teachers
                        ?.filter((i) => classDetails?.schoolClass?.mainTeacher?.id !== i.id)
                        ?.map((i) => ({ value: `${i.firstname} ${i.lastname}`, key: i.id })),
                    academicYear: classDetails?.schoolClass?.period?.shortName,
                    schoolName: classDetails?.schoolClass?.school?.schoolName,
                    wondeSchoolClassId: classDetails?.schoolClass?.importedSchoolClass?.id,
                    wondeSchoolClassName: classDetails?.schoolClass?.importedSchoolClass?.name,
                    wondeSchoolClassCode: classDetails?.schoolClass?.importedSchoolClass?.code
                }}
                enableReinitialize
                validationSchema={addClassFromAdminClassDetailsPageValidation}
                onSubmit={async (values) => {
                    try {
                        const { name, yearGroup, mainTeacher, teachers, isLocked } = values;

                        await updateClassDetails({
                            variables: {
                                input: {
                                    id: queryParams?.class_id,
                                    name: _removeWhiteSpace(name),
                                    yearGroup: yearGroup,
                                    mainTeacher: mainTeacher,
                                    isLocked,
                                    teachers: teachers.map((i) => i?.key)
                                }
                            }
                        });
                        callSnackbar('Update Successful!', 'success');
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
                        <Form className="mt10">
                            <InputField
                                md={4}
                                lg={4}
                                label="Class name"
                                value={values.name}
                                name="name"
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.name}
                                touched={touched.name}
                            />
                            <InputField md={4} lg={4} label="Active count" value={values.activeCount} disabled />
                            <InputField md={4} lg={4} label="Missing count" value={values.missingCount} disabled />
                            <InputField md={4} lg={4} label="Register count" value={values.registerCount} disabled />
                            <CommonSelectField
                                md={4}
                                lg={4}
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
                                md={4}
                                lg={4}
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
                                md={4}
                                lg={4}
                                options={getOtherTeachers(values.mainTeacher)}
                                value={values.teachers}
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
                            <InputField md={4} lg={4} label="Academic Year" value={values.academicYear} disabled />
                            <InputField md={4} lg={4} label="School Name" value={values.schoolName} disabled />
                            <InputField md={4} lg={4} label="wonde school id" value={values.wondeSchoolId || 'none'} disabled />
                            <InputField md={4} lg={4} label="wonde school name" value={values.wondeSchoolName || 'none'} disabled />
                            <InputField md={4} lg={4} label="wonde school subject" value={values.wondeSchoolSubject || 'none'} disabled />
                            <InputField md={4} lg={4} label="wonde school code" value={values.wondeSchoolCode || 'none'} disabled />
                            <div className="admin-lock">
                                <CommonCheckBox
                                    name="isLocked"
                                    checked={values.isLocked}
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    label="Lock this class"
                                    error={errors.isLocked}
                                    touched={touched.isLocked}
                                />
                                <CommonTooltipIcon
                                    customIconClass={'admin-lock-class-icon'}
                                    text="When the class is locked, pupils cannot be added to the class, and the class does not appear in the 'school signup' page if there is one."
                                />
                            </div>
                            <LWPButton btnText="Update details" loading={updateClassDetailsIsLoading} onClick={handleSubmit} />
                        </Form>
                    );
                }}
            </Formik>
            {!ifReadingLaunchDateExist(classDetails?.schoolClass?.readingLaunchDate) &&
                !isToday(classDetails?.schoolClass?.readingStartDay) &&
                classDetails?.schoolClass?.IsReadingLogsEnabled &&
                !classDetails?.schoolClass?.currentReadingWeek && (
                    <>
                        <Divider customClass="mtb-20" />
                        <Heading2 text="Reading Topics" />
                        <br />
                        <LWPButton
                            btnText={`Create this week reading topic`}
                            onClick={() => {
                                adminCreateThisWeekReadingTopicMutation({
                                    variables: {
                                        classId: queryParams?.class_id
                                    }
                                })
                                    .then(() => {
                                        callSnackbar('Class reading topics released successfully!', 'success');
                                    })
                                    .catch(({ ...err }) => callSnackbar(err, 'error'));
                            }}
                            loading={createThisWeekReadingTopicLoading}
                        />
                    </>
                )}
            <Divider customClass="mtb-20" />
            <div>
                <Heading2 text={'Reading week'} />

                <ReadingWeekStartDayForm
                    classId={queryParams?.class_id}
                    currentReadingLaunchDate={classDetails.schoolClass?.readingLaunchDate}
                />
            </div>
            <Divider customClass="mtb-20" />
            <div className="delete-class">
                <Heading2 text={'Delete School Class'} />
                <LWPButton
                    customClass="mb-10"
                    btnText={'Delete School Class'}
                    onClick={() => setOpenDeleteClassModal(!openDeleteClassModal)}
                />
            </div>
            {openDeleteClassModal && (
                <ConfirmationModal
                    open={openDeleteClassModal}
                    onCancel={() => setOpenDeleteClassModal(!openDeleteClassModal)}
                    loading={deleteSchoolClassLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteSchoolClassMutation({
                            variables: {
                                id: queryParams?.class_id
                            }
                        })
                            .then(() => {
                                setOpenDeleteClassModal(!openDeleteClassModal);
                                callSnackbar('Class deleted!', 'success');
                                router?.push(`/admin/school/${schoolId}`);
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteClassModal(!openDeleteClassModal);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the school class." />
                </ConfirmationModal>
            )}
        </div>
    );
};

ClassDetails.propTypes = {
    setClassName: PropTypes.func,
    schoolId: PropTypes.number
};

export default ClassDetails;
