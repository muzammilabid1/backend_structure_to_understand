/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Grid, Paper, TableCell, TableRow, Theme, useMediaQuery } from '@mui/material';
import { makeStyles, useTheme } from '@mui/styles';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { getAssignableSequencesForClass } from '../../../components/Class/AssignSequence/queries';
import ClassHeader from '../../../components/Class/ClassHeader';
import ReadMoreForSchedule from '../../../components/Class/ReadMoreForSchedule';
import CommonDot from '../../../components/Shared/CommonDot';
import CommonError from '../../../components/Shared/CommonError';
import CommonList from '../../../components/Shared/CommonList';
import CommonMultiSelect from '../../../components/Shared/CommonMultiSelect';
import CommonPopOver from '../../../components/Shared/CommonPopOver';
import CommonProgressBar from '../../../components/Shared/CommonProgressBar';
import CommonSelectField from '../../../components/Shared/CommonSelectField';
import CommonStatus from '../../../components/Shared/CommonStatus';
import ConfirmationModal from '../../../components/Shared/Modals/ConfirmationModal';
import ScheduleTable from '../../../components/Shared/ScheduleTable';
import Heading1 from '../../../components/Shared/Typography/Heading1';
import Heading3 from '../../../components/Shared/Typography/Heading3';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import TopicSummaryCard from '../../../components/Teacher/Cards/TopicSummaryCard';
import UpdateTopicModal from '../../../components/Teacher/Modals/UpdateTopicModal';
import { deleteClassTopics, saveReadingNote } from '../../../graphQl/mutations';
import { getClassTopics, getSchoolClass } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import {
    _readingTopicShortEndDateHandler,
    capitalizeFirstLetter,
    countWithPlural,
    getTopicType,
    getYearGroups,
    hasNonNullId,
    isDateInOrAfterCurrentWeek,
    showDate,
    ThemeContext,
    trackFilterItems
} from '../../../shared/Services/handler';
import { topicLibraryValidation } from '../../../shared/validations';
import { PageType } from '../../../types/enums/PageType';
import LWPButton from './../../../components/Shared/Button/LWPButton';
import CommonCheckBox from './../../../components/Shared/CommonCheckBox';
import CommonLoading from './../../../components/Shared/CommonLoading';
import CommonNavTabs from './../../../components/Shared/CommonNavTabs';
import DialogWrapper from './../../../components/Shared/DialogWrapper';
import InputField from './../../../components/Shared/InputField/InputField';

// Queries
const getAllTopics = gql`
    query allTopics($filter: TopicFilter, $schoolId: String, $classId: String) {
        allTopics(filter: $filter, schoolId: $schoolId, classId: $classId) {
            id
            teacherTopicName
            video
            teacherPdf
            hasSetByTeacherSteps
            teacherDescription
            isTeacherPdfRequired
            year
            scrapbookPrompt
            domains {
                id
                title
                subject {
                    id
                    name
                }
            }
            yearGroups {
                id
                year
                shortName
            }
        }
    }
`;

const getTopicDomainsForSchedule = gql`
    query allTopicDomainsWithTopics($yearGroupIds: [String!], $subjects: [String!], $schoolId: String!, $classId: String) {
        allTopicDomainsWithTopics(yearGroupIds: $yearGroupIds, subjects: $subjects, schoolId: $schoolId, classId: $classId) {
            id
            title
        }
    }
`;

const getTopicSubjectsForSchedule = gql`
    query allSubjectsWithTopics($yearGroupIds: [String!], $classId: String, $schoolId: String!) {
        allSubjectsWithTopics(yearGroupIds: $yearGroupIds, classId: $classId, schoolId: $schoolId) {
            id
            name
        }
    }
`;

const getAllYearGroups = gql`
    query allYearGroupsWithTopics($schoolId: String!, $classId: String) {
        allYearGroupsWithTopics(schoolId: $schoolId, classId: $classId) {
            id
            year
            shortName
        }
    }
`;

const useStyles = makeStyles({
    popover: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '70px 0 20px 0'
    },

    heading: {
        fontSize: '1.5rem'
    },

    typography: {
        width: 250
    }
});

type UpdateTopicModalState = {
    isOpen: boolean;
    editable: any | null; // Replace 'any' with the correct type
};

/*
 * Shown on both kinds of locked row, and used as their accessible name. One sentence covering the
 * whole rule rather than this row's own reason, so a leader reading it anywhere on the table learns
 * which topics they can remove at all. "Reading week" is the term the rest of the teacher-facing app
 * uses, including the panel directly above this table.
 */
const REMOVAL_LOCKED_MESSAGE = 'Released topics and reading weeks cannot be removed.';

