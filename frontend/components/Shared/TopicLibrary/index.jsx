/* eslint-disable @next/next/no-img-element */

import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Alert, Grid, Paper, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/styles';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { ADMIN, MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getTopicType, getYearGroups, hasNonNullId, ThemeContext, trackFilterItems } from '../../../shared/Services/handler';
import AutoScheduleClassPicker from '../../Class/AssignSequence/AutoScheduleClassPicker';
import SetATopicHeader, { SetATopicTab } from '../../School/WholeSchoolAutoSchedule/SetATopicHeader';
import TopicSummaryCard from '../../Teacher/Cards/TopicSummaryCard';
import LWPButton from '../Button/LWPButton';
import CommonError from '../CommonError';
import CommonLoading from '../CommonLoading';
import CommonMultiSelect from '../CommonMultiSelect';
import CommonStatus from '../CommonStatus';
import InputField from '../InputField/InputField';
import Paragraph from '../Typography/Paragraph';

// Queries
const getAllTopics = gql`
    query allTopics($filter: TopicFilter, $schoolId: String) {
        allTopics(filter: $filter, schoolId: $schoolId) {
            id
            teacherTopicName
            video
            teacherPdf
            teacherDescription
            year
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

const getTopicDomains = gql`
    query allTopicDomainsWithTopics($yearGroupIds: [String!], $subjects: [String!], $schoolId: String!) {
        allTopicDomainsWithTopics(yearGroupIds: $yearGroupIds, subjects: $subjects, schoolId: $schoolId) {
            id
            title
        }
    }
`;

const getTopicSubjectsForSchedule = gql`
    query allSubjectsWithTopics($yearGroupIds: [String!], $schoolId: String!) {
        allSubjectsWithTopics(yearGroupIds: $yearGroupIds, schoolId: $schoolId) {
            id
            name
        }
    }
`;

const getAllYearGroups = gql`
    query allYearGroupsWithTopics($schoolId: String!) {
        allYearGroupsWithTopics(schoolId: $schoolId) {
            id
            year
            shortName
        }
    }
