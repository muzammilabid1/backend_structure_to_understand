import { gql, useQuery } from '@apollo/client';
import { CardActions, CardContent, Grid } from '@mui/material';
import { Formik } from 'formik';
import { FeedbackType } from 'lwp-shared/enums/FeedbackType';
import { ReadingBookOptions } from 'lwp-shared/enums/ReadingBookOptions';
import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getAllTopicsForFeedFilter } from '../../../graphQl/queries';
import { readingAsASubjectId, readingAsASubjectName } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { _get_date_format, capitalizeFirstLetter, ThemeContext } from '../../../shared/Services/handler';
import { AdminActivityFeedsFilterValidation } from '../../../shared/validations';
import CommonTag from '../../Shared/CommonTag';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCard from './../../Shared/Cards/CommonCard';
import CommonMultiSelect from './../../Shared/CommonMultiSelect';
import CommonSelectField from './../../Shared/CommonSelectField';
import DateField from './../../Shared/InputField/DateField';
import InputField from './../../Shared/InputField/InputField';

const allYearGroup = gql`
    query allYearGroup($showHiddenYearGroup: Boolean) {
        allYearGroup(showHiddenYearGroup: $showHiddenYearGroup) {
            id
            year
        }
    }
`;

const getTopicTagsForAdmin = gql`
    query getTopicTagsForAdmin {
        getTopicTagsForAdmin {
            id
            name
            color
        }
    }
`;

const getTagsForAdmin = gql`
    query getTagsForAdmin {
        getTagsForAdmin {
            id
            name
            color
        }
    }
`;

const getSchoolTagsForAdmin = gql`
    query getSchoolTagsForAdmin {
        getSchoolTagsForAdmin {
            id
            name
            color
        }
    }
`;

const getAllSchools = gql`
    query getAllSchools {
        getAllSchools {
            id
            schoolName
        }
    }
`;

const getAllSubjects = gql`
    query getAllSubjects {
        getAllSubjects {
            id
            name
        }
    }
`;

