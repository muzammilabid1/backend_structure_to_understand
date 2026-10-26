/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import SearchIcon from '@mui/icons-material/Search';
import { Collapse, debounce, Grid, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers';
import { Formik } from 'formik';
import { FeedbackType } from 'lwp-shared/enums/FeedbackType';
import { MediaTypeForAllFeeds } from 'lwp-shared/enums/MediaTypeForAllFeeds';
import moment from 'moment';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { MINIO_PUBLIC_PATHS, readingAsASubjectId, readingAsASubjectName } from '../../shared/Constant';
import { _get_date_format, getWeekPostedRange, handleErrorSnackbar, ThemeContext } from '../../shared/Services/handler';
import { TeacherActivityFeedsFilterValidation } from '../../shared/validations';
import { ILwpSchool } from '../../types/entities/ILwpSchool';
import LWPButton from '../Shared/Button/LWPButton';
import CommonCard from '../Shared/Cards/CommonCard';
import CommonError from '../Shared/CommonError';
import CommonPopOver from '../Shared/CommonPopOver';
import CommonSwitch from '../Shared/CommonSwitch';
import InputField from '../Shared/InputField/InputField';
import Heading3 from '../Shared/Typography/Heading3';
import Paragraph from '../Shared/Typography/Paragraph';
import TecherActivityFeedFilterLoading from './TecherActivityFeedFilterLoading';

const getClassesAndGroupsForFeedbackFilter = gql`
    query getClassesAndGroupsForFeedbackFilter($periodIndex: String, $teacherId: String!, $schoolId: String!) {
        getClassesAndGroupsForFeedbackFilter(periodIndex: $periodIndex, teacherId: $teacherId, schoolId: $schoolId) {
            id
            name
            isMyClass
            hasReadingTopics
            topicCount
            isGroupAcrossClasses
            hasCurrentTopic
            isReadyTeddyEnabled
            subjects {
                id
                name
                programmeType
            }
            classGroups {
                id
                name
                hasReadingTopics
                topicCount
                hasCurrentTopic
                isReadyTeddyEnabled
                subjects {
                    id
                    name
                    programmeType
                }
            }
        }
    }
`;

const getStaticPeriodsForFeedbackFilter = gql`
    query getStaticPeriodsForFeedbackFilter($teacherId: String!, $schoolId: String!) {
        getStaticPeriodsForFeedbackFilter(teacherId: $teacherId, schoolId: $schoolId) {
            index
            longName
            shortName
        }
    }
`;

type TecherActivityFeedFilterProps = {
    user: any;
    haveUnTickedFeedbacks: boolean;
    _fetchMore: any;
    showUntickFeedback?: boolean;
    isLoading: boolean;
    setOnChangeLoading: (loading: boolean) => void;
    setAborter?: (aborter: AbortController | null) => void;
    aborter?: AbortController | null;
    schoolId: string;
    schoolDetails: ILwpSchool;
};

const TecherActivityFeedFilter = ({
    user,
    haveUnTickedFeedbacks,
    _fetchMore,
    showUntickFeedback,
    isLoading,
    setOnChangeLoading,
    aborter,
    setAborter,
    schoolId,
    schoolDetails
}: TecherActivityFeedFilterProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const router = useRouter();
    const searchParams = useSearchParams();

    const expandMore = searchParams.get('expandMore') === 'true';
    const [open, setOpen] = useState(expandMore);
    const [openClander, setOpenClander] = useState(false);

    // The previous-academic-year "When" chip is only offered in September (D3), so the static
    // periods (which drive it) must be fetched then even while the filter is collapsed.
    const isSeptember = new Date().getMonth() === 8;

    const selectDateType = useRef('day');

    const academicYear = searchParams.get('academicYear') ? searchParams.get('academicYear') : null;
    const isFilter = searchParams.get('isFilter') === 'true';

    const [loadClassesForFeedbackFilter, { error, data, loading: classLoading }] = useLazyQuery(getClassesAndGroupsForFeedbackFilter);

    const noClassesForSelectedAcademicYear = data && data?.getClassesAndGroupsForFeedbackFilter?.length === 0;

    const {
        error: allStaticPeriodsError,
        data: allStaticPeriodsData,
        loading: periodIndexloading
    } = useQuery(getStaticPeriodsForFeedbackFilter, {
        variables: { teacherId: user?.id, schoolId },
        skip: !((open || noClassesForSelectedAcademicYear || isSeptember) && user) || !schoolId
    });

    useEffect(() => {
        if (user && schoolId) {
            loadClassesForFeedbackFilter({
                variables: { periodIndex: academicYear, teacherId: user?.id, schoolId }
            });
        }
    }, [user, academicYear, schoolId]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, allStaticPeriodsError);
    }, [error, allStaticPeriodsError]);

    const formatClasses = (classes, isGroupAcrossClasses) => {
        return (
            classes
                ?.filter((x) => x.isGroupAcrossClasses === isGroupAcrossClasses)
                ?.map((item) => ({ ...item, key: item.id, value: item.name })) ?? []
        );
    };

    const options = [{ key: 'ALL', value: 'All' }];

    const schoolClasses = formatClasses(data?.getClassesAndGroupsForFeedbackFilter, false);
    const groupsAcrossClasses = formatClasses(data?.getClassesAndGroupsForFeedbackFilter, true);

    if (schoolClasses.length > 0) {
        options.push({
            key: 'selectClass',
            value: ''
        });
    }

    if (groupsAcrossClasses.length > 0) {
        options.push({
            key: 'selectGroupAcrossClasses',
            value: ''
        });
    }

    // Prefer the viewed school's period so the academic-year options (and the September
    // previous-year chip) describe the feed actually on screen rather than the viewer's own school.
    const currentPeriod = schoolDetails?.curentPeriod;

    const getAcademicYear = [
        // "Current year onwards" is relabelled to the concrete period's short name, e.g. "25-26 onwards".
        // The current period is already represented by this "onwards" entry, so it is filtered out of the
        // specific-year options below to avoid showing it twice.
        { key: null, value: currentPeriod?.shortName ? `${currentPeriod.shortName} onwards` : 'Current year onwards' },
        ...(allStaticPeriodsData?.getStaticPeriodsForFeedbackFilter
            ?.filter((item) => +item.index !== +currentPeriod?.index)
            ?.map((item) => ({ ...item, key: item.index, value: item.shortName })) ?? [])
    ];

    const currentAcademicYear = getAcademicYear?.find((x) => x.index == currentPeriod?.index);

    // The previous academic year is only offered as a collapsed "When" chip in September, and only
    // when the teacher still has active classes in that period (getStaticPeriodsForFeedbackFilter is
    // already teacher-scoped and ACTIVE-only, so its presence in the list is the exact condition).
    const previousPeriod = allStaticPeriodsData?.getStaticPeriodsForFeedbackFilter?.find((x) => +x.index === +currentPeriod?.index - 1);
    const showPreviousYearChip = isSeptember && !!previousPeriod && !!currentPeriod?.index;

    const getFiltervalues = () => {
        const classIds = searchParams.get('classIds') ? JSON.parse(searchParams.get('classIds')) : [];
        const groupAcrossClassesIds = searchParams.get('groupAcrossClassesIds')
            ? JSON.parse(searchParams.get('groupAcrossClassesIds'))
            : [];
        const classGroups = searchParams.get('classGroups');
        const media = searchParams.get('media');
        const week = searchParams.get('week');

        const sharingPermitted = searchParams.get('sharingPermitted') == 'true';

        const showOnlyUntickFeed = searchParams.get('showOnlyUntickFeed')
            ? searchParams.get('showOnlyUntickFeed') == 'true'
            : haveUnTickedFeedbacks;

        const academicYear = searchParams.get('academicYear') ?? null;
        const postedBefore = searchParams.get('postedBefore') ?? null;
        const postedAfter = searchParams.get('postedAfter') ?? null;
        const bookName = searchParams.get('bookName') ? searchParams.get('bookName') : '';

        const subject = searchParams.get('subject');

        const foundClass = data?.getClassesAndGroupsForFeedbackFilter?.find((x) => classIds?.includes(x.id));
        const foundGroupAcrossClasses = data?.getClassesAndGroupsForFeedbackFilter?.find((x) => groupAcrossClassesIds?.includes(x.id));
        const foundMedia = mediaTypes?.find((x) => x.key == media);
        const foundWeek = weekOptions?.find((x) => x.key == week);
        const foundAcademicYear = getAcademicYear?.find((x) => +x.key == +academicYear);
        const foundGroup = (foundClass?.classGroups || [])?.find((x) => +x.id == +classGroups);

        const allSubjectOptions =
            data?.getClassesAndGroupsForFeedbackFilter?.flatMap((x) => [
                ...(x?.subjects ?? []),
                ...(x?.classGroups ?? []).flatMap((group) => group?.subjects ?? [])
            ]) ?? [];
        const matchedSubject = allSubjectOptions?.find((x) => x.id == subject);
        const foundSubject =
            subject == readingAsASubjectId
                ? { key: readingAsASubjectId, value: readingAsASubjectName }
                : matchedSubject
                  ? { ...matchedSubject, key: matchedSubject.id, value: matchedSubject.name }
                  : null;

        // The Activity row now drives feedbackType. Old bookmarked URLs may still carry the retired
        // `activity` param, so map it onto the content-type filter for back-compat (best effort):
        // reading -> Reading, topics -> Topics (ACTIVITY); the time-flavoured values fall back to All.
        const legacyActivity = searchParams.get('activity');
        const legacyActivityToFeedbackType = {
            ALL_READING: FeedbackType.READING,
            ALL_TOPIC: FeedbackType.ACTIVITY
        };
        const feedbackTypeParam = searchParams.get('feedbackType');
        const effectiveFeedbackTypeKey =
            feedbackTypeParam ?? (legacyActivity ? (legacyActivityToFeedbackType[legacyActivity] ?? 'ALL') : null);
        const foundFeedbackType = feedbackTypeOptions?.find((x) => x.key == effectiveFeedbackTypeKey);

        const payload = {
            classIds: foundClass ? { ...foundClass, key: foundClass?.id, value: foundClass.name } : { key: 'ALL', value: 'All' },
            groupAcrossClassesIds: foundGroupAcrossClasses
                ? { ...foundGroupAcrossClasses, key: foundGroupAcrossClasses?.id, value: foundGroupAcrossClasses.name }
                : { key: 'ALL', value: 'All' },
            classGroups: foundGroup ? { ...foundGroup, key: foundGroup?.id, value: foundGroup.name } : { key: 'ALL', value: 'All' },
            subject: foundSubject ? foundSubject : { key: 'ALL', value: 'All' },
            feedbackType: foundFeedbackType ? foundFeedbackType : { key: 'ALL', value: 'All' },
            media: foundMedia ? foundMedia : { key: 'ALL', value: 'All' },
            week: foundWeek ? foundWeek.key : null,
            sharingPermitted: sharingPermitted,
            academicYear: foundAcademicYear ? foundAcademicYear : currentAcademicYear,
            showOnlyUntickFeed: showOnlyUntickFeed,
            postedBefore: postedBefore ? new Date(postedBefore) : null,
            postedAfter: postedAfter ? new Date(postedAfter) : null,
            bookName
        };

        return payload;
    };

    const filter = getFiltervalues();

    const _handleChange = (name, value, setFieldValue, debouncedHandleSubmit) => {
        setFieldValue(name, value);
        resetFormikValue(name, setFieldValue);
        debouncedHandleSubmit();
        setOnChangeLoading(true);
        if (isLoading) {
            aborter?.abort();
            setAborter(new AbortController());
        }
    };

    const filterActivity = (item) => {
        const classGroups = [{ key: 'ALL', value: 'All' }];
        const isAllClasses = item.classIds?.key === 'ALL' && item.groupAcrossClassesIds?.key === 'ALL';

        const isGroup = item.classGroups?.key !== 'ALL';

        const checkCondition = (data, conditionKey) => {
            if (isGroup) {
                return item.classGroups?.[conditionKey];
            } else if (item?.classIds?.key !== 'ALL' && item?.groupAcrossClassesIds?.key === 'ALL') {
                return item?.classIds?.[conditionKey];
            } else if (item?.classIds?.key === 'ALL' && item?.groupAcrossClassesIds?.key !== 'ALL') {
                return item?.groupAcrossClassesIds?.[conditionKey];
            } else if (isAllClasses) {
                return data?.getClassesAndGroupsForFeedbackFilter?.some((x) => x?.[conditionKey]);
            } else {
                return false;
            }
        };

        // Relevance signals for the current class/group selection.
        const hasReadingTopics = checkCondition(data, 'hasReadingTopics');
        const hasTopics = !!checkCondition(data, 'topicCount');
        const isReadyTeddyEnabled = !!checkCondition(data, 'isReadyTeddyEnabled');

        if (item?.classIds?.classGroups?.length > 0) {
            const groups = item?.classIds?.classGroups?.map((group) => ({ ...group, key: group?.id, value: group.name }));

            classGroups.push(...groups);
        }

        // has topic and has reading topics too
        const showMedia = hasTopics || hasReadingTopics;

        const getSubjectsForSelection = () => {
            if (isGroup) {
                return item?.classGroups?.subjects ?? [];
            } else if (item?.classIds?.key !== 'ALL' && item?.groupAcrossClassesIds?.key === 'ALL') {
                return item?.classIds?.subjects ?? [];
            } else if (item?.classIds?.key === 'ALL' && item?.groupAcrossClassesIds?.key !== 'ALL') {
                return item?.groupAcrossClassesIds?.subjects ?? [];
            } else if (isAllClasses) {
                return (
                    data?.getClassesAndGroupsForFeedbackFilter?.flatMap((x) => [
                        ...(x?.subjects ?? []),
                        ...(x?.classGroups ?? []).flatMap((group) => group?.subjects ?? [])
                    ]) ?? []
                );
            }

            return [];
        };

        const uniqueSubjects = getSubjectsForSelection().filter(
            (subject, index, subjects) => subjects.findIndex((x) => x?.id === subject?.id) === index
        );

        // The filter rows form a top-to-bottom waterfall (Class > Class groups > Activity > Subject >
        // Media > ...): each row depends only on the rows ABOVE it, never on the ones below. So the
        // Activity row is driven purely by what the class supports and is unaffected by the subject
        // selected beneath it - selecting a subject leaves the Activity row visible with its choice intact.
        const selectedTypeKey = item?.feedbackType?.key;
        const isAllType = !selectedTypeKey || selectedTypeKey === 'ALL';

        // Content-type ("Activity") row: All | Reading | Topics | Scrapbook. Options depend only on the
        // class's content (rows above), not on the subject below.
        const activityTypeArr = [{ key: 'ALL', value: 'All' }];

        if (hasReadingTopics) {
            activityTypeArr.push({ key: FeedbackType.READING, value: 'Reading' });
        }

        if (hasTopics) {
            activityTypeArr.push({ key: FeedbackType.ACTIVITY, value: 'Topics' });
        }

        // Scrapbook entries can be spontaneous (no topic), so the Ready Teddy licence flag is the true signal.
        if (isReadyTeddyEnabled) {
            activityTypeArr.push({ key: FeedbackType.SCRAPBOOK, value: 'Scrapbook' });
        }

        // Hidden only when fewer than two content types are relevant (a single one is implicit).
        const relevantTypeCount = activityTypeArr.length - 1;
        const showActivityType = relevantTypeCount >= 2;

        const subjectArr = [
            { key: 'ALL', value: 'All' },
            ...uniqueSubjects.map((subject) => ({ ...subject, key: subject.id, value: subject.name }))
        ];

        // Reading logs are not linked to a topic/subject, so reading is offered as a pseudo-subject,
        // but only when the content-type filter is All or Reading (the other types exclude reading logs).
        if ((isAllType || selectedTypeKey === FeedbackType.READING) && hasReadingTopics) {
            subjectArr.push({ key: readingAsASubjectId, value: readingAsASubjectName });
        }

        // The Subject row sits below the Activity row, so the selected content type governs whether it
        // applies: only All or Topics (activity) feedback carries a subject. A single subject is implicit.
        const showSubject = (isAllType || selectedTypeKey === FeedbackType.ACTIVITY) && subjectArr.length > 2;

        // Audio only exists on reading logs, so it is offered only while reading logs are in scope.
        const showAudio = hasReadingTopics && (isAllType || selectedTypeKey === FeedbackType.READING);

        return {
            activityTypeArr,
            showActivityType,
            showAudio,
            showMedia,
            classGroups,
            hasReadingTopics,
            subjectArr,
            showSubject
        };
    };

    const getIdsForMyClasses = (data) => {
        return data
            .flatMap((item) => {
                const classGroupIds = item.classGroups ? item.classGroups.map((group) => group.id) : [];

                return [...classGroupIds, item?.id];
            })
            .filter((id) => id);
    };

    const _onSubmit = async (values, expandMore = !!open, updateURL = true) => {
        const formatDate = (date, isBefore = false) => (date ? _get_date_format(date, isBefore)?.toString() : null);
        const getKey = (item) => (item?.key === 'ALL' ? [] : getIdsForMyClasses([item]));

        const groups = values?.classGroups?.key !== 'ALL' ? values?.classGroups?.id : null;
        const schoolClassKeys = getKey(values?.classIds);
        const groupAcrossClassesKeys = getKey(values?.groupAcrossClassesIds);

        const subjects = values?.subject?.key && values?.subject?.key !== 'ALL' ? [values?.subject?.key] : [];
        const feedbackTypes = values?.feedbackType?.key && values?.feedbackType?.key !== 'ALL' ? [values?.feedbackType?.key] : [];

        // A "This week" / "Last week" selection is stored as `week` and translated into posted-date
        // bounds here for the query; the raw dates are not persisted to the URL (the week param is).
        // Week bounds are exact ISO-week edges (Monday 00:00), so they are sent as-is rather than
        // through formatDate's day-rounding (which would push "Last week" out to end-of-Monday and
        // diverge from searchfeedInput's raw bounds). Manual From/To dates keep the day-rounding.
        const isWeekSelected = values?.week === 'THIS_WEEK' || values?.week === 'LAST_WEEK';
        const weekRange = getWeekPostedRange(values?.week);

        const payload = {
            postedBefore: isWeekSelected
                ? (weekRange.postedBefore?.toString() ?? null)
                : values?.postedBefore
                  ? formatDate(values?.postedBefore, true)
                  : null,
            postedAfter: isWeekSelected
                ? (weekRange.postedAfter?.toString() ?? null)
                : values?.postedAfter
                  ? formatDate(values?.postedAfter)
                  : null,
            classIds: groups ? [groups] : [...schoolClassKeys, ...groupAcrossClassesKeys],
            media: values?.media?.key,
            sharingPermitted: values?.sharingPermitted,
            showOnlyUntickFeed: values?.showOnlyUntickFeed,
            bookName: values?.bookName,
            academicYear: values?.academicYear ? values?.academicYear?.key : null
        };

        await _fetchMore(0, { ...payload, subjects, feedbackTypes });

        if (updateURL) {
            // Preserve school/id/feed route structure if on that path
            const pathname = router?.query?.school_id ? `/school/${router.query.school_id}/feed` : `/feed/${router?.query?.user_id}`;

            router?.push({
                pathname,
                query: {
                    ...payload,
                    // Persist the week selection (bookmark-safe); the raw week dates are recomputed on read.
                    postedAfter: isWeekSelected ? null : payload.postedAfter,
                    postedBefore: isWeekSelected ? null : payload.postedBefore,
                    week: isWeekSelected ? values?.week : null,
                    subject: subjects[0] ?? null,
                    feedbackType: feedbackTypes[0] ?? null,
                    classIds: JSON.stringify(getKey(values?.classIds)),
                    groupAcrossClassesIds: JSON.stringify(getKey(values?.groupAcrossClassesIds)),
                    classGroups: groups,
                    expandMore,
                    isFilter: true
                }
            });
        }
    };

    const resetFormikValue = (name = null, setFieldValue) => {
        switch (name) {
            case 'classIds':

            case 'groupAcrossClassesIds':
                setFieldValue('classGroups', { key: 'ALL', value: 'All' });
                setFieldValue('media', { key: 'ALL', value: 'All' });
                setFieldValue('subject', { key: 'ALL', value: 'All' });
                setFieldValue('feedbackType', { key: 'ALL', value: 'All' });
                break;

            case 'classGroups':
                setFieldValue('feedbackType', { key: 'ALL', value: 'All' });
                setFieldValue('subject', { key: 'ALL', value: 'All' });
                setFieldValue('media', { key: 'ALL', value: 'All' });
                break;

            // Activity (content-type) sits above Subject and Media; changing it resets both below it.
            case 'feedbackType':
                setFieldValue('subject', { key: 'ALL', value: 'All' });
                setFieldValue('media', { key: 'ALL', value: 'All' });
                break;

            // Subject sits above Media only; changing it resets Media but leaves the Activity row above intact.
            case 'subject':
                setFieldValue('media', { key: 'ALL', value: 'All' });
                break;

            // Selecting "This week" / "Last week" clears any explicit From/To dates. Both windows sit in
            // the current period, so the academic year returns to the default "current year onwards" - a
            // past year can have no entries in either week. The class selections belong to the year being
            // left, so they go too (as on any year change); Activity/Subject/Media are period-agnostic.
            case 'week':
                setFieldValue('postedAfter', null);
                setFieldValue('postedBefore', null);
                if (filter?.academicYear?.key) {
                    setFieldValue('academicYear', getAcademicYear?.[0]);
                    setFieldValue('classIds', { key: 'ALL', value: 'All' });
                    setFieldValue('groupAcrossClassesIds', { key: 'ALL', value: 'All' });
                    setFieldValue('classGroups', { key: 'ALL', value: 'All' });
                }

                break;

            // Setting an explicit From/To date clears the week selection.
            case 'postedAfter':

            case 'postedBefore':
                setFieldValue('week', null);
                break;

            case 'academicYear':
                setFieldValue('classIds', { key: 'ALL', value: 'All' });
                setFieldValue('groupAcrossClassesIds', { key: 'ALL', value: 'All' });
                setFieldValue('classGroups', { key: 'ALL', value: 'All' });
                setFieldValue('media', { key: 'ALL', value: 'All' });
                setFieldValue('subject', { key: 'ALL', value: 'All' });
                setFieldValue('feedbackType', { key: 'ALL', value: 'All' });
                setFieldValue('week', null);
                setFieldValue('sharingPermitted', false);
                setFieldValue('postedAfter', null);
                setFieldValue('postedBefore', null);
                setFieldValue('bookName', '');
                break;

            case 'default':
                setFieldValue('classIds', { key: 'ALL', value: 'All' });
                setFieldValue('groupAcrossClassesIds', { key: 'ALL', value: 'All' });
                setFieldValue('classGroups', { key: 'ALL', value: 'All' });
                setFieldValue('media', { key: 'ALL', value: 'All' });
                setFieldValue('subject', { key: 'ALL', value: 'All' });
                setFieldValue('feedbackType', { key: 'ALL', value: 'All' });
                setFieldValue('week', null);
                setFieldValue('sharingPermitted', false);
                setFieldValue('postedAfter', null);
                setFieldValue('postedBefore', null);
                setFieldValue('showOnlyUntickFeed', true);
                setFieldValue('bookName', '');
                break;
        }
    };

    const loading = classLoading || periodIndexloading;

    useEffect(() => {
        if (!(isLoading || loading)) {
            _onSubmit(filter, false, !isFilter);
        }
    }, [isFilter, !!data]);

    return (
        <>
            <Collapse in={!loading} timeout={0} unmountOnExit>
                <CommonCard>
                    <Formik
                        initialValues={filter}
                        validationSchema={TeacherActivityFeedsFilterValidation}
                        onSubmit={(values) => {
                            _onSubmit(values);
                        }}>
                        {({ values, setFieldValue, handleSubmit, touched, errors }) => {
                            const debouncedHandleSubmit = useMemo(() => debounce(handleSubmit, 1000), [handleSubmit]);

                            const selectedSchoolClass = !!schoolClasses?.find?.((x) => x.key == values?.classIds?.key);
                            const selectedGroupAcrossClasses = !!groupsAcrossClasses?.find?.(
                                (x) => x.key == values?.groupAcrossClassesIds?.key
                            );

                            const {
                                activityTypeArr,
                                showActivityType,
                                showAudio,
                                showMedia,
                                classGroups,
                                hasReadingTopics,
                                subjectArr,
                                showSubject
                            } = filterActivity(values);

                            const isWeekSelected = values?.week === 'THIS_WEEK' || values?.week === 'LAST_WEEK';
                            // In the collapsed "When" row, the previous-year chip is selected when the
                            // chosen academic year is the previous period; otherwise "This academic year"
                            // is the resting state (unless a week chip is active).
                            const isPreviousYearSelected = showPreviousYearChip && +values?.academicYear?.key === +previousPeriod?.index;
                            const isThisAcademicYearSelected = !isWeekSelected && !isPreviousYearSelected;

                            // Shared handler for the previous-year / academic-year chips + dropdown: they change
                            // the fetched period, so they reload the route (re-querying classes) like the dropdown.
                            const selectAcademicYear = (yearItem) => {
                                router.push({
                                    pathname: router.pathname,
                                    query: {
                                        ...router.query,
                                        postedBefore: null,
                                        postedAfter: null,
                                        week: null,
                                        classIds: [],
                                        groupAcrossClassesIds: [],
                                        media: null,
                                        sharingPermitted: false,
                                        showOnlyUntickFeed: true,
                                        academicYear: yearItem.key,
                                        expandMore: open
                                    }
                                });

                                _handleChange('academicYear', yearItem, setFieldValue, debouncedHandleSubmit);
                            };

                            return (
                                <Grid className="teacher_feeds_filter_container">
                                    {data?.getClassesAndGroupsForFeedbackFilter?.length > 1 && (
                                        <>
                                            {open && <Heading3 text="Class:" />}
                                            <ToggleButtonGroup color="primary" className="btn_group">
                                                {options?.map((item, i) =>
                                                    item?.key == 'selectClass' ? (
                                                        <ToggleButton
                                                            value={item}
                                                            className={`${selectedSchoolClass && 'class-selected'} drop_down_btn`}>
                                                            <CommonPopOver
                                                                className={'drop_down_btn_container'}
                                                                element={
                                                                    <Grid
                                                                        container
                                                                        width={'max-content'}
                                                                        alignItems={'center'}
                                                                        justifyContent={'center'}
                                                                        m={'auto'}
                                                                        gap={1}>
                                                                        <span>
                                                                            {selectedSchoolClass ? values?.classIds?.value : 'Select class'}
                                                                        </span>
                                                                        <span className={`material-icons`}>expand_more</span>
                                                                    </Grid>
                                                                }>
                                                                {schoolClasses?.map((item) => (
                                                                    <Grid
                                                                        py={'12px'}
                                                                        px={'14px'}
                                                                        className="cp"
                                                                        onClick={() => {
                                                                            setFieldValue('groupAcrossClassesIds', {
                                                                                key: 'ALL',
                                                                                value: 'All'
                                                                            });
                                                                            _handleChange(
                                                                                'classIds',
                                                                                item,
                                                                                setFieldValue,
                                                                                debouncedHandleSubmit
                                                                            );
                                                                        }}>
                                                                        {item?.value}
                                                                    </Grid>
                                                                ))}
                                                            </CommonPopOver>
                                                        </ToggleButton>
                                                    ) : item?.key == 'selectGroupAcrossClasses' ? (
                                                        <ToggleButton
                                                            value={item}
                                                            className={`${selectedGroupAcrossClasses && 'class-selected'} drop_down_btn`}>
                                                            <CommonPopOver
                                                                className={'drop_down_btn_container'}
                                                                element={
                                                                    <Grid
                                                                        container
                                                                        width={'max-content'}
                                                                        alignItems={'center'}
                                                                        justifyContent={'center'}
                                                                        m={'auto'}
                                                                        gap={1}>
                                                                        <span>
                                                                            {selectedGroupAcrossClasses
                                                                                ? values?.groupAcrossClassesIds?.value
                                                                                : 'Select group across classes'}
                                                                        </span>
                                                                        <span className={`material-icons`}>expand_more</span>
                                                                    </Grid>
                                                                }>
                                                                {groupsAcrossClasses?.map((item) => (
                                                                    <Grid
                                                                        py={'12px'}
                                                                        px={'14px'}
                                                                        className="cp"
                                                                        onClick={() => {
                                                                            setFieldValue('classIds', {
                                                                                key: 'ALL',
                                                                                value: 'All'
                                                                            });
                                                                            _handleChange(
                                                                                'groupAcrossClassesIds',
                                                                                item,
                                                                                setFieldValue,
                                                                                debouncedHandleSubmit
                                                                            );
                                                                        }}>
                                                                        {item?.value}
                                                                    </Grid>
                                                                ))}
                                                            </CommonPopOver>
                                                        </ToggleButton>
                                                    ) : (
                                                        <ToggleButton
                                                            value={item}
                                                            onClick={() => {
                                                                setFieldValue('classIds', item);
                                                                setFieldValue('groupAcrossClassesIds', { key: 'ALL', value: 'All' });
                                                                resetFormikValue('classIds', setFieldValue);
                                                                debouncedHandleSubmit();
                                                                setOnChangeLoading(true);
                                                                if (isLoading) {
                                                                    aborter?.abort();
                                                                    setAborter(new AbortController());
                                                                }
                                                            }}
                                                            className={`${values?.classIds?.key === item?.key && 'class-selected'} ${
                                                                i == 0 && 'fix_all_width'
                                                            }`}>
                                                            <Paragraph text={item?.value} />
                                                        </ToggleButton>
                                                    )
                                                )}
                                            </ToggleButtonGroup>
                                            <br />
                                            <br />
                                        </>
                                    )}

                                    {classGroups?.length > 1 && (
                                        <>
                                            {open && <Heading3 text="Class groups:" />}
                                            <ToggleButtonGroup color="primary" className="btn_group">
                                                {classGroups?.map((group, i) => (
                                                    <ToggleButton
                                                        value={group}
                                                        onClick={() =>
                                                            _handleChange('classGroups', group, setFieldValue, debouncedHandleSubmit)
                                                        }
                                                        className={`${values?.classGroups?.key === group?.key && 'class-selected'} ${
                                                            i == 0 && 'fix_all_width'
                                                        }`}>
                                                        <Paragraph text={group?.value} />
                                                    </ToggleButton>
                                                ))}
                                            </ToggleButtonGroup>
                                            <br />
                                            <br />
                                        </>
                                    )}

                                    {showActivityType && (
                                        <>
                                            {open && <Heading3 text="Activity:" />}
                                            <ToggleButtonGroup color="primary" className="btn_group" data-test="activity-filter-row">
                                                {activityTypeArr?.map((item, i) => (
                                                    <ToggleButton
                                                        value={item}
                                                        data-test={`activity-filter-${item?.key}`}
                                                        onClick={() =>
                                                            _handleChange('feedbackType', item, setFieldValue, debouncedHandleSubmit)
                                                        }
                                                        className={`${values?.feedbackType?.key === item?.key && 'class-selected'} ${
                                                            i == 0 && 'fix_all_width'
                                                        }`}>
                                                        <Paragraph text={item?.value} />
                                                    </ToggleButton>
                                                ))}
                                            </ToggleButtonGroup>
                                            <br />
                                            <br />
                                        </>
                                    )}

                                    {open && showSubject && (
                                        <>
                                            <Heading3 text="Subject:" />
                                            <ToggleButtonGroup color="primary" className="btn_group" data-test="subject-filter-row">
                                                {subjectArr?.map((item, i) => (
                                                    <ToggleButton
                                                        value={item}
                                                        data-test={`subject-filter-${item?.key}`}
                                                        onClick={() => _handleChange('subject', item, setFieldValue, debouncedHandleSubmit)}
                                                        className={`${values?.subject?.key === item?.key && 'class-selected'} ${
                                                            i == 0 && 'fix_all_width'
                                                        }`}>
                                                        <Paragraph text={item?.value} />
                                                    </ToggleButton>
                                                ))}
                                            </ToggleButtonGroup>
                                            <br />
                                            <br />
                                        </>
                                    )}

                                    {open && showMedia && (
                                        <>
                                            <Heading3 text="Media and sharing:" />
                                            <Grid container spacing={2}>
                                                <Grid item flex={1}>
                                                    <ToggleButtonGroup color="primary" className="btn_group" data-test="media-filter-row">
                                                        {mediaTypes
                                                            ?.filter((x) => (showAudio ? true : x.key != 'HAS_AUDIO'))
                                                            ?.map((item, i) => (
                                                                <ToggleButton
                                                                    value={item}
                                                                    data-test={`media-filter-${item?.key}`}
                                                                    onClick={() =>
                                                                        _handleChange('media', item, setFieldValue, debouncedHandleSubmit)
                                                                    }
                                                                    className={`${values?.media?.key === item?.key && 'class-selected'} ${
                                                                        i == 0 && 'fix_all_width'
                                                                    }`}>
                                                                    <Paragraph text={item?.value} />
                                                                </ToggleButton>
                                                            ))}
                                                    </ToggleButtonGroup>
                                                </Grid>

                                                <Grid
                                                    item
                                                    display={'flex'}
                                                    justifyContent={{
                                                        sm: 'flex-start',
                                                        md: 'flex-end'
                                                    }}>
                                                    <CommonSwitch
                                                        name="sharingPermitted"
                                                        dataTest="sharing-filter-switch"
                                                        onClick={() =>
                                                            _handleChange(
                                                                'sharingPermitted',
                                                                !values?.sharingPermitted,
                                                                setFieldValue,
                                                                debouncedHandleSubmit
                                                            )
                                                        }
                                                        label={'Only show entries with sharing permitted'}
                                                        checked={values?.sharingPermitted}
                                                    />
                                                </Grid>
                                            </Grid>
                                            <br />
                                        </>
                                    )}

                                    {/* Collapsed "When" row: everyday time presets. Academic-year chips reload the
                                        route (re-querying classes for the period); week chips just adjust dates. */}
                                    {!open && !noClassesForSelectedAcademicYear && (
                                        <>
                                            <ToggleButtonGroup color="primary" className="btn_group" data-test="when-filter-row">
                                                <ToggleButton
                                                    value={'THIS_ACADEMIC_YEAR'}
                                                    data-test="when-filter-THIS_ACADEMIC_YEAR"
                                                    onClick={() => selectAcademicYear({ key: null, value: getAcademicYear?.[0]?.value })}
                                                    className={`${isThisAcademicYearSelected && 'class-selected'} fix_all_width`}>
                                                    <Paragraph text="This year" />
                                                </ToggleButton>
                                                <ToggleButton
                                                    value={'THIS_WEEK'}
                                                    data-test="when-filter-THIS_WEEK"
                                                    onClick={() => _handleChange('week', 'THIS_WEEK', setFieldValue, debouncedHandleSubmit)}
                                                    className={`${values?.week === 'THIS_WEEK' && 'class-selected'}`}>
                                                    <Paragraph text="This week" />
                                                </ToggleButton>
                                                <ToggleButton
                                                    value={'LAST_WEEK'}
                                                    data-test="when-filter-LAST_WEEK"
                                                    onClick={() => _handleChange('week', 'LAST_WEEK', setFieldValue, debouncedHandleSubmit)}
                                                    className={`${values?.week === 'LAST_WEEK' && 'class-selected'}`}>
                                                    <Paragraph text="Last week" />
                                                </ToggleButton>
                                                {showPreviousYearChip && (
                                                    <ToggleButton
                                                        value={'PREVIOUS_YEAR'}
                                                        data-test="when-filter-PREVIOUS_YEAR"
                                                        onClick={() =>
                                                            selectAcademicYear({
                                                                key: previousPeriod?.index,
                                                                value: previousPeriod?.longName
                                                            })
                                                        }
                                                        className={`${isPreviousYearSelected && 'class-selected'}`}>
                                                        <Paragraph text={previousPeriod?.shortName} />
                                                    </ToggleButton>
                                                )}
                                            </ToggleButtonGroup>
                                            <br />
                                            <br />
                                        </>
                                    )}

                                    {/* Expanded "When" section: academic-year dropdown, week chips, and From/To pickers. */}
                                    {(open || noClassesForSelectedAcademicYear) && (
                                        <>
                                            <Heading3 text="When:" />
                                            <Grid container spacing={2} mb={2}>
                                                <Grid item lg={4}>
                                                    <ToggleButtonGroup color="primary" className="btn_group">
                                                        <CommonPopOver
                                                            className="academic_year_dropdown"
                                                            element={
                                                                <ToggleButton
                                                                    value={'item'}
                                                                    className={values?.academicYear?.value && 'class-selected'}>
                                                                    <Grid
                                                                        display={'flex'}
                                                                        alignItems={'center'}
                                                                        justifyContent={'center '}
                                                                        gap={1}
                                                                        width={'100%'}>
                                                                        <span>
                                                                            {values?.academicYear?.value ?? getAcademicYear?.[0]?.value}
                                                                        </span>
                                                                        <span className={`material-icons`}>expand_more</span>
                                                                    </Grid>
                                                                </ToggleButton>
                                                            }>
                                                            {getAcademicYear?.map((item) => (
                                                                <Grid
                                                                    py={'12px'}
                                                                    px={'14px'}
                                                                    className="cp"
                                                                    onClick={() => {
                                                                        router.push({
                                                                            pathname: router.pathname,
                                                                            query: {
                                                                                ...router.query,
                                                                                postedBefore: null,
                                                                                postedAfter: null,
                                                                                week: null,
                                                                                classIds: [],
                                                                                groupAcrossClassesIds: [],
                                                                                media: null,
                                                                                sharingPermitted: false,
                                                                                showOnlyUntickFeed: true,
                                                                                academicYear: item.key,
                                                                                expandMore: true
                                                                            }
                                                                        });

                                                                        _handleChange(
                                                                            'academicYear',
                                                                            item,
                                                                            setFieldValue,
                                                                            debouncedHandleSubmit
                                                                        );

                                                                        setOpen(true);
                                                                    }}>
                                                                    {item?.value}
                                                                </Grid>
                                                            ))}
                                                        </CommonPopOver>
                                                    </ToggleButtonGroup>
                                                </Grid>
                                                <Grid item lg={8}>
                                                    <Grid container spacing={2}>
                                                        <Grid item>
                                                            <ToggleButtonGroup
                                                                color="primary"
                                                                className="btn_group"
                                                                data-test="when-filter-week-row">
                                                                <ToggleButton
                                                                    value={'THIS_WEEK'}
                                                                    data-test="when-filter-THIS_WEEK"
                                                                    onClick={() =>
                                                                        _handleChange(
                                                                            'week',
                                                                            'THIS_WEEK',
                                                                            setFieldValue,
                                                                            debouncedHandleSubmit
                                                                        )
                                                                    }
                                                                    className={`${values?.week === 'THIS_WEEK' && 'class-selected'}`}>
                                                                    <Paragraph text="This week" />
                                                                </ToggleButton>
                                                                <ToggleButton
                                                                    value={'LAST_WEEK'}
                                                                    data-test="when-filter-LAST_WEEK"
                                                                    onClick={() =>
                                                                        _handleChange(
                                                                            'week',
                                                                            'LAST_WEEK',
                                                                            setFieldValue,
                                                                            debouncedHandleSubmit
                                                                        )
                                                                    }
                                                                    className={`${values?.week === 'LAST_WEEK' && 'class-selected'}`}>
                                                                    <Paragraph text="Last week" />
                                                                </ToggleButton>
                                                            </ToggleButtonGroup>
                                                        </Grid>
                                                        <Grid item flex={1}>
                                                            <ToggleButtonGroup color="primary" className="btn_group">
                                                                {dateBtn?.map((item) => {
                                                                    const selectedDate = values[item?.key];
                                                                    const today = new Date();

                                                                    return (
                                                                        <ToggleButton
                                                                            value={item}
                                                                            className={`${selectedDate && 'class-selected'} drop_down_btn`}>
                                                                            <CommonPopOver
                                                                                className={'drop_down_btn_container'}
                                                                                closeOnClick={false}
                                                                                isOpen={openClander}
                                                                                setIsOpen={(e) => {
                                                                                    if (e) {
                                                                                        selectDateType.current = 'day';
                                                                                        setOpenClander(e);
                                                                                    }
                                                                                }}
                                                                                element={
                                                                                    <Grid
                                                                                        container
                                                                                        width={'max-content'}
                                                                                        alignItems={'center'}
                                                                                        justifyContent={'center'}
                                                                                        m={'auto'}
                                                                                        gap={1}>
                                                                                        <span>
                                                                                            {item?.value}:
                                                                                            {selectedDate
                                                                                                ? ` ${moment(selectedDate).format(
                                                                                                      'DD/MM/YYYY'
                                                                                                  )}`
                                                                                                : ` --`}
                                                                                        </span>

                                                                                        <span className={`material-icons`}>date_range</span>
                                                                                        <span className={`material-icons`}>
                                                                                            expand_more
                                                                                        </span>
                                                                                    </Grid>
                                                                                }>
                                                                                <DateCalendar
                                                                                    className="drop_down_date_picker"
                                                                                    maxDate={today}
                                                                                    value={selectedDate ?? today}
                                                                                    onViewChange={(e) => {
                                                                                        selectDateType.current = e;
                                                                                    }}
                                                                                    onChange={(e) => {
                                                                                        if (selectDateType.current !== 'year') {
                                                                                            setOpenClander(false);

                                                                                            _handleChange(
                                                                                                item?.key,
                                                                                                e,
                                                                                                setFieldValue,
                                                                                                debouncedHandleSubmit
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <Grid container justifyContent={'flex-end'}>
                                                                                    <LWPButton
                                                                                        variant="text"
                                                                                        size="medium"
                                                                                        btnText="CLEAR"
                                                                                        onClick={() => {
                                                                                            setOpenClander(false);
                                                                                            _handleChange(
                                                                                                item?.key,
                                                                                                null,
                                                                                                setFieldValue,
                                                                                                debouncedHandleSubmit
                                                                                            );
                                                                                        }}
                                                                                    />
                                                                                </Grid>
                                                                            </CommonPopOver>
                                                                        </ToggleButton>
                                                                    );
                                                                })}
                                                                <CommonError error={errors?.postedBefore} touched={touched?.postedBefore} />
                                                            </ToggleButtonGroup>
                                                        </Grid>
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        </>
                                    )}

                                    {open && hasReadingTopics && (
                                        <Grid>
                                            <Heading3 text="Book name:" />
                                            <InputField
                                                name={'bookName'}
                                                value={values?.bookName}
                                                customClass="bookname_input"
                                                startIcon={<SearchIcon />}
                                                placeholder="Book name"
                                                onChange={(e) => setFieldValue('bookName', e?.target?.value)}
                                                endIcon={
                                                    values?.bookName?.length > 0 ? (
                                                        <LWPButton btnText="Search" onClick={() => _onSubmit(values)} />
                                                    ) : null
                                                }
                                            />
                                        </Grid>
                                    )}

                                    <Grid container justifyContent={'space-between'} alignItems={'center'}>
                                        {!haveUnTickedFeedbacks ? (
                                            showUntickFeedback && !isLoading ? (
                                                <LWPButton disabled color="inherit" variant="text">
                                                    <Grid display={'flex'} gap={1} alignItems={'center'}>
                                                        <img
                                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mark_as_seen.svg`}
                                                            alt="mark_as_seen"
                                                            width={25}
                                                            height={19}
                                                        />
                                                        <span>All feedbacks ticked</span>
                                                    </Grid>
                                                </LWPButton>
                                            ) : (
                                                <div />
                                            )
                                        ) : (
                                            <CommonSwitch
                                                name="showOnlyUntickFeed"
                                                onClick={() =>
                                                    _handleChange(
                                                        'showOnlyUntickFeed',
                                                        !values?.showOnlyUntickFeed,
                                                        setFieldValue,
                                                        debouncedHandleSubmit
                                                    )
                                                }
                                                label={'Unticked entries only'}
                                                checked={values?.showOnlyUntickFeed}
                                            />
                                        )}

                                        {data?.getClassesAndGroupsForFeedbackFilter?.length ? (
                                            <LWPButton
                                                color="inherit"
                                                variant="text"
                                                endIcon={open ? 'expand_less' : 'expand_more'}
                                                onClick={() => {
                                                    if (open) {
                                                        _handleChange('academicYear', null, setFieldValue, debouncedHandleSubmit);
                                                        setOpen(false);
                                                    } else {
                                                        setOpen(!open);
                                                    }
                                                }}>
                                                <Paragraph>{open ? 'Reset and hide extra options' : 'Show extra options'}</Paragraph>
                                            </LWPButton>
                                        ) : null}
                                    </Grid>
                                </Grid>
                            );
                        }}
                    </Formik>
                </CommonCard>
            </Collapse>

            <Collapse in={loading} unmountOnExit timeout={0}>
                <TecherActivityFeedFilterLoading open={open} />
            </Collapse>
        </>
    );
};

export default TecherActivityFeedFilter;

const mediaTypes = [
    { key: 'ALL', value: 'All' },
    { key: MediaTypeForAllFeeds.HAS_PHOTO, value: 'Has photo' },
    { key: MediaTypeForAllFeeds.HAS_AUDIO, value: 'Has audio' }
];

// Full option list, used to resolve the feedbackType URL param; the rendered row builds
// a dynamic subset in filterActivity based on the current selection.
const feedbackTypeOptions = [
    { key: 'ALL', value: 'All' },
    { key: FeedbackType.READING, value: 'Reading' },
    { key: FeedbackType.ACTIVITY, value: 'Topics' },
    { key: FeedbackType.SCRAPBOOK, value: 'Scrapbook' }
];

const dateBtn = [
    { key: 'postedAfter', value: 'From' },
    { key: 'postedBefore', value: 'To' }
];

// Week presets, used to resolve the `week` URL param back to the selected chip.
const weekOptions = [
    { key: 'THIS_WEEK', value: 'This week' },
    { key: 'LAST_WEEK', value: 'Last week' }
];