`;

const TopicLibrary = () => {
    const initialVal = 9;

    const ref = useRef(null);
    const isDirty = useRef(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const router = useRouter();

    const searchParams = useSearchParams();
    const queryParams = useParams();

    const { callSnackbar, token } = useContext(ThemeContext);
    const [searchTopic, setSearchTopic] = useState([]);
    const [loadMore, setLoadMore] = useState(initialVal);

    const schoolId = queryParams?.school_id;

    const topicLibraryRoute = `/school/${schoolId}/topic-library`;

    const [getAllTopicsQuery, { loading: allTopicsLoading, error: allTopicsError, data: allTopics }] = useLazyQuery(getAllTopics);
    const [getTopicDomainsQuery, { loading: getTopicDomainsLoading, error: getTopicDomainsError, data: topicDomainsData }] =
        useLazyQuery(getTopicDomains);

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups, {
        variables: { schoolId },
        skip: !schoolId
    });

    const [getTopicSubjectsQuery, { error: getTopicSubjectsError, data: topicSubjectsData }] = useLazyQuery(getTopicSubjectsForSchedule);

    useEffect(() => {
        allTopicsError?.message && callSnackbar(allTopicsError, 'error');
        getTopicDomainsError?.message && callSnackbar(getTopicDomainsError, 'error');
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
        getTopicSubjectsError?.message && callSnackbar(getTopicSubjectsError, 'error');
    }, [allTopicsError, getTopicDomainsError, yearGroupError]);

    const year = searchParams.get('year');
    const subjects = searchParams.get('subjects');
    const domain = searchParams.get('domain');
    const search = searchParams.get('search');

    useEffect(() => {
        if (year && subjects && domain && ref && yearGroups && schoolId) {
            setInitialValues();
        }
    }, [year, subjects, domain, ref, yearGroups, schoolId]);

    const setInitialValues = async () => {
        await getAllTopicsQuery({
            variables: {
                filter: { year: JSON.parse(year), subjects: JSON.parse(subjects), domain: JSON.parse(domain), isHidden: false },
                schoolId
            }
        });

        const {
            data: { allSubjectsWithTopics }
        } = await getTopicSubjectsQuery({ variables: { yearGroupIds: JSON.parse(year), schoolId } });

        const {
            data: { getTopicDomains }
        } = await getTopicDomainsQuery({ variables: { yearGroupIds: JSON.parse(year), subjects: JSON.parse(subjects), schoolId } });

        ref?.current?.setValues({
            year:
                JSON.parse(year)?.length > 0
                    ? yearGroups?.allYearGroupsWithTopics
                          ?.filter((item) => JSON.parse(year)?.includes(item.id))
                          ?.map((item) => ({ ...item, id: item.id, value: item.year }))
                    : [{ id: null, value: 'All' }],

            subjects:
                JSON.parse(subjects)?.length > 0
                    ? allSubjectsWithTopics
                          ?.filter((subject) => JSON.parse(subjects)?.includes(subject?.id))
                          ?.map((subject) => ({
                              value: subject?.name,
                              id: subject?.id
                          }))
                    : [{ id: null, value: 'All' }],
            domain:
                JSON.parse(domain)?.length > 0
                    ? getTopicDomains
                          ?.filter((item) => JSON.parse(domain)?.includes(item.id))
                          ?.map((item) => ({ ...item, value: item.title, id: item.id }))
                    : [{ id: null, value: 'All' }],
            search: search
        });
    };

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

    const displayItems = (values) => {
        return values?.length > 0 && values?.every((x) => x?.id === null) ? [{ id: null, value: 'All' }] : hasNonNullId(values);
    };

    return (
        <div data-test={'topic-library-section'}>
            {/* Leaders and admins get the Auto schedule tab beside this one (LEA-6687). Teachers keep
                the heading they had, because the tab leads to a school leader page. */}
            {token?.userType === ADMIN || token?.isSchoolLeader ? (
                <SetATopicHeader schoolId={schoolId} active={SetATopicTab.TopicLibrary} />
            ) : (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Book_Open_Orange.png`}
                    imageAlt={'Open book'}
                    heading="Topic library"
                />
            )}

            {/* Scheduling a whole sequence sits alongside scheduling one topic, which is what the rest
                of this page is for, and it is the same relationship the class schedule page already
                has between its Auto-schedule button and its topic filters. It takes its own row rather
                than sharing the heading's, because that heading is either centred (teachers) or carries
                the Set a topic tabs (leaders and admins).

                The row is rendered whether or not it has a button in it, so the filters below never
                move once the availability query answers. */}
            <AutoScheduleClassPicker schoolId={schoolId} />

            <Formik
                innerRef={ref}
                initialValues={{
                    year: [],
                    subjects: [],
                    domain: [],
                    search: ''
                }}
                // validationSchema={topicLibraryValidation}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        trackFilterItems(values, 'Topic library page');
                        router?.push({
                            pathname: topicLibraryRoute,
                            query: {
                                year: JSON.stringify(hasNonNullId(values['year'])?.map(({ id }) => id)),
                                subjects: JSON.stringify(hasNonNullId(values['subjects'])?.map(({ id }) => id)),
                                domain: JSON.stringify(hasNonNullId(values['domain'])?.map(({ id }) => id)),
                                search: values['search']
                            }
                        });
                    } catch (err) {
                        console.log('Err:', err);
                    }
                }}>
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => {
                    const isValid =
                        hasNonNullId(values?.year)?.length > 0 ||
                        hasNonNullId(values?.subjects)?.length > 0 ||
                        hasNonNullId(values?.domain)?.length > 0;

                    if (isDirty.current && year && !isValid) {
                        router?.push(topicLibraryRoute);
                    }

                    return (
                        <>
                            <Grid container spacing={3} rowSpacing={1}>
                                <CommonMultiSelect
                                    name="year"
                                    label="Year group"
                                    value={displayItems(values?.year)}
                                    filterSelectedOptions={false}
                                    options={(yearGroups?.allYearGroupsWithTopics
                                        ? [{ id: null, year: 'All' }, ...yearGroups.allYearGroupsWithTopics]
                                        : []
                                    ).map((yearGroup) => ({
                                        value: yearGroup.year,
                                        id: yearGroup.id
                                    }))}
                                    onChange={(value) => {
                                        isDirty.current = true;

                                        const includesAll = value?.some((x, i) => (i === 0 ? false : x?.id === null));

                                        handleChange({
                                            target: { name: 'year', value: includesAll ? [{ id: null, value: 'All' }] : value }
                                        });

                                        handleChange({
                                            target: { name: 'subjects', value: [] }
                                        });

                                        handleChange({
                                            target: { name: 'domain', value: [] }
                                        });

                                        getTopicSubjectsQuery({
                                            variables: { yearGroupIds: hasNonNullId(includesAll ? [] : value)?.map((y) => y?.id), schoolId }
                                        });

                                        getTopicDomainsQuery({
                                            variables: {
                                                yearGroupIds: hasNonNullId(includesAll ? [] : value)?.map((y) => y?.id),
                                                subjects: hasNonNullId(values?.subjects)?.map((y) => y?.id),
                                                schoolId
                                            }
                                        });
                                    }}
                                    onBlur={handleBlur}
                                    error={errors?.year}
                                    touched={touched?.year}
                                    lg={4}
                                    md={4}
                                    dataTest={'topic-library-year-group-select'}
                                />

                                <CommonMultiSelect
                                    name={'subjects'}
                                    label="Subjects"
                                    filterSelectedOptions={false}
                                    value={displayItems(values?.subjects)}
                                    options={topicSubjectsData?.allSubjectsWithTopics
                                        .map((subject) => ({ id: subject.id, value: subject?.name }))
                                        .concat([{ id: null, value: 'All' }])}
                                    onChange={(value) => {
                                        isDirty.current = true;

                                        const includesAll = value?.some((x, i) => (i === 0 ? false : x?.id === null));

                                        handleChange({
                                            target: { name: 'subjects', value: includesAll ? [{ id: null, value: 'All' }] : value }
                                        });

                                        handleChange({
                                            target: { name: 'domain', value: [] }
                                        });

                                        getTopicDomainsQuery({
                                            variables: {
                                                yearGroupIds: hasNonNullId(values?.year)?.map((y) => y?.id),
                                                subjects: hasNonNullId(includesAll ? [] : value)?.map((y) => y?.id),
                                                schoolId
                                            }
                                        });
                                    }}
                                    onBlur={handleBlur}
                                    error={errors?.subjects}
                                    touched={touched?.subjects}
                                    lg={4}
                                    md={4}
                                    dataTest="topic-library-subjects-select"
                                />

                                <CommonMultiSelect
                                    name={'domain'}
                                    label="Domain"
                                    filterSelectedOptions={false}
                                    value={displayItems(values?.domain)}
                                    options={(topicDomainsData?.allTopicDomainsWithTopics
                                        ? [{ id: null, title: 'All' }, ...topicDomainsData.allTopicDomainsWithTopics]
                                        : []
                                    ).map((domain) => ({ value: domain.title, id: domain.id }))}
                                    onChange={(value) => {
                                        isDirty.current = true;

                                        const includesAll = value?.some((x, i) => (i === 0 ? false : x?.id == null));

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
                                    dataTest={
                                        getTopicDomainsLoading ? 'disabled-topic-library-domain-select' : 'topic-library-domain-select'
                                    }
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
                                            btnText="Search"
                                            onClick={isValid ? handleSubmit : null}
                                            style={{ opacity: isValid ? 1 : 0.5 }}
                                            dataTest={'topic-library-search-btn'}
                                        />
                                        <LWPButton
                                            btnText="Reset"
                                            onClick={() => {
                                                router?.push(topicLibraryRoute);
                                            }}
                                            color="inherit"
                                            variant="text"
                                        />
                                    </div>
                                    <CommonError error={errors?.isvalide} touched={true} />
                                </Grid>
                            </Grid>
                        </>
                    );
                }}
            </Formik>
            <br />

            {!year ? (
                <Alert
                    style={{ alignItems: 'center' }}
                    icon={
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/alert-mathscot-topic.svg`}
                        />
                    }
                    severity="info">
                    <Paragraph text="Please start by selecting some options to search for topics" />
                </Alert>
            ) : (
                ''
            )}

            <Grid container spacing={3} className="schedule-topic-cards" justifyContent={isMobile && 'center'}>
                {allTopicsLoading ? (
                    <div className="loading_container">
                        <CommonLoading />
                    </div>
                ) : (
                    searchTopic.slice(0, loadMore).map((topic) => (
                        <TopicSummaryCard
                            key={topic?.id}
                            name={topic?.teacherTopicName}
                            teacherDescription={topic?.teacherDescription}
                            yearGroup={getYearGroups(topic?.yearGroups)}
                            domain={topic?.domain}
                            type={getTopicType(false)}
                            subject={topic?.domains?.map((domain) => domain?.subject?.name).join(', ')}
                            previewHandler={() => {
                                window.open(
                                    `${location.protocol}//${location.host}/previewtopic/${topic?.id}`,
                                    '_blank',
                                    `width=${window.innerWidth}, height=${window.innerHeight}`
                                );
                            }}
                            selectHandler={() => {
                                router?.push(
                                    token?.userType === ADMIN
                                        ? `/school/${queryParams?.school_id}/set-topic/${topic?.id}`
                                        : `/set-topic/${topic?.id}`
                                );
                            }}
                        />
                    ))
                )}
            </Grid>
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
                        className="no_match_item_status_topic_libary"
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        heading={'No search results found'}
                        subHeading={'Maybe try searching again by using different filters or keywords'}
                    />
                </Paper>
            )}
        </div>
    );
};

export default TopicLibrary;
