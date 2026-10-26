import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Alert } from '@mui/material';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import {
    getGroupsAcrossClasses,
    getSchoolClassesAndGroups,
    getSchoolClassForClassDetailsPage,
    getSchoolTeachers
} from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { capitalizeFirstLetter, ThemeContext } from '../../../shared/Services/handler';
import { classGroupSettingsValidation } from '../../../shared/validations';
import { ILwpSchoolClassDetails } from '../../../types/ILwpSchoolClass';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from '../../Shared/CommonLoading';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonNavTabs from '../../Shared/CommonNavTabs';
import CommonSelectField from '../../Shared/CommonSelectField';
import InputField from '../../Shared/InputField/InputField';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading3 from '../../Shared/Typography/Heading3';
import Paragraph from '../../Shared/Typography/Paragraph';
import ClassHeader from '../ClassHeader';

// mutation
const updateGroupWithinSchoolClass = gql`
    mutation updateGroupWithinSchoolClass($input: UpdateGroupWithinSchoolClassInput!) {
        updateGroupWithinSchoolClass(input: $input) {
            id
        }
    }
`;

const deleteSchoolClass = gql`
    mutation deleteSchoolClass($id: String!) {
        deleteSchoolClass(id: $id) {
            status
            msg
        }
    }
`;

const inviteImportedTeachers = gql`
    mutation inviteImportedTeachers($ids: [String!]!, $schoolId: String!) {
        inviteImportedTeachers(ids: $ids, schoolId: $schoolId)
    }
`;

interface ClassGroupsSettingProps {
    schoolClassData: { schoolClass: ILwpSchoolClassDetails };
}

