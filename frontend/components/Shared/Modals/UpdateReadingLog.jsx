import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Card, FormControl, FormControlLabel, Grid, Radio, RadioGroup } from '@mui/material';
import { Formik } from 'formik';
import { debounce } from 'lodash';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import ReadingLogForTeacher from '../../../components/Parent/ReadingLogForTeacher';
import { getClassesAndGroupsInfoOfPupils } from '../../../graphQl/queries';
import { ADMIN, formIncompleteWarning, PARENT, TEACHER, unexpectedError } from '../../../shared/Constant';
import { useSavingLock } from '../../../shared/hooks/useSavingLock';
import {
    checkPupilsNameExistInDescription,
    getHtml,
    handleErrorSnackbar,
    refetchQueriesAfterUpdateOrDeleteFeedback,
    ThemeContext,
    viewByTeacherOrParent,
    matchBooks
} from '../../../shared/Services/handler';
import { readingLogValidationForParent, updateReadingLogValidationForTeacher } from '../../../shared/validations';
import MultiSelect from '../../Class/ClassReading/MultiSelect';
import CountTowardsReadingTarget from '../../Class/ClassReading/ReadingGroup/CountTowardsReadingTarget';
import ReadingLogForParent from '../../Parent/ReadingLogForParent';
import CommonLoading from '../CommonLoading';
import PermissionCheckboxes from '../PermissionCheckboxes';
import SelectLoggedBookName from '../SelectLoggedBookName';
import Paragraph from '../Typography/Paragraph';
import LWPButton from './../Button/LWPButton';
import DialogWrapper from './../DialogWrapper';
import InputField from './../InputField/InputField';
import ConfirmationModal from './ConfirmationModal';
import { ReadingBookOptions, ReadingMode } from 'lwp-shared';

const GET_PUPIL_BOOKS = gql`
    query getPupilBooks($pupilId: String!) {
        getPupilBooks(pupilId: $pupilId) {
            bookName
            isBookFinished
            pageNumber
            readingType
        }
    }
`;

const getFeedBackByIdGQL = gql`
    query getFeedBackById($feedbackId: String!) {
        getFeedBackById(feedbackId: $feedbackId) {
            id
            bookName
            bookReadAt
            isBookFinished
            includeInReadingTarget
            pageNumber
            comment
            sharingAllowed
            privateNote
            readingType
            readingMode
            className
            isFeedbackForMultipleClasses
            audios {
                id
                filename
            }
            photos {
                id
                filename
            }
            pupilCount
            pupils {
                id
                fullname
                currentClass {
                    id
                    name
                    yearGroup {
                        year
                    }
                }
            }
            school {
                id
                parentFeedbackTickFeatureEnabledAt
                isParentFeedbackReplyFeatureEnabled
                isParentFeedbackStickerFeatureEnabled
                organisations
                privacyPolicy
                enableBookNameOnlyReadingLog
            }
        }
    }
`;

const getSchoolClassesAndGroupsGQL = gql`
    query getSchoolClassesAndGroups($schoolId: String!, $myClasses: Boolean!) {
        getSchoolClassesAndGroups(schoolId: $schoolId, myClasses: $myClasses) {
            id
            isMyClass
            groups {
                id
                isMyGroup
            }
        }
    }
`;

const updateReadingLogMutationGQL = gql`
    mutation updateReadingLog($input: UpdateReadingLogInput!) {
        updateReadingLog(input: $input) {
            id
            bookName
            bookReadAt
            isBookFinished
            includeInReadingTarget
            pageNumber
            comment
            sharingAllowed
            privateNote
            userType
            type
            readingType
            readingMode
            audios {
                filename
            }
            photos {
                id
                filename
            }
            pupilCount
            pupils {
                id
            }
            school {
                id
                parentFeedbackTickFeatureEnabledAt
                isParentFeedbackReplyFeatureEnabled
                isParentFeedbackStickerFeatureEnabled
                organisations
                privacyPolicy
                enableBookNameOnlyReadingLog
            }
            lastAction {
                updatedAt
            }
        }
    }
`;

