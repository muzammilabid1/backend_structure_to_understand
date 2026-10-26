/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { FormControl, FormControlLabel, Grid, Radio, RadioGroup } from '@mui/material';
import { Formik } from 'formik';
import { debounce } from 'lodash';
import { ReadingBookOptions } from 'lwp-shared';
import moment from 'moment';
import { useParams } from 'next/navigation';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getClassesAndGroupsInfoOfPupils } from '../../../../graphQl/queries';
import { PAGINATION_ITEM_LIMIT, TEACHER } from '../../../../shared/Constant';
import { useSavingLock } from '../../../../shared/hooks/useSavingLock';
import { checkPupilsNameExistInDescription, matchBooks, ThemeContext } from '../../../../shared/Services/handler';
import { readingLogValidationForReadingAsGroup } from '../../../../shared/validations';
import ReadingLogForTeacher from '../../../Parent/ReadingLogForTeacher';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonButtonGroup from '../../../Shared/CommonButtonGroup';
import DateField from '../../../Shared/InputField/DateField';
import InputField from '../../../Shared/InputField/InputField';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import SelectLoggedBookName from '../../../Shared/SelectLoggedBookName';
import Paragraph from '../../../Shared/Typography/Paragraph';
import MultiSelect from '../MultiSelect';
import CountTowardsReadingTarget from './CountTowardsReadingTarget';

const getSchoolClassesAndGroups = gql`
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

interface ReadingGroupFormProps {
    getPupilActivityFeedsQuery: (variables: any) => Promise<any>;
    setFeeds: React.Dispatch<React.SetStateAction<any[]>>;
    setReadingGroupState: React.Dispatch<React.SetStateAction<any>>;

    feedbackFields: string;
    parentClassId?: string;
    isRegistrationClass?: boolean;
    forSchool?: boolean;
    pupilIdsForGroup?: string[];
    schoolId: string;
}

const ReadingGroupForm = ({
    getPupilActivityFeedsQuery,
    setFeeds,
    setReadingGroupState,
    feedbackFields,
    parentClassId,
    isRegistrationClass,
    pupilIdsForGroup,
    forSchool,
    schoolId
}: ReadingGroupFormProps) => {
    // mutaion
    const addReadingLogAsGroup = gql`
        mutation addReadingLogAsGroup($input: AddReadingLogAsGroupInput!) {
            addReadingLogAsGroup(input: $input) {
                ${feedbackFields}
            }
        }