const ClassGroupsSetting = ({ schoolClassData }: ClassGroupsSettingProps) => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();

    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const filterTeachers = schoolClassData?.schoolClass?.teachers?.filter((teacher) => teacher?.userStatus === 'IMPORTED');

    const [schoolTeachersQuery, { loading: schoolTeachersLoading, error, data: schoolTeachers }] = useLazyQuery(getSchoolTeachers);
    const [updateGroupWithinSchoolClassMutation, { loading: updateGroupWithinSchoolClassLoading }] = useMutation(
        updateGroupWithinSchoolClass,
        {
            refetchQueries: [
                { query: getSchoolClassForClassDetailsPage, variables: { id: queryParams?.class_id } },
                { query: getSchoolClassesAndGroups, variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: true } },
                token?.isSchoolLeader && {
                    query: getSchoolClassesAndGroups,
                    variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
                }
            ],

            awaitRefetchQueries: true
        }
    );
    const [inviteImportedTeachersMutation] = useMutation(inviteImportedTeachers, {
        refetchQueries: [{ query: getSchoolClassForClassDetailsPage, variables: { id: queryParams?.class_id } }],
        awaitRefetchQueries: true
    });
    const [deleteSchoolClassMutation, { loading: deleteSchoolClassLoading }] = useMutation(deleteSchoolClass);

    useEffect(() => {
        if (schoolClassData?.schoolClass?.school?.id) {
            schoolTeachersQuery({ variables: { schoolId: schoolClassData?.schoolClass?.school?.id } });
        }
    }, [schoolClassData]);

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
    }, [error]);

    const getMainTeachers = (otherteachers) => {
        const schoolTeachersList = schoolTeachers?.['getSchoolTeachers'] || [];

        const result = otherteachers?.length
            ? schoolTeachersList.filter((i) => !otherteachers?.some((j) => j.key === i.id))
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
        try {
            const payload = {
                groupId: queryParams?.class_id,
                name: values?.groupName,
                mainTeacher: values?.mainTeacher,
                teacherIds: values?.otherteachers?.map((t) => t.key)
            };

            await updateGroupWithinSchoolClassMutation({ variables: { input: payload } });
            callSnackbar('Settings updated', 'success');
        } catch (error) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError(error, { caught: true, handled: false });
                callSnackbar(unexpectedError, 'error');
            }
        }
    };

    const filterSkipGroup = (value) => {
        return value.map((t) => capitalizeFirstLetter(t?.name)).join(' and ');
    };

    const onInviteHandler = async () => {
        try {
            const payload = { ids: filterTeachers?.map((teacher) => teacher?.id), schoolId: token?.schoolId };

            await inviteImportedTeachersMutation({
                variables: payload
            });
            callSnackbar('Invite sent', 'success');
        } catch (error) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError(error, { caught: true, handled: false });
                callSnackbar(unexpectedError, 'error');
            }
        }
    };

    const getAlertText = (subjects) => {
        const subject = filterSkipGroup(subjects);

        return schoolClassData?.schoolClass?.skipGroupPupils
            ? `These pupils will be set ${subject} topics in this group instead of the ones set for their registration class. (They will not be sent the ${subject} topics set for the registration class.)`
            : `These pupils will be set additional ${subject} topics, and will be asked to complete topics set for their registration class as well as topics set for this group.`;
    };

    const allSubjectsAreReading = schoolClassData?.schoolClass?.IsReadingLogsEnabled && !schoolClassData?.schoolClass.subjects?.length;

    if (schoolTeachersLoading) return <CommonLoading />;

    return (
        <div className="class_details">
            <Formik
                validationSchema={classGroupSettingsValidation}
                enableReinitialize
                initialValues={{
                    groupName: schoolClassData?.schoolClass?.name,
                    mainTeacher: schoolClassData?.schoolClass?.mainTeacher?.id,
                    otherteachers: schoolClassData?.schoolClass?.teachers
                        ?.filter((teacher) => teacher.id !== schoolClassData?.schoolClass?.mainTeacher?.id)
                        ?.map((t) => ({
                            value: `${t.firstname} ${t.lastname}`,
                            key: t.id
                        }))
                }}
                onSubmit={handleOnSubmit}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
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
                                    {!schoolClassData?.schoolClass?.isGroupAcrossClasses && (
                                        <InputField
                                            label={'Class'}
                                            value={schoolClassData?.schoolClass?.parentClass?.name}
                                            type="text"
                                            disabled
                                        />
                                    )}

                                    <Heading3 text={'Group details'} customClass={'general-heading'} />
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

                                    {!allSubjectsAreReading && !schoolClassData?.schoolClass?.isGroupAcrossClasses ? (
                                        schoolClassData?.schoolClass?.skipGroupPupils ? (
                                            <Alert severity="info" variant="outlined" className="custom-alert-skip-pupil">
                                                <Paragraph text={getAlertText(schoolClassData?.schoolClass.subjects)} />
                                            </Alert>
                                        ) : (
                                            <Alert severity="info" variant="outlined" className="custom-alert-skip-pupil">
                                                <Paragraph text={getAlertText(schoolClassData?.schoolClass.subjects)} />
                                            </Alert>
                                        )
                                    ) : null}

                                    <Heading3 text={'Teachers'} customClass="teacher-heading" />
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

                                    {!!filterTeachers?.length && token?.isSchoolLeader && (
                                        <Alert severity="info">
                                            <Paragraph text="Some of these teachers have not been invited to use the Learning with Parents platform yet so they will not be able to log in. " />

                                            <div className="invite_them_now" onClick={onInviteHandler}>
                                                <span className="material-icons">mail</span>
                                                <Paragraph text="Invite them now" />
                                            </div>
                                        </Alert>
                                    )}

                                    <div className="update_buttons">
                                        <LWPButton btnText="Update" loading={updateGroupWithinSchoolClassLoading} onClick={handleSubmit} />
                                        <LWPButton
                                            btnText="Delete group"
                                            variant="contained"
                                            color="error"
                                            onClick={() => setOpenDeleteItemConfirmationModal(true)}
                                            style={{ color: 'black' }}
                                        />
                                    </div>
                                </div>
                            </Form>
                        </>
                    );
                }}
            </Formik>
            <ConfirmationModal
                open={openDeleteItemConfirmationModal}
                onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                loading={deleteSchoolClassLoading}
                onConfirm={() => {
                    deleteSchoolClassMutation({
                        variables: { id: queryParams?.class_id },
                        refetchQueries: [
                            {
                                query: schoolClassData?.schoolClass?.isGroupAcrossClasses
                                    ? getGroupsAcrossClasses
                                    : getSchoolClassesAndGroups,
                                variables: { schoolId: schoolClassData?.schoolClass?.school?.id, myClasses: false }
                            }
                        ],
                        awaitRefetchQueries: true
                    })
                        .then(() => {
                            callSnackbar('Group deleted', 'success');
                            setOpenDeleteItemConfirmationModal(false);

                            if (schoolClassData?.schoolClass?.isGroupAcrossClasses || !token?.isSchoolLeader) {
                                router?.push(`/`);
                            } else {
                                router?.push(`/class/${schoolClassData?.schoolClass?.parentClass?.id}/class-groups`);
                            }
                        })
                        .catch((error) => {
                            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                            if (statusCode) {
                                callSnackbar(error, 'error');
                            } else {
                                window.newrelic?.noticeError(error, { caught: true, handled: false });
                                callSnackbar(unexpectedError, 'error');
                            }

                            setOpenDeleteItemConfirmationModal(false);
                        });
                }}
            />
        </div>
    );
};

export default ClassGroupsSetting;