const AllFeedsFilter = ({ setIsOpen, customClass, postedAfter, setFeeds }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const searchParams = useSearchParams();
    const router = useRouter();

    const { error: error, data } = useQuery(getAllTopicsForFeedFilter);
    const { error: schoolError, data: schoolData } = useQuery(getAllSchools);
    const { error: allYearGroupError, data: allYearGroupData } = useQuery(allYearGroup);
    const { error: getAllSubjectsError, data: allSubjects } = useQuery(getAllSubjects);

    const { error: getTopicTagsError, data: getTopicTagsData } = useQuery(getTopicTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });
    const { error: getActivityTagsError, data: getActivityTagsData } = useQuery(getTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });
    const { error: getSchoolTagsError, data: getSchoolTagsData } = useQuery(getSchoolTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    useEffect(() => {
        schoolError?.message && callSnackbar(schoolError, 'error');
        error?.message && callSnackbar(error, 'error');
        allYearGroupError?.message && callSnackbar(allYearGroupError, 'error');
        getAllSubjectsError?.message && callSnackbar(getAllSubjectsError, 'error');
        getTopicTagsError?.message && callSnackbar(getTopicTagsError, 'error');
        getActivityTagsError?.message && callSnackbar(getActivityTagsError, 'error');
        getSchoolTagsError?.message && callSnackbar(getSchoolTagsError, 'error');
    }, [schoolError, error, allYearGroupError, getTopicTagsError, getActivityTagsError, getSchoolTagsError]);

    const mapToOptions = (data, valueField, keyField = 'id') => {
        return (data || []).map((item) => ({
            value: item?.[valueField],
            key: item?.[keyField],
            color: item?.color
        }));
    };

    const yearGroupOptions = mapToOptions(allYearGroupData?.allYearGroup, 'year');
    const topicTagsOptions = mapToOptions(getTopicTagsData?.getTopicTagsForAdmin, 'name');
    const activityTagsOptions = mapToOptions(getActivityTagsData?.getTagsForAdmin, 'name');
    const schoolTagsOptions = mapToOptions(getSchoolTagsData?.getSchoolTagsForAdmin, 'name');
    const subjectsOptions = mapToOptions(allSubjects?.getAllSubjects, 'name');

    const photoRatingOptions = [
        { value: '5 Highly Recommend', key: 5 },
        { value: '4 e.g. photo of child + parent playing', key: 4 },
        { value: '3 e.g. photo of child playing', key: 3 },
        { value: '2 e.g. photo of child working', key: 2 },
        { value: '1 e.g. photo of work', key: 1 },
        { value: 'Report', key: -1 },
        { value: 'Don’t share', key: -2 }
    ];

    const starRatingOptions = [
        { value: '5 stars', key: 5 },
        { value: '4 stars', key: 4 },
        { value: '3 stars', key: 3 },
        { value: '2 stars', key: 2 },
        { value: '1 star', key: 1 }
    ];

    const schoolTypeOptions = [
        { value: 'Active', key: 'ACTIVE' },
        { value: 'Inactive', key: 'INACTIVE' },
        { value: 'Test', key: 'TEST' }
    ];

    const entryTypeOptions = Object.values(FeedbackType).map((type) => ({
        value: capitalizeFirstLetter(type),
        key: type
    }));

    const bookOptionsArray = Object.values(ReadingBookOptions).map((option) => ({
        value: option
            .replace('_', ' ')
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase()),
        key: option
    }));

    const _getInitialValue = (options = [], query) => {
        if (!query) return [];

        const queries = Array.isArray(query) ? query : [query];

        return queries.map((num) => options.find((i) => i?.key === num)).filter(Boolean);
    };

    const getQueryParam = (param) => {
        const value = searchParams.get(param);

        if (!value) return null;
        try {
            return JSON.parse(value);
        } catch (e) {
            console.error(`Error parsing searchParams for ${param}:`, e);

            return null;
        }
    };

    const _getInitialSchoolValue = (query) => {
        if (schoolData) {
            if (typeof query === 'string') {
                return (schoolData?.['getAllSchools'] || [])
                    ?.filter((i) => i?.id === query)
                    ?.map((i) => ({ value: `${i?.schoolName}`, key: i?.id }));
            }

            return query.map((num) => {
                return (schoolData?.['getAllSchools'] || [])
                    ?.filter((i) => i?.id === num)
                    ?.map((i) => ({ value: `${i?.schoolName}`, key: i?.id }))[0];
            });
        }
    };

    const _getInitialTopicValue = (query) => {
        if (data) {
            if (typeof query === 'string') {
                return (data?.['allTopics'] || [])
                    ?.filter((t) => t?.id === query)
                    ?.map((topic) => ({
                        value: `${topic?.teacherTopicName}, (${topic?.yearGroups?.map((y) => y?.shortName).join(', ')}), ${topic?.domains
                            ?.map((d) => d?.title)
                            .join(', ')}`,
                        key: topic?.id
                    }));
            }

            return query.map((num) => {
                return (data?.['allTopics'] || [])
                    ?.filter((i) => i?.id === num)
                    ?.map((topic) => ({
                        value: `${topic?.teacherTopicName}, (${topic?.yearGroups?.map((y) => y?.shortName).join(', ')}), ${topic?.domains
                            ?.map((d) => d?.title)
                            .join(', ')}`,
                        key: topic?.id
                    }))[0];
            });
        }
    };

    const _onReset = (resetForm) => {
        setFeeds([]);
        resetForm({
            values: {
                sharedStatus: sharedJson?.feedbackSharedStatus?.[1]?.key,
                subjects: [],
                beforeDate: null,
                afterDate: null,
                school: [],
                topicYearGroupIds: [],
                activityTagIds: [],
                topicTagIds: [],
                schoolTagIds: [],
                schoolTypes: [],
                photoRating: [],
                starRating: [],
                topics: [],
                feedbackTypes: [],
                searchInput: null,
                bookName: null
            }
        });

        router?.push({
            query: {
                postedBefore: null,
                postedAfter: null,
                schoolIds: [],
                topicIds: [],
                activityTagIds: [],
                topicTagIds: [],
                schoolTagIds: [],
                schoolTypes: [],
                topicYearGroupIds: [],
                photoRatings: [],
                starRating: [],
                feedbackTypes: [],
                sharedStatus: sharedJson?.feedbackSharedStatus?.[1]?.key,
                subjects: [],
                searchInput: '',
                bookName: '',
                IsOpen: true,
                filtered: true
            }
        });
    };

    return (
        <Formik
            enableReinitialize
            validationSchema={AdminActivityFeedsFilterValidation}
            initialValues={{
                sharedStatus: searchParams.get('sharedStatus')
                    ? sharedJson?.feedbackSharedStatus?.find((item) => item?.key === searchParams.get('sharedStatus'))?.key
                    : sharedJson?.feedbackSharedStatus?.[1]?.key,
                beforeDate: searchParams.get('postedBefore') ? new Date(searchParams.get('postedBefore')) : null,
                afterDate: searchParams.get('postedAfter') || postedAfter ? new Date(searchParams.get('postedAfter') || postedAfter) : null,
                school: searchParams.get('schoolIds') ? _getInitialSchoolValue(JSON.parse(searchParams.get('schoolIds'))) : [],
                topicYearGroupIds: _getInitialValue(yearGroupOptions, getQueryParam('topicYearGroupIds')),
                topicTagIds: _getInitialValue(topicTagsOptions, getQueryParam('topicTagIds')),
                activityTagIds: _getInitialValue(activityTagsOptions, getQueryParam('activityTagIds')),
                schoolTagIds: _getInitialValue(schoolTagsOptions, getQueryParam('schoolTagIds')),
                photoRating: _getInitialValue(photoRatingOptions, getQueryParam('photoRatings')),
                starRating: _getInitialValue(starRatingOptions, getQueryParam('starRating')),
                schoolTypes: _getInitialValue(schoolTypeOptions, getQueryParam('schoolTypes')),
                feedbackTypes: _getInitialValue(entryTypeOptions, getQueryParam('feedbackTypes')),
                bookOptions: _getInitialValue(bookOptionsArray, getQueryParam('bookOptions')),
                subjects: _getInitialValue(
                    subjectsOptions.concat([{ value: readingAsASubjectName, key: readingAsASubjectId }]),
                    getQueryParam('subjects')
                ),

                topics: searchParams.get('topicIds') ? _getInitialTopicValue(JSON.parse(searchParams.get('topicIds'))) : [],
                searchInput: searchParams.get('searchInput') ?? null,
                bookName: searchParams.get('bookName') ?? null,
                currentAcademicYearOnly: searchParams.get('currentAcademicYearOnly') === 'false' ? false : true
            }}
            onSubmit={(values) => {
                setFeeds([]);
                const {
                    beforeDate,
                    afterDate,
                    school,
                    topicYearGroupIds,
                    topicTagIds,
                    activityTagIds,
                    schoolTagIds,
                    photoRating,
                    starRating,
                    schoolTypes,
                    topics,
                    feedbackTypes,
                    sharedStatus,
                    searchInput,
                    bookName,
                    subjects,
                    currentAcademicYearOnly,
                    bookOptions
                } = values;

                const beforeNewDate = !beforeDate ? null : _get_date_format(beforeDate, true);
                const afterNewDate = !afterDate ? null : _get_date_format(afterDate);
                const newSchools = school?.map((s) => s.key);
                const newTopicYearGroup = topicYearGroupIds?.map((r) => r.key);
                const newTopicTags = topicTagIds?.map((r) => r.key);
                const newActivityTags = activityTagIds?.map((r) => r.key);
                const newSchoolTags = schoolTagIds?.map((r) => r.key);
                const newSchoolType = schoolTypes?.map((r) => r.key);
                const newFeedbackTypes = feedbackTypes?.map((r) => r.key);
                const newBookOptions = bookOptions?.map((r) => r.key);
                const newPhotoRating = photoRating?.map((r) => r.key);
                const newStarRating = starRating?.map((r) => r.key);
                const newTopics = topics?.map((t) => t.key);
                const newSubjects = subjects?.map((t) => t.key);

                setIsOpen(true);

                router?.push({
                    query: {
                        postedBefore: beforeNewDate?.toString(),
                        postedAfter: afterNewDate?.toString(),
                        schoolIds: newSchools?.length > 0 ? JSON.stringify(newSchools) : null,
                        topicIds: newTopics?.length > 0 ? JSON.stringify(newTopics) : null,
                        topicYearGroupIds: newTopicYearGroup?.length > 0 ? JSON.stringify(newTopicYearGroup) : null,
                        topicTagIds: newTopicTags?.length > 0 ? JSON.stringify(newTopicTags) : null,
                        activityTagIds: newActivityTags?.length > 0 ? JSON.stringify(newActivityTags) : null,
                        schoolTagIds: newSchoolTags?.length > 0 ? JSON.stringify(newSchoolTags) : null,
                        schoolTypes: newSchoolType?.length > 0 ? JSON.stringify(newSchoolType) : null,
                        feedbackTypes: newFeedbackTypes?.length > 0 ? JSON.stringify(newFeedbackTypes) : null,
                        photoRatings: newPhotoRating?.length > 0 ? JSON.stringify(newPhotoRating) : null,
                        starRating: newStarRating?.length > 0 ? JSON.stringify(newStarRating) : null,
                        bookOptions: newBookOptions?.length > 0 ? JSON.stringify(newBookOptions) : null,
                        subjects: newSubjects?.length > 0 ? JSON.stringify(newSubjects) : null,
                        currentAcademicYearOnly,
                        tab: 0,
                        sharedStatus,
                        searchInput,
                        bookName,
                        IsOpen: true,
                        filtered: true
                    }
                });
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm, setFieldValue }) => {
                return (
                    <CommonCard className={`feeds-filter-container ${customClass}`}>
                        <CardContent>
                            <Grid spacing={3} container>
                                <CommonSelectField
                                    label="Entries to include"
                                    options={sharedJson?.feedbackSharedStatus}
                                    value={values.sharedStatus}
                                    error={errors.sharedStatus}
                                    touched={touched.sharedStatus}
                                    md={6}
                                    lg={6}
                                    onChange={(e) =>
                                        handleChange({
                                            target: { name: 'sharedStatus', value: e.target.value }
                                        })
                                    }
                                    onBlur={(e) =>
                                        handleBlur({
                                            target: { name: 'sharedStatus', value: e.target.value }
                                        })
                                    }
                                    dataTest="sharing-permission-select"
                                />
                                <CommonMultiSelect
                                    label="Subject"
                                    options={subjectsOptions.concat([{ value: readingAsASubjectName, key: readingAsASubjectId }])}
                                    value={values.subjects}
                                    error={errors.subjects}
                                    touched={touched.subjects}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'subjects', value: value }
                                        });
                                    }}
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'subjects', value: value }
                                        })
                                    }
                                    md={6}
                                    lg={6}
                                    dataTest="subject-multi-select"
                                />
                                <div className="feed-date-container">
                                    <DateField
                                        name="afterDate"
                                        label="From"
                                        md={6}
                                        lg={6}
                                        value={values.afterDate}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.afterDate}
                                        touched={touched.afterDate}
                                        disableFuture
                                        endCommonTooltipIcon={
                                            values.afterDate && (
                                                <span
                                                    className="material-icons"
                                                    onClick={() => {
                                                        setFieldValue('afterDate', null);
                                                    }}>
                                                    close
                                                </span>
                                            )
                                        }
                                    />
                                    <DateField
                                        name="beforeDate"
                                        label="Until"
                                        md={6}
                                        lg={6}
                                        value={values.beforeDate}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.beforeDate}
                                        touched={touched.beforeDate}
                                        disableFuture
                                        endCommonTooltipIcon={
                                            values.beforeDate && (
                                                <span
                                                    className="material-icons"
                                                    onClick={() => {
                                                        setFieldValue('beforeDate', null);
                                                    }}>
                                                    close
                                                </span>
                                            )
                                        }
                                    />
                                </div>
                                <CommonMultiSelect
                                    value={values.school}
                                    options={(schoolData?.['getAllSchools'] || []).map((school) => ({
                                        value: school.schoolName,
                                        key: school.id
                                    }))}
                                    label="School"
                                    name="school"
                                    error={errors.school}
                                    touched={touched.school}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'school', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'school', value: value }
                                        })
                                    }
                                    dataTest="schools-multi-select"
                                />

                                <CommonMultiSelect
                                    value={values.photoRating}
                                    options={photoRatingOptions || []}
                                    label="Photo rating"
                                    name="photoRating"
                                    error={errors.photoRating}
                                    touched={touched.photoRating}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'photoRating', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'photoRating', value: value }
                                        })
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.starRating}
                                    options={starRatingOptions || []}
                                    label="Star rating"
                                    name="starRating"
                                    error={errors.starRating}
                                    touched={touched.starRating}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'starRating', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'starRating', value: value }
                                        })
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.topics}
                                    options={(data?.['allTopics'] || []).map((topic) => ({
                                        value: `${topic?.teacherTopicName}, (${topic?.yearGroups
                                            ?.map((y) => y?.shortName)
                                            .join(', ')}), ${topic?.domains?.map((d) => d?.title).join(', ')}`,
                                        key: topic.id
                                    }))}
                                    label="Topic(s)"
                                    name="topics"
                                    error={errors.topics}
                                    touched={touched.topics}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'topics', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'topics', value: value }
                                        })
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.topicYearGroupIds}
                                    options={yearGroupOptions || []}
                                    label="Topic year group"
                                    name="topicYearGroupIds"
                                    error={errors.topicYearGroupIds}
                                    touched={touched.topicYearGroupIds}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'topicYearGroupIds', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'topicYearGroupIds', value: value }
                                        })
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.topicTagIds}
                                    options={topicTagsOptions || []}
                                    label="Topic tags"
                                    name="topicTagIds"
                                    error={errors.topicTagIds}
                                    touched={touched.topicTagIds}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'topicTagIds', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'topicTagIds', value: value }
                                        })
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                        ))
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.activityTagIds}
                                    options={activityTagsOptions || []}
                                    label="Activity tags"
                                    name="activityTagIds"
                                    error={errors.activityTagIds}
                                    touched={touched.activityTagIds}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'activityTagIds', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'activityTagIds', value: value }
                                        })
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                        ))
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.schoolTagIds}
                                    options={schoolTagsOptions || []}
                                    label="School tags"
                                    name="schoolTagIds"
                                    error={errors.schoolTagIds}
                                    touched={touched.schoolTagIds}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'schoolTagIds', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'schoolTagIds', value: value }
                                        })
                                    }
                                    renderTags={(value, getTagProps) =>
                                        value.map((option, index) => (
                                            <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                        ))
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.schoolTypes}
                                    options={schoolTypeOptions || []}
                                    label="School type"
                                    name="schoolTypes"
                                    error={errors.schoolTypes}
                                    touched={touched.schoolTypes}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'schoolTypes', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'schoolTypes', value: value }
                                        })
                                    }
                                />

                                <CommonMultiSelect
                                    value={values.feedbackTypes}
                                    options={entryTypeOptions || []}
                                    label="Entry type"
                                    name="feedbackTypes"
                                    error={errors.feedbackTypes}
                                    touched={touched.feedbackTypes}
                                    md={6}
                                    lg={6}
                                    onChange={(value) =>
                                        handleChange({
                                            target: { name: 'feedbackTypes', value: value }
                                        })
                                    }
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'feedbackTypes', value: value }
                                        })
                                    }
                                    dataTest="entry-type-multi-select"
                                />

                                <CommonMultiSelect
                                    label="Book options"
                                    options={bookOptionsArray || []}
                                    value={values.bookOptions}
                                    error={errors.bookOptions}
                                    touched={touched.bookOptions}
                                    onChange={(value) => {
                                        handleChange({
                                            target: { name: 'bookOptions', value: value }
                                        });
                                    }}
                                    onBlur={(value) =>
                                        handleBlur({
                                            target: { name: 'bookOptions', value: value }
                                        })
                                    }
                                    md={6}
                                    lg={6}
                                />

                                <InputField
                                    name="searchInput"
                                    value={values.searchInput}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.searchInput}
                                    touched={touched.searchInput}
                                    label="Search Comments"
                                    type="text"
                                    md={12}
                                    lg={12}
                                />

                                <InputField
                                    name="bookName"
                                    label="Book name"
                                    value={values.bookName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.bookName}
                                    touched={touched.bookName}
                                    type="text"
                                    md={12}
                                    lg={12}
                                />
                            </Grid>
                        </CardContent>
                        <CardActions>
                            <LWPButton
                                size={'large'}
                                variant="contained"
                                color="inherit"
                                onClick={() => _onReset(resetForm)}
                                btnText={'Reset'}
                            />
                            <LWPButton size={'large'} variant="contained" color="primary" onClick={handleSubmit} btnText={'Apply'} />
                        </CardActions>
                    </CommonCard>
                );
            }}
        </Formik>
    );
};

AllFeedsFilter.propTypes = {
    setIsOpen: PropTypes.func,
    setFeeds: PropTypes.func,
    customClass: PropTypes.string,
    postedAfter: PropTypes.string
};

export default AllFeedsFilter;