`;

    const queryParams = useParams();
    const { token, callSnackbar } = useContext(ThemeContext);
    const [select, setSelect] = useState('My classes');
    const ref = useRef<any>();
    const { isSaving, hasSavingLock, setSavingLock } = useSavingLock();
    const [visibleConfirmationModal, setVisibleConfirmationModal] = useState(false);
    const [singlePupilBooks, setSinglePupilBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);

    const { loading, error, data } = useQuery(getClassesAndGroupsInfoOfPupils, {
        variables: { schoolId: schoolId, classId: queryParams?.class_id, readingOnly: true }
    });

    const { error: getSchoolClassesError, data: getSchoolClassesData } = useQuery(getSchoolClassesAndGroups, {
        variables: { schoolId: token?.schoolId, myClasses: true },
        skip: !(token?.sub && token?.isSchoolLeader)
    });

    const [addReadingLogMutation, { loading: addReadingLogLoading }] = useMutation(addReadingLogAsGroup);

    // This will only be invoked when exactly one pupil is selected to cache all their books
    const [fetchPupilBooks, { data: pupilBooksData, loading: pupilBooksLoading, error: pupilBooksError }] = useLazyQuery(GET_PUPIL_BOOKS);

    const hasOnePupil = useCallback((pupilIds) => pupilIds?.length === 1, []);

    useEffect(() => {
        if (error?.message) callSnackbar(error, 'error');
        if (getSchoolClassesError?.message) callSnackbar(getSchoolClassesError, 'error');
        if (pupilBooksError?.message) callSnackbar(pupilBooksError, 'error');
    }, [error, getSchoolClassesError, pupilBooksError]);

    useEffect(() => {
        setReadingGroupState({ mainLoading: loading });
    }, [loading]);

    // this is triggered when teacher opens /school/<id>/log-reading page for new book entry
    useEffect(() => {
        if (pupilBooksData?.getPupilBooks) {
            setSinglePupilBooks(pupilBooksData.getPupilBooks);
            const matchedBooks = matchBooks(pupilBooksData.getPupilBooks, '', ReadingBookOptions.SCHOOL_BOOK);

            setFilteredBooks(matchedBooks);
        }
    }, [pupilBooksData]);

    const getClassPupilsForMyClass = (classPupils = [], schoolClassesAndGroups = []) => {
        const pupilsForGroupReading = [];

        classPupils.forEach((pupil) => {
            const pupilClassId = pupil?.classes[0];

            const schoolClass = schoolClassesAndGroups?.find((cls) => cls.id === pupilClassId?.id);

            const myGroups = pupil?.groups?.filter((group) => {
                return schoolClass?.groups?.some((myGroup) => myGroup.id === group.id && myGroup.isMyGroup);
            });

            if (schoolClass?.isMyClass || myGroups?.length > 0) {
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

    const getPupilsForMyClass = getClassPupilsForMyClass(
        data?.getClassesAndGroupsInfoOfPupils,
        getSchoolClassesData?.getSchoolClassesAndGroups
    );

    const pupilOptions =
        token?.isSchoolLeader && forSchool && getPupilsForMyClass?.length > 0 && select === 'My classes'
            ? (getPupilsForMyClass ?? [])
            : (data?.getClassesAndGroupsInfoOfPupils ?? []);

    const onSubmit = async (values) => {
        // The confirmation modal calls this directly, bypassing the disabled button.
        if (hasSavingLock()) {
            callSnackbar('Please wait for your photo or voice note to finish uploading', 'warning');

            return;
        }

        const { bookName, comments, finishedBook, pageNumber, readDate, note, includeInReadingTarget, pupilIds } = values;

        /**
         * A warning modal is displayed if there are more than 1 pupil selected AND there is a comment mentioning any one of the selected pupils
         */
        if (pupilIds.length > 1 && visibleConfirmationModal === false) {
            const selectedPupils = pupilOptions.filter((pupil) => pupilIds.includes(pupil.id));

            if (checkPupilsNameExistInDescription(`${comments ?? ''}`, selectedPupils)) {
                setVisibleConfirmationModal(true);

                return;
            }
        }

        try {
            const { data } = await addReadingLogMutation({
                variables: {
                    input: {
                        pupilIds: pupilIds.map((pupilId) => pupilId),
                        bookName: bookName,
                        userName: token?.userName ?? null,
                        userType: TEACHER,
                        comment: comments,
                        includeInReadingTarget,
                        privateNote: note,
                        isBookFinished: finishedBook,
                        pageNumber: `${pageNumber}`,
                        bookReadAt: readDate,
                        classId: queryParams?.class_id,
                        schoolId,
                        audio: values?.audioFile?.token ?? null
                    }
                },
                refetchQueries:
                    pupilIds.length === 1
                        ? [
                              {
                                  query: GET_PUPIL_BOOKS,
                                  variables: { pupilId: pupilIds[0] }
                              }
                          ]
                        : []
            });

            resetField();
            setVisibleConfirmationModal(false);
            callSnackbar('Reading entry has been added', 'success');
            setFeeds((feeds) =>
                [data?.addReadingLogAsGroup, ...feeds].sort((a, b) => new Date(b.bookReadAt).getTime() - new Date(a.bookReadAt).getTime())
            );
        } catch (error) {
            console.log('Error:', error);
        }
    };

    const resetField = () => {
        ref?.current?.resetForm({
            values: {
                id: null,
                bookName: '',
                finishedBook: null,
                includeInReadingTarget: false,
                pageNumber: '',
                comments: '',
                note: '',
                readDate: moment().toDate(),
                audioFile: '',
                pupilIds: []
            }
        });

        setReadingGroupState({ editActivity: null });
    };

    const groupBtn = ['My classes', 'All classes'];

    const searchPupilBooks = useCallback(
        debounce((substring, readingType = null) => {
            const books = matchBooks(singlePupilBooks, substring, readingType);

            setFilteredBooks(books);
        }, 300),
        [singlePupilBooks]
    );

    const suggestedBookNames = useMemo(() => {
        return hasOnePupil(ref.current?.values?.pupilIds) ? filteredBooks : [];
    }, [filteredBooks]);

    return (
        <div className="form_section">
            <Formik
                initialValues={{
                    id: null,
                    bookName: '',
                    finishedBook: null,
                    includeInReadingTarget: false,
                    pageNumber: '',
                    comments: '',
                    note: '',
                    readDate: moment().toDate(),
                    audioFile: '',
                    pupilIds: []
                }}
                innerRef={ref}
                validationSchema={readingLogValidationForReadingAsGroup}
                onSubmit={onSubmit}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue }) => {
                    return (
                        <>
                            {token?.isSchoolLeader && forSchool && getPupilsForMyClass?.length > 0 && (
                                <Grid mb={3}>
                                    <CommonButtonGroup
                                        groupBtn={groupBtn}
                                        select={select}
                                        onClick={(btn) => {
                                            setSelect(btn);
                                            resetField();
                                        }}
                                    />
                                </Grid>
                            )}
                            <Grid my={3}>
                                <MultiSelect
                                    name="pupilIds"
                                    className="mb_24 "
                                    options={pupilOptions}
                                    error={errors.pupilIds}
                                    touched={touched.pupilIds}
                                    forSchool={forSchool}
                                    onChange={async (value) => {
                                        setReadingGroupState({
                                            showPreviousGroupLoading: true,
                                            pupilIds: value?.map((pupilId) => pupilId)
                                        });
                                        setFeeds([]);

                                        handleChange({
                                            target: { value, name: 'pupilIds' }
                                        });

                                        if (value?.length > 0 || !forSchool) {
                                            const response = await getPupilActivityFeedsQuery({
                                                variables: {
                                                    schoolId,
                                                    classId: isRegistrationClass ? queryParams?.class_id : parentClassId,
                                                    offset: 0,
                                                    limit: PAGINATION_ITEM_LIMIT,
                                                    pupilIds: value?.length
                                                        ? value?.map((pupilId) => pupilId)
                                                        : isRegistrationClass
                                                          ? []
                                                          : (pupilIdsForGroup ?? [])
                                                },
                                                fetchPolicy: 'network-only'
                                            }).catch((err) => {
                                                console.log('Error:', err);
                                            });

                                            setFeeds(response?.data?.getFeedbackForGroupReading?.results);
                                        } else {
                                            setFeeds([]);
                                        }

                                        if (hasOnePupil(value)) {
                                            const pupilBooksResponse = await fetchPupilBooks({
                                                variables: { pupilId: value[0] }
                                            });

                                            setSinglePupilBooks(pupilBooksResponse?.data?.getPupilBooks || []);
                                            const initialBooks = matchBooks(
                                                pupilBooksResponse?.data?.getPupilBooks || [],
                                                values.bookName,
                                                ReadingBookOptions.SCHOOL_BOOK
                                            );

                                            // initial 3 books
                                            setFilteredBooks(initialBooks);
                                        } else {
                                            // Clear cached books when no pupil selected or multiple pupils selected
                                            setSinglePupilBooks([]);
                                            setFilteredBooks([]);
                                        }

                                        setReadingGroupState({ showPreviousGroupLoading: false });
                                    }}
                                    selected={values.pupilIds ?? []}
                                    dataTest={'reading-group-form-pupils-select'}
                                />
                            </Grid>

                            <div className="mb_24">
                                <DateField
                                    name="readDate"
                                    label="Reading date"
                                    md={12}
                                    lg={12}
                                    value={values.readDate}
                                    onChange={(e) => {
                                        handleChange(e);
                                    }}
                                    onBlur={handleBlur}
                                    error={errors.readDate}
                                    touched={touched.readDate}
                                    minDate={moment().subtract(7, 'days')?.toDate()}
                                    maxDate={moment()?.toDate()}
                                    disabled={values?.id}
                                />
                            </div>

                            <InputField
                                type="text"
                                customClass="mb_8"
                                label="What book are you reading?"
                                md={12}
                                lg={12}
                                name="bookName"
                                value={values.bookName}
                                onChange={(e) => {
                                    handleChange(e);
                                    // readingType is fixed to SCHOOL_BOOK for teacher
                                    if (hasOnePupil(values.pupilIds)) searchPupilBooks(e.target.value, ReadingBookOptions.SCHOOL_BOOK);
                                }}
                                error={errors.bookName}
                                touched={touched.bookName}
                                dataTest={'reading-group-form-book-title-input'}
                            />

                            {hasOnePupil(values?.pupilIds) && (pupilBooksLoading || suggestedBookNames.length) ? (
                                <SelectLoggedBookName
                                    suggestedBookNames={suggestedBookNames}
                                    bookName={values?.bookName}
                                    loading={pupilBooksLoading}
                                    handleOnSelect={(bookName) => {
                                        handleChange({
                                            target: {
                                                name: 'bookName',
                                                value: bookName
                                            }
                                        });
                                    }}
                                />
                            ) : null}

                            <FormControl component="fieldset" classes={{ root: 'root' }}>
                                <Paragraph text="Did you finish this book?" />
                                <RadioGroup
                                    name="finishedBook"
                                    value={values.finishedBook}
                                    onChange={(event) => setFieldValue('finishedBook', 'true' === event.target.value)}>
                                    <FormControlLabel value={true} control={<Radio className="group_radio_button" />} label="Yes" />
                                    <FormControlLabel value={false} control={<Radio className="group_radio_button" />} label="No" />
                                </RadioGroup>
                            </FormControl>

                            {false === values.finishedBook && (
                                <>
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
                                </>
                            )}

                            <CountTowardsReadingTarget
                                bookReadAt={values.readDate}
                                error={errors.includeInReadingTarget as string}
                                touched={touched.includeInReadingTarget as boolean}
                                handleBlur={handleBlur}
                                includeInReadingTarget={values.includeInReadingTarget}
                                pupilIds={values.pupilIds}
                                handleUpdate={(value) => setFieldValue('includeInReadingTarget', value)}
                            />

                            <ReadingLogForTeacher
                                values={values}
                                handleChange={handleChange}
                                handleBlur={handleBlur}
                                selectedFeedback={{ selectedFeedback: {} }}
                                setSavingLock={setSavingLock}
                            />

                            <div className="submit_group">
                                <LWPButton btnText="Cancel" variant="text" color="inherit" onClick={resetField} />
                                <LWPButton
                                    btnText={values?.id ? 'Update' : 'Add'}
                                    disabled={isSaving}
                                    onClick={handleSubmit}
                                    loading={addReadingLogLoading}
                                    dataTest={'reading-group-form-submit-btn'}
                                />
                            </div>
                        </>
                    );
                }}
            </Formik>
            {visibleConfirmationModal && (
                <ConfirmationModal
                    open={visibleConfirmationModal}
                    loading={addReadingLogLoading}
                    onCancel={() => {
                        if (addReadingLogLoading) return;
                        setVisibleConfirmationModal(false);
                    }}
                    onConfirm={() => onSubmit(ref.current.values)}
                    heading="Pupil name detected in group reading entry"
                    btnText="Yes, save entry"
                    cancelBtnText="Go back to editing">
                    Your comment for this group reading entry may include the name of an individual pupil. Did you mean to include multiple
                    pupils in this entry?
                </ConfirmationModal>
            )}
        </div>
    );
};

export default ReadingGroupForm;