const Schedule = () => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const classes = useStyles();
    const initialVal = 6;
    const ref = useRef(null);
    const queryParams = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const theme: Theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [addReadingNotesModal, setAddReadingNotesModal] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [readingNote, setReadingNote] = useState('');
    const [readingTarget, setReadingTarget] = useState('');
    const [classYearGroup, setClassYearGroup] = useState(0);
    const [subjects, setSubjects] = useState([]);
    const [filterOpt, setFilter] = useState([]);
    const [searchTopic, setSearchTopic] = useState([]);
    const [loadMore, setLoadMore] = useState(initialVal);
    const [addTopic, setAddTopic] = useState(null);
    const [isReleasedData, setIsReleasedData] = useState(null);
    const [currentYear, setCurrentYear] = useState<number | null>(null);
    const [initialLoading, setInitialLoading] = useState(false);
    const [updateTopicModal, setUpdateTopicModal] = useState<UpdateTopicModalState>({
        isOpen: false,
        editable: null
    });
    const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
    const [removeTopicsModalOpen, setRemoveTopicsModalOpen] = useState(false);

    const { loading: schoolClassLoading, data: classData } = useQuery(getSchoolClass, {
        variables: { id: queryParams?.class_id },
        fetchPolicy: 'cache-and-network'
    });

    const {
        loading,
        error: error,
        data: classTopics
    } = useQuery(getClassTopics, {
        variables: { classId: queryParams?.class_id }
    });

    const classDetails = classData?.schoolClass;

    const schoolId = token?.schoolId ?? classData?.schoolClass?.school?.id;

    const classId = queryParams?.class_id;
    const isRegistrationClass = classData?.schoolClass.isRegistrationClass;
    const isGroupAcrossClasses = classData?.schoolClass.isGroupAcrossClasses;
    const isClassGroup = !!classData?.schoolClass?.parentClass?.id;

    /**
     * Auto-scheduling is for registration classes only. A group takes its subjects from its own
     * licence and a group across classes draws its pupils from several, so a ready-made run of topics
     * on fixed dates is not the right shape for either.
     */
    const canAutoSchedule = Boolean(isRegistrationClass) && !isGroupAcrossClasses && !isClassGroup;

    /**
     * Fetched here rather than in the modal, because the action is only offered when this class
     * actually has something to schedule, so the page has to know before anything opens. Skipped
     * entirely for the classes that cannot use it, so they pay nothing for it.
     *
     * Errors are deliberately not surfaced: this drives an optional action, and a snackbar about a
     * feature the teacher has not asked for would be noise on a page that otherwise works.
     */
    const { data: assignableSequences } = useQuery(getAssignableSequencesForClass, {
        variables: { classId: queryParams?.class_id },
        skip: !queryParams?.class_id || !canAutoSchedule,
        fetchPolicy: 'cache-and-network'
    });

    const autoScheduleOptions = assignableSequences?.getAssignableSequencesForClass ?? [];

    const {
        error: yearGroupError,
        data: yearGroups,
        loading: loadingYearGroups
    } = useQuery(getAllYearGroups, {
        variables: { schoolId, classId: queryParams?.class_id },
        skip: !schoolId || !classId
    });
    const [getAllTopicsQuery, { loading: allTopicsLoading, error: allTopicsError, data: allTopics }] = useLazyQuery(getAllTopics);
    const [getTopicSubjectsQuery, { loading: getTopicSubjectsLoading, error: getTopicSubjectsError, data: topicSubjectsData }] =
        useLazyQuery(getTopicSubjectsForSchedule);

    const [getTopicDomainsQuery, { loading: getTopicDomainsLoading, error: getTopicDomainsError, data: topicDomainsData }] =
        useLazyQuery(getTopicDomainsForSchedule);

    const year = searchParams.get('year');
    const subject = searchParams.get('subject');
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');

    const getSubjects = () => {
        const selectedSubjects = JSON.parse(subject);

        /**
         * If the class is a registration class, we fetch the selected subjects from the URL.
         * If it's not a registration class (i.e., a class group), and no subjects are selected or selected all,
         * we fallback to using the subjects available in the class group to ensure we get the relevant topics.
         */

        if (isRegistrationClass || isGroupAcrossClasses) return selectedSubjects;

        return selectedSubjects?.length > 0 ? selectedSubjects : classData?.schoolClass?.subjects?.map((item) => item?.id);
    };

    const setInitialValues = async () => {
        await getAllTopicsQuery({
            variables: {
                filter: { year: JSON.parse(year), subjects: getSubjects(), domain: JSON.parse(domain), isHidden: false },
                schoolId,
                classId
            }
        });

        const {
            data: { allSubjectsWithTopics }
        } = await getTopicSubjectsQuery({ variables: { yearGroupIds: JSON.parse(year), classId, schoolId } });

        const {
            data: { allTopicDomainsWithTopics }
        } = await getTopicDomainsQuery({
            variables: { yearGroupIds: JSON.parse(year), subjects: getSubjects(), schoolId, classId }
        });

        ref.current.setValues({
            year:
                JSON.parse(year)?.length > 0
                    ? yearGroups?.allYearGroupsWithTopics
                          ?.filter((item) => JSON.parse(year)?.includes(item.id))
                          ?.map((item) => ({ ...item, id: item.id, value: item.year }))
                    : [{ id: null, value: 'All' }],

            subject:
                JSON.parse(subject)?.length > 0
                    ? allSubjectsWithTopics
                          ?.filter((staticSubject) => JSON.parse(subject)?.includes(staticSubject?.id))
                          ?.map((subject) => ({
                              value: subject?.name,
                              id: subject?.id
                          }))
                    : [{ id: null, value: 'All' }],
            domain:
                JSON.parse(domain)?.length > 0
                    ? allTopicDomainsWithTopics
                          ?.filter((item) => JSON.parse(domain)?.includes(item.id))
                          ?.map((item) => ({ ...item, value: item.title, id: item.id }))
                    : [{ id: null, value: 'All' }],
            search: search
        });
    };

    useEffect(() => {
        if (allTopicsError?.message) callSnackbar(allTopicsError, 'error');
        if (yearGroupError?.message) callSnackbar(yearGroupError, 'error');
        if (getTopicDomainsError?.message) callSnackbar(getTopicDomainsError, 'error');
        if (getTopicSubjectsError?.message) callSnackbar(getTopicSubjectsError, 'error');
        if (error?.message) callSnackbar(error, 'error');
    }, [allTopicsError, getTopicDomainsError, yearGroupError, error, getTopicSubjectsError]);

    const scheduleTopicActions = [
        {
            name: 'Edit',
            icon: 'edit',
            onClick: (topic, isTypeRead) => {
                if (isTypeRead) {
                    selectClassTopic(topic);
                } else {
                    setUpdateTopicModal({
                        isOpen: !updateTopicModal?.isOpen,
                        editable: classTopics?.getClassTopics.find((item) => item.id === topic.id)
                    });
                }
            }
        },
        {
            name: 'Preview',
            icon: 'visibility',
            onClick: (topic) => {
                const classTopicId = topic?.topic?.hasSetByTeacherSteps ? topic?.id : null;

                window.open(
                    `${location.protocol}//${location.host}/previewtopic/${topic?.topic?.id}${classTopicId ? `?classTopicId=${classTopicId}` : ''}`,
                    '_blank',
                    `width=${window.innerWidth}, height=${window.innerHeight}`
                );
            }
        },
        {
            name: 'Resources (PDF)',
            icon: 'download',
            onClick: (topic) => {
                window.location.href = topic?.topic?.teacherPdf;
                // handleDownload(topic?.topic?.teacherPdf, true);
            }
        }
    ];

    const filterBySubject = (sub) => {
        if (subjects.includes(sub)) {
            const newArr = subjects.filter((subject) => subject !== sub);

            setSubjects(newArr);
        } else {
            setSubjects([...subjects, sub]);
        }
    };

    const [saveReadingNoteMutation, { loading: saveReadingNoteLoading }] = useMutation(saveReadingNote, {
        refetchQueries: [{ query: getClassTopics, variables: { classId: queryParams?.class_id } }],
        awaitRefetchQueries: true
    });

    const [deleteClassTopicsMutation, { loading: deleteClassTopicsLoading }] = useMutation(deleteClassTopics, {
        refetchQueries: [{ query: getClassTopics, variables: { classId: queryParams?.class_id } }],
        awaitRefetchQueries: true
    });

    /*
     * A topic can be removed in bulk only when it has not gone out to families and is not a reading
     * week. Released topics may already hold work a child has done; reading weeks come from the
     * class's reading settings rather than from the schedule, so there is nothing here to remove.
     *
     * The server checks both again, since these ids are sent from the browser.
     */
    const isRemovableTopic = (classTopic) => !classTopic?.released && !classTopic?.topic?.isReading;

    const handleRemoveSelectedTopics = () => {
        deleteClassTopicsMutation({ variables: { ids: selectedTopicIds } })
            .then(() => {
                callSnackbar(`${countWithPlural('topic', selectedTopicIds.length)} removed`, 'success');
                setSelectedTopicIds([]);
                setRemoveTopicsModalOpen(false);
            })
            .catch((err) => {
                callSnackbar(err, 'error');
                setRemoveTopicsModalOpen(false);
            });
    };

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    /*
     * Changing the subject filter clears the selection. Keeping it would leave the Remove button
     * counting topics that are no longer on screen, which is the one thing selecting "all" per filter
     * was meant to avoid.
     */
    useEffect(() => {
        setSelectedTopicIds([]);
    }, [subjects]);

    useEffect(() => {
        if (selectedTopic) setReadingNote(selectedTopic.readingNote);
        if (selectedTopic) setReadingTarget(selectedTopic?.readingTarget);
    }, [selectedTopic]);

    useEffect(() => {
        if (classData && queryParams?.class_id) {
            getInialDataForSubject();
        }
    }, [classData]);

    const getInialDataForSubject = async () => {
        try {
            setInitialLoading(true);
            setClassYearGroup(classData?.schoolClass?.yearGroup?.id ? classData?.schoolClass?.yearGroup?.id : 1);
            /**
             * If the class is a registration class, fetch all subjects that have topics.
             * If the class is not a registration class (i.e. a class group), fetch subjects associated with the class group that also have topics.
             */
            let yearGroupIds = [];

            if (isClassGroup) {
                yearGroupIds = [];
            } else {
                yearGroupIds = classData?.schoolClass?.yearGroup?.id ?? '1';
            }

            await getTopicSubjectsQuery({
                variables: {
                    yearGroupIds,
                    classId,
                    schoolId
                }
            });
            setInitialLoading(false);
        } catch {
            setInitialLoading(false);
        }
    };

    const handleSubmit = () => {
        saveReadingNoteMutation({ variables: { input: { classTopicId: selectedTopic?.id, readingNote, readingTarget: +readingTarget } } })
            .then(() => {
                setAddReadingNotesModal(false);
                callSnackbar('Changes saved', 'success');
                setSelectedTopic(null);
            })
            .catch(({ ...err }) => {
                setAddReadingNotesModal(false);
                callSnackbar(err, 'error');
                setSelectedTopic(null);
            });
    };

    const selectClassTopic = (classTopic) => {
        setAddReadingNotesModal(true);
        setSelectedTopic(classTopic);
    };

    useEffect(() => {
        if (classTopics?.['getClassTopics']) {
            const filterList = [];
            let hasReading = false;

            (classTopics?.['getClassTopics'] || []).forEach((classTopic) => {
                if (classTopic?.topic?.isReading) hasReading = true;
                (classTopic?.topic?.domains || []).forEach((domain) => {
                    if (!filterList.includes(domain?.subject?.name)) {
                        filterList.push(domain?.subject?.name);
                    }
                });
            });
            if (hasReading) filterList.push('Reading');
            setSubjects(filterList);
            setFilter(filterList);
        }
    }, [classTopics?.['getClassTopics']]);

    /*
     * Lifted out of the table so the header checkbox can act on exactly the rows on screen. Selecting
     * "all" must never reach a topic the subject filter is hiding, or a leader would remove something
     * they were never shown.
     */
    const visibleClassTopics = (classTopics?.getClassTopics || []).filter((classTopic) => {
        const isReadingIncluded = subjects.includes('Reading');

        if (isReadingIncluded) {
            return classTopic?.topic?.isReading || classTopic?.topic?.domains?.some((domain) => subjects.includes(domain?.subject?.name));
        }

        return !classTopic?.topic?.isReading && classTopic?.topic?.domains?.some((domain) => subjects.includes(domain?.subject?.name));
    });

    const removableVisibleTopicIds = visibleClassTopics.filter(isRemovableTopic).map((classTopic) => classTopic?.id);

    const toggleTopicSelection = (topicId: string) =>
        setSelectedTopicIds((previous) => (previous.includes(topicId) ? previous.filter((id) => id !== topicId) : [...previous, topicId]));

    const toggleSelectAllTopics = () => setSelectedTopicIds((previous) => (previous.length ? [] : removableVisibleTopicIds));

    const heading = [
        {
            label: '',
            icon: (
                <CommonCheckBox
                    sx={{ margin: 0 }}
                    name="selectAllTopics"
                    dataTest="select-all-topics-checkbox-in-class-schedule-page"
                    ariaLabel="Select all topics that can be removed"
                    disabled={!removableVisibleTopicIds.length}
                    checked={selectedTopicIds.length > 0 && selectedTopicIds.length === removableVisibleTopicIds.length}
                    indeterminate={selectedTopicIds.length > 0 && selectedTopicIds.length !== removableVisibleTopicIds.length}
                    onClick={toggleSelectAllTopics}
                />
            )
        },
        'Date',
        'Topic name',
        'Status',
        '',
        ''
    ];

    const getProgress = (statistics, topic) => {
        const { completed, notStarted, inProgress } = statistics;

        if (completed || notStarted || inProgress) {
            return topic?.topic?.isReading
                ? topic?.readingTarget === 0
                    ? [
                          { color: '#d6d1cb', count: completed.length },
                          { color: '#d6d1cb', count: inProgress.length },
                          { color: '#d6d1cb', count: notStarted.length }
                      ]
                    : [
                          { color: 'rgb(136, 125, 255)', count: completed.length },
                          { color: 'rgba(136, 125, 255, 0.6)', count: inProgress.length },
                          { color: 'rgb(208, 216, 255)', count: notStarted.length }
                      ]
                : [
                      { color: '#65B32E', count: completed.length },
                      { color: '#99C95D', count: inProgress.length },
                      { color: '#FAF3B3', count: notStarted.length }
                  ];
        } else {
            return topic?.topic?.isReading
                ? [
                      { color: 'rgb(136, 125, 255)', count: 0 },
                      { color: 'rgba(136, 125, 255, 0.6)', count: 0 },
                      { color: 'rgba(136, 125, 255, 0.6)', count: 0 },
                      { color: 'rgb(208, 216, 255)', count: 1 }
                  ]
                : [
                      { color: '#65B32E', count: 0 },
                      { color: '#99C95D', count: 0 },
                      { color: '#FAF3B3', count: 1 }
                  ];
        }
    };

    useEffect(() => {
        if (allTopics && currentYear !== classYearGroup) {
            setCurrentYear(classYearGroup);
        }
    }, [allTopics, classYearGroup]);

    useEffect(() => {
        if (allTopics) {
            let searchData = allTopics?.allTopics ?? [];
            const searchRef = search;

            if (searchRef) {
                searchData = searchData.filter(
                    (item) =>
                        item?.teacherTopicName?.toLowerCase()?.includes(searchRef?.toLowerCase()) ||
                        item?.domains?.some((domain) => domain?.title?.toLowerCase().includes(searchRef?.toLowerCase())) ||
                        (item?.teacherDescription?.toLowerCase()?.includes(searchRef?.toLowerCase()) ?? false)
                );
            }

            setSearchTopic(searchData);
        }
    }, [allTopics, search]);

    const handleLoadMoreClick = () => {
        setLoadMore(loadMore + initialVal);
    };

    const getTopicsStatistics = (topicStats) => {
        if (topicStats?.readingTarget === 0) {
            return [
                {
                    text: `There was no target for this week`,
                    icon: <CommonDot color={'#d6d1cb'} />
                }
            ];
        } else if (topicStats?.topic?.isReading) {
            return [
                {
                    text: `Target met (${topicStats?.statistics?.completed?.length})`,
                    icon: <CommonDot color={'#887DFF'} />
                },
                {
                    text: `Less than target (${topicStats?.statistics?.inProgress?.length})`,
                    icon: <CommonDot color={'#B8B1FF'} />
                },
                {
                    text: `No reading (${topicStats?.statistics?.notStarted?.length})`,
                    icon: <CommonDot color={'#D0D8FF'} />
                }
            ];
        } else {
            return [
                {
                    text: `Done an activity (${topicStats?.statistics?.completed?.length})`,
                    icon: <CommonDot color={'#65B32E'} />
                },
                {
                    text: `Watched video only (${topicStats?.statistics?.inProgress?.length})`,
                    icon: <CommonDot color={'#99C95D'} />
                },
                {
                    text: `Not started (${topicStats?.statistics?.notStarted?.length})`,
                    icon: <CommonDot color={'#FAF3B3'} />
                }
            ];
        }
    };

    const groupSubjects = classData?.schoolClass?.subjects;

    const hasReadyTeddyOrFullProgrammeLicense = classData?.schoolClass.isFullProgramme || classData?.schoolClass.isReadyTeddyEnabled;

    const addTopicIsVisible = () => {
        if (isRegistrationClass || isGroupAcrossClasses)
            return hasReadyTeddyOrFullProgrammeLicense || classData?.schoolClass?.school?.isMoneySkillsAvailable;

        const isGroupSubjectsAvailable = classData?.schoolClass?.subjects?.length > 0;

        return isGroupSubjectsAvailable;
    };

    const displayItems = (values) => {
        return values?.length > 0 && values?.every((x) => x?.id === null) ? [{ id: null, value: 'All' }] : hasNonNullId(values);
    };

    const initalTopicSubjectsData =
        topicSubjectsData?.allSubjectsWithTopics?.length && groupSubjects?.length
            ? topicSubjectsData?.allSubjectsWithTopics
                  ?.filter((allSubject) => groupSubjects.some((groupSubject) => groupSubject?.id === allSubject?.id))
                  ?.map((allSubject) => ({
                      value: capitalizeFirstLetter(allSubject?.name?.toLowerCase()),
                      id: allSubject?.id
                  }))
            : [];

    useEffect(() => {
        if (schoolId) {
            if (year && subject && domain && ref?.current && yearGroups) {
                setInitialValues();
            } else {
                getTopicDomainsQuery({
                    variables: {
                        yearGroupIds:
                            hasNonNullId(
                                classData?.schoolClass?.yearGroup?.id
                                    ? yearGroups?.allYearGroupsWithTopics
                                          ?.filter((item) => item.id === classData?.schoolClass?.yearGroup?.id)
                                          ?.map((item) => ({ id: item.id, value: item.year }))
                                    : []
                            )?.map((y) => y?.id) ?? [],
                        subjects: hasNonNullId(initalTopicSubjectsData)?.map((y) => y?.id) ?? [],
                        schoolId,
                        classId
                    }
                });
            }
        }
    }, [year, subject, domain, ref?.current?.setValues, yearGroups, classData?.schoolClass, schoolId]);

    const getSubjectsForTopicDomain = (selectedSubjects) => {
        const selectedSubjectIds = hasNonNullId(selectedSubjects)?.map((subject) => subject?.id);

        // If it's a registration class, return the selected subjects' IDs
        if (isRegistrationClass || isGroupAcrossClasses) return selectedSubjectIds;

        // If it's not a registration class (i.e., a group),
        // return the selected subjects' IDs if available. If no subjects are selected,
        // fall back to the subjects available in the class group.
        return selectedSubjectIds?.length > 0 ? selectedSubjectIds : classData?.schoolClass?.subjects?.map((item) => item?.id);
    };

    if (loading || schoolClassLoading || initialLoading || loadingYearGroups) return <CommonLoading />;

    return (
        <div className="schedule" data-test={'class-schedule-page'}>
            <ClassHeader schoolClassData={classData?.schoolClass} />

            <CommonNavTabs
                isReading={classData?.schoolClass.IsReadingLogsEnabled}
                isFullProgramme={classData?.schoolClass.isFullProgramme}
                isRegistrationClass={classData?.schoolClass?.isRegistrationClass}
                subjects={classData?.schoolClass?.subjects}
                attentionRequiredPupilsCount={classData?.schoolClass?.attentionRequiredPupilsCount}
                schoolClass={classData?.schoolClass}
            />

            {addTopicIsVisible() ? (
                <>
                    {/* Auto-scheduling sits beside adding a topic by hand, because it is the same job
                        done in one step. Offered only for a registration class, and only when it has
                        something to schedule, so it is never a dead end: what is eligible is the
                        API's answer, not a guess here. */}
                    <Grid container alignItems="center" justifyContent="space-between" className="schedule-topic-heading-row">
                        <Heading1 text="Add a topic" customClass="schedule-topic-heading" />
                        {canAutoSchedule && autoScheduleOptions.length ? (
                            <LWPButton
                                btnText="Auto-schedule"
                                dataTest="assign-sequence-button"
                                onClick={() => router?.push(`/class/${classId}/auto-schedule`)}
                                color="inherit"
                                variant="text"
                                endIcon="playlist_add"
                            />
                        ) : null}
                    </Grid>

                    <Formik
                        innerRef={ref}
                        initialValues={{
                            year: classData?.schoolClass?.yearGroup?.id
                                ? yearGroups?.allYearGroupsWithTopics
                                      ?.filter((item) => item.id === classData?.schoolClass?.yearGroup?.id)
                                      ?.map((item) => ({ id: item.id, value: item.year }))
                                : [],
                            subject: initalTopicSubjectsData,
                            domain: [],
                            search: '',
                            isvalide: ''
                        }}
                        validationSchema={topicLibraryValidation}
                        // enableReinitialize
                        onSubmit={async (values) => {
                            trackFilterItems(values, 'Schedule page');
                            router?.push({
                                query: {
                                    year: JSON.stringify(hasNonNullId(values['year'])?.map(({ id }) => id)),
                                    subject: JSON.stringify(hasNonNullId(values['subject'])?.map(({ id }) => id)),
                                    domain: JSON.stringify(hasNonNullId(values['domain'])?.map(({ id }) => id)),
                                    search: values['search'],
                                    class_id: queryParams?.class_id
                                }
                            });
                        }}>
                        {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                            <>
                                <Grid container spacing={3} rowSpacing={1}>
                                    <CommonMultiSelect
                                        name="year"
                                        label="Year group"
                                        dataTest="class-schedule-year-group-multi-select"
                                        value={displayItems(values?.year)}
                                        options={(yearGroups?.allYearGroupsWithTopics
                                            ? [{ id: null, year: 'All' }, ...yearGroups.allYearGroupsWithTopics]
                                            : []
                                        ).map((yearGroup) => ({
                                            value: yearGroup.year,
                                            id: yearGroup.id
                                        }))}
                                        onChange={(value) => {
                                            const includesAll = value?.some((x, i) => (i === 0 ? false : x?.id === null));

                                            handleChange({
                                                target: { name: 'year', value: includesAll ? [{ id: null, value: 'All' }] : value }
                                            });

                                            handleChange({
                                                target: { name: 'domain', value: [] }
                                            });

                                            getTopicSubjectsQuery({
                                                variables: {
                                                    yearGroupIds: hasNonNullId(includesAll ? [] : value)?.map((y) => y?.id),
                                                    classId,
                                                    schoolId
                                                }
                                            }).then(({ data }) => {
                                                const subjectValues = values?.subject?.filter((x) =>
                                                    data?.allSubjectsWithTopics?.some((subject) => subject?.id === x?.id)
                                                );

                                                handleChange({
                                                    target: {
                                                        name: 'subject',
                                                        value: subjectValues?.length > 0 ? subjectValues : [{ id: null, value: 'All' }]
                                                    }
                                                });
                                            });

                                            getTopicDomainsQuery({
                                                variables: {
                                                    yearGroupIds: hasNonNullId(includesAll ? [] : value)?.map((y) => y?.id),
                                                    subjects: getSubjectsForTopicDomain(values?.subject),
                                                    schoolId,
                                                    classId
                                                }
                                            });
                                        }}
                                        onBlur={handleBlur}
                                        error={errors?.year}
                                        touched={touched?.year}
                                        lg={4}
                                        md={4}
                                    />
                                    <CommonMultiSelect
                                        name={'subject'}
                                        label="Subject"
                                        dataTest={
                                            getTopicSubjectsLoading || (isClassGroup && groupSubjects?.length === 1)
                                                ? 'disabled-class-schedule-subject-multi-select'
                                                : 'class-schedule-subject-multi-select'
                                        }
                                        filterSelectedOptions={false}
                                        disabled={getTopicSubjectsLoading || (isClassGroup && groupSubjects?.length === 1) ? true : false}
                                        value={displayItems(values?.subject)}
                                        options={(topicSubjectsData?.allSubjectsWithTopics
                                            ? [
                                                  { id: null, value: 'All' },
                                                  ...topicSubjectsData.allSubjectsWithTopics.map((subject) => ({
                                                      id: subject?.id,
                                                      value: subject?.name
                                                  }))
                                              ]
                                            : []
                                        )?.map((subject) => ({
                                            value: subject?.value,
                                            id: subject.id
                                        }))}
                                        onChange={(value) => {
                                            const includesAll = value?.some((x, i) => (i === 0 ? false : x?.id === null));

                                            handleChange({
                                                target: { name: 'subject', value: includesAll ? [{ id: null, value: 'All' }] : value }
                                            });

                                            handleChange({
                                                target: { name: 'domain', value: [] }
                                            });

                                            getTopicDomainsQuery({
                                                variables: {
                                                    yearGroupIds: hasNonNullId(values?.year)?.map((y) => y?.id),
                                                    subjects: getSubjectsForTopicDomain(includesAll ? [] : value),
                                                    schoolId,
                                                    classId
                                                }
                                            });
                                        }}
                                        onBlur={handleBlur}
                                        error={errors?.subject}
                                        touched={touched?.subject}
                                        lg={4}
                                        md={4}
                                    />
                                    <CommonMultiSelect
                                        name={'domain'}
                                        label="Domain"
                                        dataTest={
                                            getTopicDomainsLoading
                                                ? 'disabled-class-schedule-domain-multi-select'
                                                : 'class-schedule-domain-multi-select'
                                        }
                                        filterSelectedOptions={false}
                                        value={displayItems(values?.domain)}
                                        options={(topicDomainsData?.allTopicDomainsWithTopics
                                            ? [{ id: null, title: 'All' }, ...topicDomainsData.allTopicDomainsWithTopics]
                                            : []
                                        ).map((domain) => ({ value: domain.title, id: domain.id }))}
                                        onChange={(value) => {
                                            const includesAll = value?.some((x, i) => (i === 0 ? false : x?.id === null));

                                            handleChange({
                                                target: { name: 'domain', value: includesAll ? [{ id: null, value: 'All' }] : value }
                                            });
                                        }}
                                        disabled={getTopicDomainsLoading}
                                        onBlur={handleBlur}
                                        error={errors?.domain}
                                        touched={touched?.domain}
                                        lg={4}
                                        md={4}
                                    />
                                    <InputField
                                        md={4}
                                        lg={4}
                                        value={values?.search}
                                        startIcon={<span className="material-icons">search</span>}
                                        placeholder="Search"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors?.search}
                                        touched={touched?.search}
                                        name={'search'}
                                    />
                                    <Grid item xs={12} sm={12} md={4} lg={4}>
                                        <div style={{ display: 'flex', gap: 25 }}>
                                            <LWPButton
                                                dataTest="class-schedule-topic-search-button"
                                                btnText="Search"
                                                onClick={handleSubmit}
                                            />
                                            {values.search ? (
                                                <LWPButton
                                                    btnText="Reset"
                                                    onClick={() => {
                                                        handleChange({ target: { name: 'search', value: '' } });
                                                        handleSubmit();
                                                    }}
                                                    color="inherit"
                                                    variant="text"
                                                />
                                            ) : (
                                                ''
                                            )}
                                        </div>
                                        <CommonError error={errors?.isvalide} touched={true} />
                                    </Grid>
                                </Grid>
                            </>
                        )}
                    </Formik>
                    <Grid container spacing={3} className="schedule-topic-cards" justifyContent={isMobile && 'center'}>
                        {allTopicsLoading ? (
                            <div className="loading_container">
                                <CommonLoading />
                            </div>
                        ) : (
                            searchTopic.slice(0, loadMore).map((topic) => {
                                const classTopicData = classTopics?.getClassTopics?.find((isRelease) => isRelease?.topic?.id === topic?.id);

                                return (
                                    <>
                                        <TopicSummaryCard
                                            key={topic?.id}
                                            name={topic?.teacherTopicName}
                                            teacherDescription={topic?.teacherDescription}
                                            yearGroup={getYearGroups(topic?.yearGroups)}
                                            type={getTopicType(false)}
                                            subject={(topic?.domains || [])?.map((domain) => domain?.subject?.name).join(', ')}
                                            classTopic={classTopicData}
                                            previewHandler={() => {
                                                window.open(
                                                    `${location.protocol}//${location.host}/previewtopic/${topic?.id}`,
                                                    '_blank',
                                                    `width=${window.innerWidth}, height=${window.innerHeight}`
                                                );
                                                setAddTopic(allTopics?.allTopics.find((item) => item?.id === topic?.id));
                                            }}
                                            selectHandler={() => {
                                                setUpdateTopicModal({
                                                    isOpen: !updateTopicModal?.isOpen,
                                                    editable: null
                                                });
                                                if (classTopicData?.releaseDate) {
                                                    setAddTopic(null);
                                                    setIsReleasedData(classTopicData);
                                                } else {
                                                    setIsReleasedData(null);
                                                    setAddTopic(allTopics?.allTopics.find((item) => item?.id === topic?.id));
                                                }
                                            }}
                                        />
                                    </>
                                );
                            })
                        )}
                    </Grid>
                </>
            ) : null}

            {loadMore < searchTopic?.length && (
                <div className="schedule-show-more-btn">
                    <LWPButton onClick={handleLoadMoreClick} color="inherit">
                        Show more
                    </LWPButton>
                </div>
            )}
            {!allTopicsLoading && !searchTopic?.length && year && (
                <Paper className="no-result-found">
                    <CommonStatus
                        className="no_match_item_status"
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        heading={'No search results found'}
                        subHeading={'Maybe try searching again by using different filters or keywords'}
                    />
                </Paper>
            )}
            {filterOpt?.length ? (
                <>
                    <div className={classes.popover}>
                        <Heading1 text="Scheduled topics" customClass={classes.heading} />
                        <CommonPopOver
                            childrenClass={classes.typography}
                            bold
                            icon="expand_more"
                            className="reading-PopOver"
                            key="123"
                            /* Several boxes are ticked in a row, so a click inside must not close it. A click
                               outside or Esc still does. */
                            closeOnClick={false}
                            text={'Filter by subject'}>
                            <div key="123" className="maxi">
                                {filterOpt.map((item) => (
                                    <>
                                        <CommonCheckBox
                                            onClick={() => filterBySubject(item)}
                                            name="isSharedAllowed"
                                            label={item}
                                            checked={subjects.includes(item)}
                                        />
                                        <br />
                                    </>
                                ))}
                            </div>
                        </CommonPopOver>
                    </div>
                </>
            ) : null}
            {classData?.schoolClass?.IsReadingLogsEnabled && <ReadMoreForSchedule classData={classData} />}

            <div className="classTopic-table">
                {classTopics?.getClassTopics?.length ? (
                    <ScheduleTable head={heading}>
                        {visibleClassTopics.map((topic) => {
                            const isTypeRead = topic?.topic?.isReading;
                            const isRemovable = isRemovableTopic(topic);

                            /*
                             * Built once so the locked version is the same control, only wrapped. A
                             * disabled MUI checkbox takes no pointer events itself, so the hover has
                             * to live on something around it.
                             */
                            const selectCheckBox = (
                                <CommonCheckBox
                                    sx={{ margin: 0 }}
                                    dataTest={`select-topic-${topic?.id}-checkbox-in-class-schedule-page`}
                                    ariaLabel={isRemovable ? `Select ${topic?.topic?.teacherTopicName}` : REMOVAL_LOCKED_MESSAGE}
                                    disabled={!isRemovable}
                                    checked={selectedTopicIds.includes(topic?.id)}
                                    onClick={() => toggleTopicSelection(topic?.id)}
                                />
                            );

                            return (
                                <TableRow key={topic?.id}>
                                    {/* Carries the topic-type stripe, which belongs on whichever cell comes
                                        first so it still marks the left edge of the row. */}
                                    <TableCell
                                        className={`${getTopicType(topic?.topic?.isReading)}-border ${
                                            topic?.readingTarget === 0
                                                ? 'zero-reading-target-bg'
                                                : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead
                                                  ? 'not-zero-reading-target-bg'
                                                  : ''
                                        }`}
                                        width="1">
                                        {/* Present but dead on rows that cannot go, rather than absent, so the
                                                column stays aligned, with the rule on hover and on the input's
                                                accessible name. */}
                                        {isRemovable ? (
                                            selectCheckBox
                                        ) : (
                                            <CommonPopOver
                                                hover
                                                dataTest={`select-topic-${topic?.id}-locked-reason`}
                                                /* Opens to the right of the checkbox. The default centres it
                                                   below, which on this first column puts it over the sidebar
                                                   and across the row underneath. */
                                                anchorOriginVertical="center"
                                                anchorOriginHorizontal="right"
                                                transformOriginVertical="center"
                                                transformOriginHorizontal="left"
                                                element={selectCheckBox}>
                                                <Paragraph style={{ maxWidth: 260 }} text={REMOVAL_LOCKED_MESSAGE} />
                                            </CommonPopOver>
                                        )}
                                    </TableCell>
                                    <TableCell
                                        className={
                                            topic?.readingTarget === 0
                                                ? 'zero-reading-target-bg'
                                                : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead
                                                  ? 'not-zero-reading-target-bg'
                                                  : ''
                                        }
                                        width="250">
                                        {/* A topic created by assigning a sequence is otherwise
                                                indistinguishable from a hand-scheduled one, which is
                                                deliberate: from here on it behaves identically. The
                                                label just says where it came from. */}
                                        {topic?.classSequenceAssignment?.id ? (
                                            <Paragraph
                                                customClass="schedule-auto-scheduled-label"
                                                dataTest={`class-topic-auto-scheduled-${topic?.id}`}
                                                text="Auto-scheduled"
                                            />
                                        ) : null}
                                        <Paragraph
                                            text={
                                                isTypeRead
                                                    ? `${showDate({
                                                          date: topic?.releaseDate,
                                                          short: true
                                                      })} to ${_readingTopicShortEndDateHandler(topic?.releaseDate)}`
                                                    : `${showDate({ date: topic?.releaseDate, short: true })} ${
                                                          topic?.dueDate ? 'to ' + showDate({ date: topic?.dueDate, short: true }) : ''
                                                      }`
                                            }
                                        />
                                    </TableCell>
                                    <TableCell
                                        className={
                                            topic?.readingTarget === 0
                                                ? 'zero-reading-target-bg'
                                                : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead
                                                  ? 'not-zero-reading-target-bg'
                                                  : ''
                                        }
                                        width="250">
                                        <Grid container>
                                            <CommonPopOver
                                                hover
                                                element={
                                                    <Paragraph
                                                        onClick={() =>
                                                            router.push(
                                                                isTypeRead
                                                                    ? `/class/${queryParams?.class_id}/readingweek/${topic?.id}`
                                                                    : `/class/${queryParams?.class_id}/topic/${topic?.id}`
                                                            )
                                                        }
                                                        text={isTypeRead ? 'Reading Log' : topic?.topic?.teacherTopicName}
                                                        isTruncate
                                                        customClass={!isTypeRead && 'ul_dot'}
                                                    />
                                                }>
                                                {isTypeRead ? null : (
                                                    <Grid maxWidth={383}>
                                                        <b>{topic?.topic?.teacherTopicName}</b>
                                                        <p>
                                                            {topic?.topic?.yearGroups &&
                                                                `${getYearGroups(topic?.topic?.yearGroups)} · ${topic?.topic?.domains
                                                                    ?.map((domain) => domain?.subject?.name)
                                                                    .join(', ')}`}
                                                        </p>
                                                        {topic?.teacherMessage && <Grid mt={2}>{topic?.teacherMessage}</Grid>}
                                                    </Grid>
                                                )}
                                            </CommonPopOver>
                                        </Grid>
                                    </TableCell>
                                    <TableCell
                                        className={
                                            topic?.readingTarget === 0
                                                ? 'zero-reading-target-bg'
                                                : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead
                                                  ? 'not-zero-reading-target-bg'
                                                  : ''
                                        }
                                        width="200">
                                        {topic?.released ? (
                                            // <CommonProgressBar statistics={getProgress(topic?.statistics, topic)} />
                                            <CommonPopOver
                                                hover
                                                key={topic?.id}
                                                element={<CommonProgressBar statistics={getProgress(topic?.statistics, topic)} />}>
                                                <CommonList list={getTopicsStatistics(topic)} className="schedule-popover" />
                                            </CommonPopOver>
                                        ) : (
                                            <Paragraph text={'Not yet released'} />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        className={
                                            topic?.readingTarget === 0
                                                ? 'zero-reading-target-bg'
                                                : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead
                                                  ? 'not-zero-reading-target-bg'
                                                  : ''
                                        }
                                        width="20">
                                        <div className="reading-target-container">
                                            {topic?.readingTarget === 0 && isTypeRead ? (
                                                <div className="reading-target zero-bg">
                                                    <CommonPopOver text={'0'} hover>
                                                        There is no reading target for this week. <br /> Parents will not be sent reminders.
                                                    </CommonPopOver>
                                                </div>
                                            ) : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead ? (
                                                <div className="reading-target not-zero-bg">
                                                    <CommonPopOver text={topic?.readingTarget} hover>
                                                        The reading log target for this week has <br /> been changed to{' '}
                                                        {topic?.readingTarget} {topic?.readingTarget > 1 ? 'days' : 'day'}
                                                    </CommonPopOver>
                                                </div>
                                            ) : null}
                                            {topic?.topic?.isTeacherPdfRequired ? (
                                                <CommonPopOver
                                                    hover
                                                    element={
                                                        <img
                                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pdf_file.svg`}
                                                            alt="iconImage"
                                                            onClick={() => (window.location.href = topic?.topic?.teacherPdf)}
                                                        />
                                                    }>
                                                    <Paragraph
                                                        style={{ maxWidth: 300 }}
                                                        text={
                                                            'Handouts are required to complete these activities - please print out the resources (PDF) and hand them out to the pupils when the topic is released'
                                                        }
                                                    />
                                                </CommonPopOver>
                                            ) : (
                                                ''
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        className={`schedule-table-actions-table-cell ${
                                            topic?.readingTarget === 0
                                                ? 'zero-reading-target-bg'
                                                : classData?.schoolClass?.readingTarget !== topic?.readingTarget && isTypeRead
                                                  ? 'not-zero-reading-target-bg'
                                                  : ''
                                        }`}>
                                        <CommonPopOver bold icon="more_horiz" dataTest="schedule-topic-actions-btn">
                                            {isTypeRead ? (
                                                <div
                                                    className="schedule-table-actions-container"
                                                    data-test={`schedule-topic-action-${scheduleTopicActions[0].name.toLowerCase()}`}
                                                    key={scheduleTopicActions[0].name}
                                                    onClick={() => scheduleTopicActions[0].onClick(topic, isTypeRead)}>
                                                    <span className="material-icons">{scheduleTopicActions[0].icon}</span>
                                                    <span>{scheduleTopicActions[0].name}</span>
                                                </div>
                                            ) : topic?.topic?.teacherPdf ? (
                                                scheduleTopicActions.map((item) => (
                                                    <div
                                                        className="schedule-table-actions-container"
                                                        data-test={`schedule-topic-action-${item.name.toLowerCase()}`}
                                                        key={item.name}
                                                        onClick={() => item.onClick(topic, isTypeRead)}>
                                                        <span className="material-icons">{item.icon}</span>
                                                        <span>{item.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                scheduleTopicActions.slice(0, 2).map((item) => (
                                                    <div
                                                        className="schedule-table-actions-container"
                                                        data-test={`schedule-topic-action-${item.name.toLowerCase()}`}
                                                        key={item.name}
                                                        onClick={() => item.onClick(topic, isTypeRead)}>
                                                        <span className="material-icons">{item.icon}</span>
                                                        <span>{item.name}</span>
                                                    </div>
                                                ))
                                            )}
                                        </CommonPopOver>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </ScheduleTable>
                ) : (
                    <Paper className="no-result-found">
                        <CommonStatus
                            className="no_match_item_status"
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                            heading={'Nothing scheduled yet'}
                            subHeading={'When anything is scheduled it will appear here'}
                        />
                    </Paper>
                )}
            </div>

            {selectedTopicIds.length > 0 && (
                <Paper className="schedule-selected-topics-actions" sx={{ mt: 2, px: 3, py: 3, position: 'sticky', bottom: 0, zIndex: 1 }}>
                    <Grid container justifyContent={'space-between'} alignItems={'center'} gap={1}>
                        <Heading3 text="Actions:" />
                        <LWPButton
                            btnText={`Remove ${countWithPlural('topic', selectedTopicIds.length)}`}
                            startIcon="delete"
                            sx={{
                                borderRadius: '4px',
                                border: '1px solid  #999591',
                                fontWeight: '400 !important',
                                fontSize: '14px'
                            }}
                            onClick={() => setRemoveTopicsModalOpen(true)}
                            dataTest="remove-selected-topics-button"
                            variant="outlined"
                            color="inherit"
                        />
                    </Grid>
                </Paper>
            )}

            <ConfirmationModal
                open={removeTopicsModalOpen}
                onCancel={() => setRemoveTopicsModalOpen(false)}
                loading={deleteClassTopicsLoading}
                heading={`Remove ${countWithPlural('topic', selectedTopicIds.length, false)} from this class?`}
                btnText="Yes"
                onConfirm={handleRemoveSelectedTopics}>
                <Paragraph
                    text={`Are you sure you wish to remove ${countWithPlural(
                        'topic',
                        selectedTopicIds.length
                    )} from ${classDetails?.name}? Parents and pupils will no longer see them.`}
                />
            </ConfirmationModal>

            {updateTopicModal?.isOpen && (
                <UpdateTopicModal
                    open={updateTopicModal?.isOpen}
                    setOpen={() =>
                        setUpdateTopicModal({
                            isOpen: !updateTopicModal?.isOpen,
                            editable: null
                        })
                    }
                    secondaryText={updateTopicModal?.editable ? 'Remove topic' : null}
                    primaryText={`${updateTopicModal?.editable ? 'Update' : 'Add'} topic`}
                    topicData={updateTopicModal?.editable ? updateTopicModal?.editable : isReleasedData ? isReleasedData : addTopic}
                    isReleasedClick={updateTopicModal?.editable || addTopic ? false : true}
                    showSetByTeacherDetails={true}
                    // Show the scrapbook prompt only for Ready Teddy topics when the feature is enabled for the school
                    showScrapbookPrompt={classDetails?.school?.isScrapbookEnabledForSchool}
                />
            )}
            {addReadingNotesModal && (
                <DialogWrapper
                    primaryBtnHandler={handleSubmit}
                    primaryBtnloading={saveReadingNoteLoading}
                    dialogFooter
                    open={addReadingNotesModal}
                    setOpen={() => setAddReadingNotesModal(!addReadingNotesModal)}
                    primaryBtnText={'Update'}
                    cancelBtn
                    contentWidth="750px"
                    heading={'Edit reading week'}
                    subHeading={
                        <Paragraph
                            text={`${showDate(selectedTopic?.releaseDate)} to ${_readingTopicShortEndDateHandler(
                                selectedTopic?.releaseDate
                            )} · Reading`}
                        />
                    }>
                    <InputField
                        value={readingNote}
                        multiline
                        minRows={2}
                        wordCount={readingNote?.length ?? 0}
                        inputProps={{
                            maxlength: 250
                        }}
                        onChange={(e) => setReadingNote(e.target.value)}
                        label="Message (optional)"
                        type="text"
                        disabled={!isDateInOrAfterCurrentWeek(selectedTopic?.releaseDate)}
                        md={12}
                        lg={12}
                    />
                    <div className="mb10">
                        <Paragraph>This note will appear at the top of the student’s reading log during this week.</Paragraph>
                    </div>
                    <CommonSelectField
                        value={readingTarget}
                        onChange={(e) => setReadingTarget(e.target.value)}
                        options={sharedJson?.weeklyReadingTarget}
                        disabled={selectedTopic?.released}
                        label="Weekly reading target"
                        md={12}
                        lg={12}
                    />
                </DialogWrapper>
            )}
        </div>
    );
};

Schedule.pageType = PageType.TEACHER;
Schedule.pageTitle = 'Class: Schedule';

export default Schedule;