const updateReadingLogAsGroupMutationGQL = gql`
    mutation updateReadingLogAsGroup($input: UpdateReadingLogAsGroupInput!) {
        updateReadingLogAsGroup(input: $input) {
            id
            bookName
            isBookFinished
            includeInReadingTarget
            pageNumber
            comment
            sharingAllowed
            privateNote
            readingType
            readingMode
            bookReadAt
            userType
            type
            audios {
                filename
            }
            photos {
                id
                filename
            }
            pupilCount
            pupils {
                id
            }
            school {
                id
                parentFeedbackTickFeatureEnabledAt
                isParentFeedbackReplyFeatureEnabled
                isParentFeedbackStickerFeatureEnabled
                organisations
                privacyPolicy
                enableBookNameOnlyReadingLog
            }
            lastAction {
                updatedAt
            }
        }
    }
`;

export const getUserForReadingLog = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            type
            sharingAllowed
            nameForChildren
            showInterstitial {
                id
                optedOut
            }
        }
    }
`;

const getParameterByKeyForReadingLog = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

const UpdateReadingLog = ({ open, setOpen, selectedFeedbackId, onReadingLogUpdate }) => {
    const { callSnackbar, token, userId } = useContext(ThemeContext);
    const { isSaving, hasSavingLock, setSavingLock } = useSavingLock();
    const [, setFileName] = useState(null);
    const [showPhotoPermission, setShowPhotoPermission] = useState(true);
    const [permissionParam, setPermissionParam] = useState(null);
    const [loading, setLoading] = useState(false);
    const [visibleConfirmationModal, setVisibleConfirmationModal] = useState(false);
    const [pupilBooks, setPupilBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);

    const queryParams = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const topicId = searchParams.get('topicId');

    const { loading: getPermissionParameterLoading, data: permissionParameter } = useQuery(getParameterByKeyForReadingLog, {
        variables: { key: 'COMMENT_PHOTO_PERMISSIONS' },
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        if (permissionParameter?.getParameterByKey?.value) {
            setPermissionParam(JSON.parse(permissionParameter?.getParameterByKey?.value));
        }
    }, [permissionParameter]);

    const { error: getUserError, data: user } = useQuery(getUserForReadingLog, {
        variables: { id: userId },
        skip: !userId,
        fetchPolicy: 'cache-first'
    });

    // Fetch feedback data
    const {
        data: feedbackData,
        loading: feedbackLoading,
        error: feedbackError
    } = useQuery(getFeedBackByIdGQL, {
        variables: { feedbackId: selectedFeedbackId },
        skip: !selectedFeedbackId
    });

    const [
        getClassesAndGroupsInfoOfPupilsQuery,
        { data: getClassesAndGroupsInfoOfPupilsData, error: getClassesAndGroupsInfoOfPupilsError }
    ] = useLazyQuery(getClassesAndGroupsInfoOfPupils);

    const [getSchoolClassesAndGroupsQuery, { data: getSchoolClassesData, error: getSchoolClassesError }] =
        useLazyQuery(getSchoolClassesAndGroupsGQL);

    const [updateReadingLogMutation] = useMutation(updateReadingLogMutationGQL);

    const [updateReadingLogAsGroupMutation] = useMutation(updateReadingLogAsGroupMutationGQL);

    const viewByTeacher = viewByTeacherOrParent(router) === TEACHER;
    const viewByParent = viewByTeacherOrParent(router) === PARENT;

    /**
     * Memoize selected feedback for better referential stability.
     */
    const selectedFeedback = useMemo(() => feedbackData?.getFeedBackById, [feedbackData?.getFeedBackById]);

    /**
     * If parent is on pupil's reading log page then pupild id get from query params, that time "pupils" is not accessible by parent beacuse parent can only see his/her child's reading log.
     * And for teacher sometime did'nt get pupilId from query params so in that case we can get pupilId from selectedFeedback. Like in reading week by week page or activity feed page.
     */
    const pupilId =
        queryParams?.child_id || queryParams?.pupil_id || (selectedFeedback?.pupilCount === 1 ? selectedFeedback?.pupils?.[0]?.id : null);

    const [getPupilBooksQuery, { data: pupilBooksData, loading: pupilBooksLoading, error: pupilBooksError }] = useLazyQuery(
        GET_PUPIL_BOOKS,
        {
            skip: !(viewByTeacher && pupilId && selectedFeedback?.pupilCount === 1)
        }
    );

    /**
     * Handle and display any GraphQL/network errors.
     */
    useEffect(() => {
        handleErrorSnackbar(feedbackError, callSnackbar);
        handleErrorSnackbar(getClassesAndGroupsInfoOfPupilsError, callSnackbar);
        handleErrorSnackbar(getSchoolClassesError, callSnackbar);
        handleErrorSnackbar(getUserError, callSnackbar);
        handleErrorSnackbar(pupilBooksError, callSnackbar);
    }, [feedbackError, getClassesAndGroupsInfoOfPupilsError, getSchoolClassesError, callSnackbar, getUserError, pupilBooksError]);

    /**
     * feedbackData effect: if we have a single-pupil reading log,
     * fetch that pupil's recent reading logs.
     * Also fetch classes/groups if there's a school ID.
     */
    useEffect(() => {
        if (!feedbackData?.getFeedBackById) return;

        const feedback = feedbackData.getFeedBackById;
        const pupilCount = feedback?.pupilCount ?? 0;

        // For single-pupil scenarios
        if (pupilCount === 1 && viewByTeacher && pupilId && !pupilBooksData) {
            getPupilBooksQuery({
                variables: { pupilId },
                fetchPolicy: 'cache-first'
            });
        }

        if (pupilBooksData?.getPupilBooks && pupilCount === 1) {
            const books = pupilBooksData.getPupilBooks;
            setPupilBooks(books);

            if (feedback?.bookName) {
                const matchedBooks = matchBooks(books, feedback.bookName, ReadingBookOptions.SCHOOL_BOOK);
                setFilteredBooks(matchedBooks);
            }
        }

        // For any reading log with a valid school, fetch class & group info
        if (pupilCount > 1 && feedback?.school?.id) {
            getClassesAndGroupsInfoOfPupilsQuery({
                variables: { schoolId: feedback.school.id, readingOnly: true }
            });
            /**
             * If user is not school leader then fetch only my classes and groups.
             * If user is school leader or admin then fetch all classes and groups.
             */
            getSchoolClassesAndGroupsQuery({
                variables: { schoolId: feedback.school.id, myClasses: token?.isSchoolLeader || token.userType === ADMIN ? false : true }
            });
        }
    }, [feedbackData?.getFeedBackById?.id, token, pupilBooksData, viewByTeacher, pupilId, getPupilBooksQuery]);

    // update books data when single pupil is selected and book name is changed
    useEffect(() => {
        if (pupilBooksData?.getPupilBooks) {
            const books = pupilBooksData.getPupilBooks;
            setPupilBooks(books);

            if (selectedFeedback?.bookName) {
                const matchedBooks = matchBooks(books, selectedFeedback.bookName, ReadingBookOptions.SCHOOL_BOOK);
                setFilteredBooks(matchedBooks);
            }
        }
    }, [pupilBooksData, selectedFeedback?.bookName]);

    useEffect(() => {
        if (user?.getUser?.sharingAllowed == null && selectedFeedback?.sharingAllowed == null) {
            setShowPhotoPermission(true);
        } else {
            setShowPhotoPermission(false);
        }
    }, [user, selectedFeedback?.sharingAllowed]);

    const searchPupilBooks = useCallback(
        debounce((substring, readingType = null) => {
            const books = matchBooks(pupilBooks, substring, readingType);
            setFilteredBooks(books);
        }, 300),
        [pupilBooks]
    );

    const refetchPupilBooksForSingleSelection = useCallback(
        (pupilId) => {
            if (viewByTeacher && pupilId) {
                getPupilBooksQuery({
                    variables: { pupilId }
                });
            }
        },
        [viewByTeacher, getPupilBooksQuery]
    );

    /**
     * Helper to filter pupils that belong to "my classes" or "my groups".
     */
    const getClassPupilsForMyClass = (classPupils = [], schoolClassesAndGroups = []) => {
        const pupilsForGroupReading = [];

        classPupils.forEach((pupil) => {
            const pupilClassId = pupil?.classes?.[0];
            const schoolClass = schoolClassesAndGroups.find((cls) => cls.id === pupilClassId?.id);

            const myGroups = pupil?.groups?.filter((group) =>
                schoolClass?.groups?.some((myGroup) => myGroup.id === group.id && myGroup.isMyGroup)
            );

            if (schoolClass?.isMyClass || (myGroups && myGroups.length > 0)) {
                pupilsForGroupReading.push({
                    id: pupil.id,
                    pupilName: pupil.pupilName,
                    groups: myGroups,
                    classes: pupil.classes
                });
            }
        });

        return pupilsForGroupReading;
    };

    const getPupilsForMyClass = useMemo(() => {
        const pupilInfo = getClassesAndGroupsInfoOfPupilsData?.getClassesAndGroupsInfoOfPupils || [];
        const schoolClassInfo = getSchoolClassesData?.getSchoolClassesAndGroups || [];

        /**
         * If user is school leader or admin then render all pupils.
         * If user is teacher then render only my class pupils.
         */
        if (token?.isSchoolLeader || token.userType === ADMIN) return pupilInfo;

        // Get the pupils that belong to the teacher's class
        const myClassPupils = getClassPupilsForMyClass(pupilInfo, schoolClassInfo);

        // Find pupils from the selected feedback that are not in the teacher's class
        const additionalPupils =
            selectedFeedback?.pupils
                ?.filter((pupil) => !myClassPupils.some((classPupil) => classPupil?.id === pupil?.id))
                ?.map((pupil) => ({
                    id: pupil?.id,
                    pupilName: pupil?.fullname,
                    groups: [],
                    classes: [],
                    class: {
                        ...pupil?.currentClass,
                        yearGroup: pupil?.currentClass?.yearGroup?.year
                    }
                })) || [];

        // Combine pupils from the teacher's class and additional pupils outside their class
        return [...myClassPupils, ...additionalPupils];
    }, [
        getClassesAndGroupsInfoOfPupilsData?.getClassesAndGroupsInfoOfPupils,
        getSchoolClassesData?.getSchoolClassesAndGroups,
        token,
        selectedFeedback
    ]);

    const disableViewAsParent = token?.userType === TEACHER && !!viewByParent;

    const parentValidationSchema = readingLogValidationForParent(selectedFeedback?.school?.enableBookNameOnlyReadingLog, hasSavingLock, {
        requireReadDate: false
    });

    const handleOnSubmit = async (values) => {
        // The confirmation modal calls this directly, bypassing the disabled button.
        if (hasSavingLock()) {
            callSnackbar('Please wait for your photo or voice note to finish uploading', 'warning');

            return;
        }

        try {
            let { finishedBook: isBookFinished, pageNumber, note: privateNote, comments } = values;

            const isRealWorldReading = values.readingMode === ReadingMode.READ_IN_REAL_WORLD;
            const hasABookToFinish = !isRealWorldReading && values.readingType !== ReadingBookOptions.SOMETHING_ELSE;

            /**
             * A warning modal displayed if there are more than 1 pupil selected AND there is a comment mentioning any one of the selected pupils
             */
            if (values?.pupilIds?.length > 1 && visibleConfirmationModal === false) {
                const selectedPupils = getPupilsForMyClass.filter((pupil) => values?.pupilIds.includes(pupil?.id));

                if (checkPupilsNameExistInDescription(`${comments ?? ''}`, selectedPupils)) {
                    setVisibleConfirmationModal(true);

                    return;
                }
            }

            setLoading(true);

            let updatedFeedback = null;

            const baseValues = {
                id: selectedFeedback?.id,
                bookName: values?.bookName,
                comment: values.comments,
                includeInReadingTarget: values?.includeInReadingTarget,
                hasAudio: values?.audioFile ? true : false,
                audio: values?.audioFile?.token ?? null
            };

            const getRefetchQueries = () => {
                const baseQueries = refetchQueriesAfterUpdateOrDeleteFeedback(userId, pupilId, topicId, router);

                if (viewByTeacher && selectedFeedback?.pupilCount === 1 && pupilId) {
                    return [...baseQueries, { query: GET_PUPIL_BOOKS, variables: { pupilId } }];
                }

                return baseQueries;
            };

            const refetchQueries = getRefetchQueries();

            if (selectedFeedback?.pupilCount > 1) {
                // For multiple pupils, group mutation
                const { data } = await updateReadingLogAsGroupMutation({
                    variables: {
                        input: {
                            ...baseValues,
                            pupilIds: values?.pupilIds?.map((pupilId) => pupilId),
                            privateNote,
                            isBookFinished: hasABookToFinish ? isBookFinished : null,
                            readingMode: values.readingMode,
                            readingType: values.readingType,
                            pageNumber: hasABookToFinish && pageNumber ? `${pageNumber}` : null
                        }
                    },
                    refetchQueries,
                    awaitRefetchQueries: true
                });

                updatedFeedback = data?.updateReadingLogAsGroup;
            } else {
                if (viewByTeacher) {
                    const { data } = await updateReadingLogMutation({
                        variables: {
                            input: {
                                ...baseValues,
                                privateNote,
                                pageNumber: pageNumber ? `${pageNumber}` : null,
                                hasPhoto: values?.photo ? true : false,
                                isBookFinished,
                                id: selectedFeedback?.id,
                                sharingAllowed: values.sharingAllowed,
                                photo: values?.photo?.token ?? null
                            }
                        },
                        refetchQueries,
                        awaitRefetchQueries: true
                    });

                    updatedFeedback = data?.updateReadingLog;
                } else {
                    const { data } = await updateReadingLogMutation({
                        variables: {
                            input: {
                                ...baseValues,
                                readingType: values.readingType,
                                readingMode: values.readingMode,
                                pageNumber: hasABookToFinish && pageNumber ? `${pageNumber}` : null,
                                hasPhoto: values?.photo ? true : false,
                                isBookFinished: hasABookToFinish ? isBookFinished : null,
                                id: selectedFeedback?.id,
                                sharingAllowedGlobal: values.rememberPermissions,
                                sharingAllowed: values.sharingAllowed,
                                photo: values?.photo?.token ?? null
                            }
                        },
                        refetchQueries,
                        awaitRefetchQueries: true
                    });

                    updatedFeedback = data?.updateReadingLog;
                }
            }

            if (onReadingLogUpdate) {
                /**
                 * Filter out the pupil who has been removed from the reading log.
                 * This is necessary to ensure that feedback associated with the pupil
                 * is also removed. When a pupil is removed from the reading log,
                 * their feedback must be deleted accordingly.
                 */
                const removedPupils =
                    selectedFeedback?.pupilCount > 1
                        ? (selectedFeedback?.pupils ?? []).filter((pupil) => !values?.pupilIds.includes(pupil.id)).map((pupil) => pupil.id)
                        : [];

                onReadingLogUpdate(updatedFeedback, removedPupils);
            }

            callSnackbar('Reading entry has been updated', 'success');

            setOpen(false);
        } catch (error) {
            const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

            if (statusCode) {
                callSnackbar(error, 'error');
            } else {
                window.newrelic?.noticeError(error, { caught: true, handled: false });
                callSnackbar(unexpectedError, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogWrapper className="update-reading-log-modal" contentWidth="850px" open={open} setOpen={setOpen} heading="Update reading log">
            {feedbackLoading ? (
                <CommonLoading />
            ) : (
                <Formik
                    initialValues={{
                        // reading type is always "SCHOOL_BOOK" for school's. The server stores
                        // "Something else" against every real-world entry, so loading it here would
                        // pre-select a book source the parent never chose the moment they switch
                        // to a mode that asks the question.
                        readingType:
                            selectedFeedback?.readingMode === ReadingMode.READ_IN_REAL_WORLD ? null : selectedFeedback?.readingType,
                        readingMode: selectedFeedback?.readingMode ?? null,
                        pupilIds: selectedFeedback?.pupils?.map((pupil) => pupil?.id) ?? [],
                        bookName: selectedFeedback?.bookName ?? '',
                        finishedBook: selectedFeedback?.isBookFinished,
                        includeInReadingTarget: selectedFeedback?.includeInReadingTarget ?? false,
                        pageNumber: selectedFeedback?.pageNumber ?? '',
                        comments: selectedFeedback?.comment ?? '',
                        note: selectedFeedback?.privateNote ?? '',
                        audioFile: selectedFeedback?.audios?.[0] ? { audioUrl: selectedFeedback?.audios?.[0].filename } : '',
                        photo: selectedFeedback?.photos?.[0] ? selectedFeedback?.photos?.[0] : '',
                        shareWithTeacher: viewByTeacher
                            ? true
                            : user?.getUser?.sharingAllowed == null && selectedFeedback?.sharingAllowed == null
                              ? false
                              : true,
                        sharingAllowed:
                            selectedFeedback?.sharingAllowed === true ||
                            (selectedFeedback?.sharingAllowed == null && user?.getUser?.sharingAllowed === true)
                                ? true
                                : false,
                        rememberPermissions: false,
                        thoughts: null,
                        isReadingWithGroup: selectedFeedback?.pupilCount > 1
                    }}
                    validationSchema={viewByTeacher ? updateReadingLogValidationForTeacher : parentValidationSchema}
                    enableReinitialize
                    onSubmit={handleOnSubmit}>
                    {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm, setFieldValue, validateForm }) => {
                        // On a phone the missing fields are often scrolled out of view.
                        const submitOrWarn = async () => {
                            const formErrors = await validateForm();

                            if (Object.keys(formErrors).length) callSnackbar(formIncompleteWarning, 'warning');

                            handleSubmit();
                        };

                        return (
                            <Grid container justifyContent="center" flexDirection="column">
                                {/* If multi-pupil reading, allow multi-select */}
                                {selectedFeedback?.pupilCount > 1 && (
                                    <Grid item marginBottom="20px">
                                        <MultiSelect
                                            name="pupilIds"
                                            className="mb_24"
                                            options={getPupilsForMyClass}
                                            error={errors.pupilIds}
                                            touched={touched.pupilIds}
                                            forSchool
                                            onChange={(value) => {
                                                setFieldValue('pupilIds', value);

                                                // If exactly one pupil is selected, refetch their books
                                                if (value?.length === 1) {
                                                    refetchPupilBooksForSingleSelection(value[0]);
                                                } else {
                                                    // Reset pupil books when no pupil or multiple pupils selected
                                                    setPupilBooks([]);
                                                    setFilteredBooks([]);
                                                }
                                            }}
                                            selected={values.pupilIds ?? []}
                                        />
                                    </Grid>
                                )}
                                {viewByTeacher ? (
                                    <Grid container justifyContent="center" flexDirection="column">
                                        <Grid item>
                                            <InputField
                                                type="text"
                                                label="What book are you reading?"
                                                md={12}
                                                lg={12}
                                                name="bookName"
                                                value={values.bookName}
                                                onChange={(e) => {
                                                    handleChange(e);
                                                    if (values.pupilIds?.length === 1) {
                                                        searchPupilBooks(e.target.value, ReadingBookOptions.SCHOOL_BOOK);
                                                    }
                                                }}
                                                error={errors.bookName}
                                                touched={touched.bookName}
                                            />
                                        </Grid>
                                        {(pupilBooksLoading ||
                                            (viewByTeacher &&
                                                (selectedFeedback?.pupilCount === 1 || values.pupilIds?.length === 1) &&
                                                filteredBooks.length > 0)) && (
                                            <Grid item width="100%">
                                                <SelectLoggedBookName
                                                    suggestedBookNames={
                                                        viewByTeacher &&
                                                        (selectedFeedback?.pupilCount === 1 || values.pupilIds?.length === 1)
                                                            ? filteredBooks
                                                            : []
                                                    }
                                                    bookName={values?.bookName}
                                                    loading={pupilBooksLoading}
                                                    handleOnSelect={(bookName) =>
                                                        handleChange({
                                                            target: {
                                                                name: 'bookName',
                                                                value: bookName
                                                            }
                                                        })
                                                    }
                                                />
                                            </Grid>
                                        )}
                                        <Grid item>
                                            <FormControl component="fieldset" classes={{ root: 'root' }}>
                                                <Paragraph text="Did you finish this book?" />
                                                <RadioGroup
                                                    name="finishedBook"
                                                    value={values.finishedBook}
                                                    onChange={(event) => setFieldValue('finishedBook', event.target.value === 'true')}>
                                                    <FormControlLabel
                                                        value={true}
                                                        control={<Radio color="secondary" className="Radio_btn_3" />}
                                                        label="Yes"
                                                    />
                                                    <FormControlLabel
                                                        value={false}
                                                        control={<Radio color="secondary" className="Radio_btn_3" />}
                                                        label="No"
                                                    />
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid>

                                        {values.finishedBook === false && (
                                            <Grid item>
                                                <InputField
                                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                                    label="Which page did you get to?"
                                                    md={12}
                                                    lg={12}
                                                    name="pageNumber"
                                                    value={values.pageNumber}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={errors.pageNumber}
                                                    touched={touched.pageNumber}
                                                />
                                            </Grid>
                                        )}

                                        <Grid item>
                                            <CountTowardsReadingTarget
                                                bookReadAt={selectedFeedback?.bookReadAt}
                                                error={errors.includeInReadingTarget}
                                                touched={touched.includeInReadingTarget}
                                                handleBlur={handleBlur}
                                                includeInReadingTarget={values.includeInReadingTarget}
                                                pupilIds={values.pupilIds}
                                                handleUpdate={(value) => setFieldValue('includeInReadingTarget', value)}
                                            />
                                        </Grid>

                                        <Grid item>
                                            <ReadingLogForTeacher
                                                values={values}
                                                handleChange={handleChange}
                                                handleBlur={handleBlur}
                                                setFileName={() => {}}
                                                resetForm={resetForm}
                                                setSavingLock={setSavingLock}
                                            />
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <ReadingLogForParent
                                        disableViewAsParent={disableViewAsParent}
                                        // Entries that predate the question must stay savable after an unrelated edit.
                                        requireReadingMode={false}
                                        values={values}
                                        handleChange={handleChange}
                                        setFieldValue={setFieldValue}
                                        handleBlur={handleBlur}
                                        errors={errors}
                                        touched={touched}
                                        setFileName={setFileName}
                                        selectedFeedback={selectedFeedback}
                                        resetForm={resetForm}
                                        enableBookNameOnlyReadingLog={selectedFeedback?.school?.enableBookNameOnlyReadingLog}
                                        setSavingLock={setSavingLock}
                                    />
                                )}

                                {viewByParent && (
                                    <Grid item>
                                        <PermissionCheckboxes
                                            permissionParam={permissionParam}
                                            organisations={selectedFeedback?.school?.organisations}
                                            privacyPolicy={selectedFeedback?.school?.privacyPolicy}
                                            showPhotoPermission={showPhotoPermission}
                                            setShowPhotoPermission={setShowPhotoPermission}
                                            getPermissionParameterLoading={getPermissionParameterLoading}
                                        />
                                    </Grid>
                                )}
                                {viewByTeacher && permissionParam?.teacher_permission && (
                                    <Card className="demo-activity-photo-permission-update-card">
                                        <Paragraph>
                                            {getHtml(permissionParam?.teacher_permission, {
                                                ORGANISATIONS: selectedFeedback?.school?.organisations
                                            })}
                                        </Paragraph>
                                    </Card>
                                )}
                                <Grid
                                    item
                                    marginTop="20px"
                                    display="flex"
                                    justifyContent="flex-end"
                                    gap={2}
                                    className="update-reading-log-buttons">
                                    <LWPButton
                                        customClass="cancel_btn"
                                        variant="text"
                                        onClick={() => {
                                            resetForm();
                                            setOpen(false);
                                        }}
                                        btnText="Cancel"
                                        color="inherit"
                                        disabled={loading}
                                    />
                                    <LWPButton
                                        customClass="m-25"
                                        btnText="Update reading log"
                                        dataTest="update-reading-log-button"
                                        disabled={isSaving}
                                        onClick={submitOrWarn}
                                        loading={loading}
                                    />
                                </Grid>

                                {visibleConfirmationModal && (
                                    <ConfirmationModal
                                        open={visibleConfirmationModal}
                                        loading={loading}
                                        onCancel={() => {
                                            if (loading) return;
                                            setVisibleConfirmationModal(false);
                                        }}
                                        onConfirm={() => handleOnSubmit(values)}
                                        heading="Pupil name detected in group reading entry"
                                        btnText="Yes, save entry"
                                        cancelBtnText="Go back to editing">
                                        Your comment for this group reading entry may include the name of an individual pupil. Did you mean
                                        to include multiple pupils in this entry?
                                    </ConfirmationModal>
                                )}
                            </Grid>
                        );
                    }}
                </Formik>
            )}
        </DialogWrapper>
    );
};

UpdateReadingLog.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    selectedFeedbackId: PropTypes.string.isRequired,
    onReadingLogUpdate: PropTypes.func
};

export default UpdateReadingLog;
