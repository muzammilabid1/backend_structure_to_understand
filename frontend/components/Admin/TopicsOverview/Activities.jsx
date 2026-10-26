import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Button, CardActions, CardContent, Chip, Collapse, Grid, Stack, Typography } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useMemo } from 'react';

import { getAllYearGroups } from '../../../graphQl/queries';
import { readingAsASubjectId, readingAsASubjectName } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonPagination from '../../Shared/CommonPagination';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonTag from '../../Shared/CommonTag';
import InputField from '../../Shared/InputField/InputField';
import Paragraph from '../../Shared/Typography/Paragraph';

const getAllActivities = gql`
    query allActivities {
        allActivities {
            id
            name
            activityType
            order
            isHidden
            topic {
                teacherTopicName
                yearGroups {
                    year
                    shortName
                }
                domains {
                    id
                    title
                    subject {
                        id
                        name
                    }
                }
            }
            tags {
                name
                color
            }
            steps {
                ... on StaticLwpActivityLegacy {
                    legacySteps {
                        stepType
                    }
                }
            }
        }
    }
`;

const getAllSubjectsForActivities = gql`
    query getAllSubjects {
        getAllSubjects {
            id
            name
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

const allTopicDomainsQuery = gql`
    query allTopicDomains {
        allTopicDomains {
            id
            title
        }
    }
`;

const ITEM_PER_ROW = 20;

const Activities = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const { callSnackbar } = useContext(ThemeContext);

    const { loading, data: allActivities, error: activitiesError } = useQuery(getAllActivities);

    const [fetchAllTags, { data: allTagsData, loading: tagsLoding, error: tagsError }] = useLazyQuery(getTagsForAdmin);

    const [fetchAllTopicDomains, { data: allTopicDomainsData, loading: topicsLoding, error: topicDomainsError }] =
        useLazyQuery(allTopicDomainsQuery);

    const [fetchAllSubjects, { data: allSubjectsData, loading: subjectsLoading, error: subjectsError }] =
        useLazyQuery(getAllSubjectsForActivities);

    const [fetchYearGroups, { data: yearGroupsData, loading: yearGroupLoading, error: yearGroupsError }] = useLazyQuery(getAllYearGroups);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, activitiesError);
        handleErrorSnackbar(callSnackbar, tagsError);
        handleErrorSnackbar(callSnackbar, topicDomainsError);
        handleErrorSnackbar(callSnackbar, subjectsError);
        handleErrorSnackbar(callSnackbar, yearGroupsError);
    }, [activitiesError, tagsError, topicDomainsError, subjectsError, yearGroupsError]);

    const isOpen = searchParams.get('isOpen') === 'true';
    const searchActivity = searchParams.get('searchActivity');
    const activityStep = searchParams.get('activityStep') ? JSON.parse(searchParams.get('activityStep')) : null;
    const tags = searchParams.get('tags') ? JSON.parse(searchParams.get('tags')) : null;
    const domains = searchParams.get('domains') ? JSON.parse(searchParams.get('domains')) : null;
    const subjects = searchParams.get('subjects') ? JSON.parse(searchParams.get('subjects')) : null;
    const yearGroup = searchParams.get('yearGroup') ? JSON.parse(searchParams.get('yearGroup')) : null;
    const currentPage = +(searchParams.get('page') || 1);

    useEffect(() => {
        if (isOpen) {
            fetchAllTags();
            fetchAllTopicDomains();
            fetchAllSubjects();
            fetchYearGroups();
        }
    }, [isOpen]);

    const tagsForAdmin = useMemo(() => {
        const tags = allTagsData?.getTagsForAdmin ?? [];

        return tags?.length > 0
            ? [{ name: '(no tag)', id: `noTag`, color: '#F5F5F5' }, { name: '(any tag)', id: `anyTag`, color: '#F5F5F5' }, ...tags]
            : [
                  { name: '(no tag)', id: `noTag`, color: '#F5F5F5' },
                  { name: '(any tag)', id: `anyTag`, color: '#F5F5F5' }
              ];
    }, [allTagsData]);

    const allTopicDomains = useMemo(() => allTopicDomainsData?.allTopicDomains ?? [], [allTopicDomainsData]);
    const allSubjects = useMemo(() => allSubjectsData?.getAllSubjects ?? [], [allSubjectsData]);
    const yearGroups = useMemo(() => yearGroupsData?.allYearGroup ?? [], [yearGroupsData]);

    const _getStep = (activityStep) => {
        if (typeof activityStep === 'string') {
            return (sharedJson?.activity_step_types || [])?.filter((i) => i?.key === activityStep);
        }

        return activityStep?.map((activityStep) => (sharedJson?.activity_step_types || [])?.find((i) => i?.key === activityStep));
    };

    const _getTags = (tags) => {
        if (typeof tags === 'string') {
            return (tagsForAdmin?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.filter((i) => i?.value === tags);
        }

        return tags?.map((tags) => (tagsForAdmin?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.find((i) => i?.value === tags));
    };
    const _getDomains = (domains) => {
        if (typeof domains === 'string') {
            return (allTopicDomains?.map((t) => ({ key: t.id, value: t.title })) || [])?.filter((i) => i?.value === domains);
        }

        return domains?.map((domains) =>
            (allTopicDomains?.map((t) => ({ key: t.id, value: t.title })) || [])?.find((i) => i?.value === domains)
        );
    };

    const _getSubjects = (subjects) => {
        if (allSubjects) {
            const allSubjectsData = allSubjects.concat([{ name: readingAsASubjectName, id: readingAsASubjectId }]);

            if (typeof subjects === 'string') {
                return (allSubjectsData || [])?.filter((i) => i?.id === subjects)?.map((i) => ({ value: `${i?.name}`, key: i?.id }));
            }

            return subjects.map((num) => {
                return (allSubjectsData || [])?.filter((i) => i?.id === num)?.map((i) => ({ value: `${i?.name}`, key: i?.id }))[0];
            });
        }
    };

    const _onReset = (resetForm) => {
        resetForm({
            values: {
                activityStep: [],
                tags: [],
                yearGroup: [],
                subjects: [],
                domains: []
            }
        });

        router?.push({
            query: {
                activityStep: [],
                tags: [],
                yearGroup: [],
                domains: [],
                subjects: [],
                isOpen: true,
                tab: 1,
                page: 1
            }
        });
    };

    const _getYearGroup = (year) => {
        if (typeof year === 'string') {
            return yearGroups
                ?.filter((i) => i?.year === year)
                .map((year) => ({
                    value: year.year,
                    key: year.year
                }));
        }

        return year
            ?.map((year) => {
                return yearGroups?.find((i) => i?.year === year);
            })
            .map((t) => ({
                value: t?.year,
                key: t?.year
            }));
    };

    const { activities, totalPages } = useMemo(() => {
        let activities = allActivities?.allActivities ?? [];

        if (activityStep) {
            if (typeof activityStep === 'string') {
                activities = activities.filter((activity) => {
                    let filter = activity.steps.legacySteps.some(({ stepType }) => stepType === activityStep);

                    return filter;
                });
            } else if (activityStep?.length > 0) {
                activities = activities.filter((activity) => {
                    let filter = activity.steps.legacySteps.some(({ stepType }) => (activityStep || []).indexOf(stepType) !== -1);

                    return filter;
                });
            }
        }

        if (tags) {
            if (typeof tags === 'string') {
                activities = activities.filter((activity) => {
                    let filter = activity.tags.some(({ name }) => name === tags);

                    return filter;
                });
            } else if (tags?.length > 0) {
                const noTag = tags?.includes('(no tag)');
                const anyTag = tags?.includes('(any tag)');
                let filterNoTag = false;
                let filterAnyTag = false;

                activities = activities.filter((activity) => {
                    let filterTags = activity.tags.some(({ name }) => (tags || []).indexOf(name) !== -1);

                    if (noTag) {
                        filterNoTag = !activity.tags?.length;
                    }

                    if (anyTag) {
                        filterAnyTag = !!activity.tags?.length;
                    }

                    return filterTags || filterAnyTag || filterNoTag;
                });
            }
        }

        if (domains) {
            if (typeof domains === 'string') {
                activities = activities.filter((activity) => {
                    if (activity?.topic?.domains?.some(({ title }) => title === domains)) {
                        return activity;
                    }
                });
            } else if (domains?.length > 0) {
                activities = activities.filter((activity) => {
                    let filter = activity?.topic?.domains?.some(({ title }) => (domains || []).indexOf(title) !== -1);

                    return filter;
                });
            }
        }

        if (subjects) {
            if (typeof subjects === 'string') {
                activities = activities.filter((activity) => {
                    return activity?.topic?.domains?.some((domain) => domain?.subject?.id === subjects);
                });
            } else if (subjects?.length > 0) {
                activities = activities.filter((activity) => {
                    return activity?.topic?.domains.some((domain) => subjects.map((subject) => subject).includes(domain.subject.id));
                });
            }
        }

        if (yearGroup) {
            if (typeof yearGroup === 'string') {
                activities = activities?.filter((activity) => {
                    return activity?.topic?.yearGroups.some((i) => i.year === yearGroup);
                });
            } else if (yearGroup?.length > 0) {
                activities = activities?.filter((activity) => activity?.topic?.yearGroups.some((i) => yearGroup.includes(i.year)));
            }
        }

        if (searchActivity) {
            activities = activities?.filter((activity) => activity?.name?.toLowerCase()?.includes(searchActivity.toLowerCase()));
        }

        const startIndex = (currentPage - 1) * ITEM_PER_ROW;
        const endIndex = startIndex + ITEM_PER_ROW;

        const activitiesRow = activities.slice(startIndex, endIndex)?.map((activity) => {
            return {
                id: activity.id,
                col1: activity?.name,
                col2: activity?.topic?.teacherTopicName ?? '-',
                col3:
                    activity?.topic?.domains?.length > 0 ? (activity?.topic?.domains || [])?.map((d) => d?.subject?.name).join(', ') : '-',
                col4: activity?.topic?.domains?.length > 0 ? (activity?.topic?.domains || [])?.map((d) => d?.title).join(', ') : '-',
                col5: activity?.topic?.yearGroups?.length > 0 ? activity?.topic?.yearGroups?.map((y) => y?.shortName).join(', ') : '-',
                col7: (
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        <CommonPopOver icon={'tag'} hover>
                            <Stack direction="row" spacing={1}>
                                {!activity?.tags?.length && 'No Tags'}
                                {activity?.tags.map((tag) => (
                                    <Chip color="primary" style={{ backgroundColor: `${tag?.color}` }} label={tag?.name} />
                                ))}
                            </Stack>
                        </CommonPopOver>
                        <CommonIconButton disabled icon={activity?.isHidden ? 'visibility_off' : 'visibility'} />
                    </span>
                )
            };
        });

        return {
            activities: activitiesRow,
            totalPages: Math.ceil(activities.length / ITEM_PER_ROW)
        };
    }, [activityStep, tags, domains, subjects, yearGroup, allActivities, currentPage, searchActivity]);

    const isQueriesLoading = loading || tagsLoding || topicsLoding || subjectsLoading || yearGroupLoading;

    useEffect(() => {
        if (currentPage > totalPages && !isQueriesLoading) {
            handlePageChange(null, 1);
        }
    }, [totalPages, isQueriesLoading]);

    const head = [
        {
            accessor: 'col1',
            Header: 'Name',
            Cell: (params) => (
                <Link passHref href={`/admin/activity/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                </Link>
            ),
            width: '250'
        },
        { accessor: 'col2', Header: 'Topic name' },
        { accessor: 'col3', Header: 'Subjects' },
        { accessor: 'col4', Header: 'Domain' },
        { accessor: 'col5', Header: 'Year group' },
        { accessor: 'col7', Header: '' }
    ];

    const handlePageChange = (_, pageNumber) => {
        router.push({ query: { ...router.query, page: pageNumber } });
    };

    if (loading) return <CommonLoading />;

    return (
        <div className="classes_overview">
            <div className="school-filter-button">
                <Button className="filter-button" onClick={() => router.push({ query: { ...router.query, isOpen: !isOpen } })}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>
            <Collapse className="school-collapse" in={isOpen}>
                <Formik
                    enableReinitialize
                    initialValues={{
                        activityStep: activityStep ? _getStep(activityStep) : [],
                        searchByName: searchActivity ?? null,
                        tags: tags ? _getTags(tags) : [],
                        domains: domains ? _getDomains(domains) : [],
                        subjects: subjects ? _getSubjects(subjects) : [],
                        yearGroup: yearGroup ? _getYearGroup(yearGroup) : []
                    }}
                    onSubmit={(values) => {
                        const { activityStep, searchByName, tags, domains, subjects, yearGroup } = values;
                        const activityKey = activityStep.map((t) => t.key);
                        const activityTags = tags.map((t) => t.value);
                        const activityDomains = domains.map((t) => t.value);
                        const subjectKey = subjects.map((t) => t.key);
                        const yearGroupKey = yearGroup.map((t) => t.key);

                        router?.push({
                            query: {
                                searchActivity: searchByName,
                                activityStep: JSON.stringify(activityKey),
                                tags: JSON.stringify(activityTags),
                                domains: JSON.stringify(activityDomains),
                                subjects: JSON.stringify(subjectKey),
                                yearGroup: JSON.stringify(yearGroupKey),
                                isOpen: true
                            }
                        });
                    }}>
                    {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm }) => {
                        return (
                            <CommonCard className={`feeds-filter-container ${isOpen ? 'show' : 'notShow'}`}>
                                <CardContent>
                                    <Grid spacing={3} container>
                                        <InputField
                                            name="searchByName"
                                            value={values.searchByName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errors.searchByName}
                                            touched={touched.searchByName}
                                            label="Search activities"
                                            type="text"
                                            md={12}
                                            lg={12}
                                        />
                                        <CommonMultiSelect
                                            value={values.activityStep}
                                            options={(sharedJson?.activity_step_types || []).map((activityStep) => ({
                                                value: activityStep.value,
                                                key: activityStep.key
                                            }))}
                                            label="Activity step"
                                            name="activityStep"
                                            error={errors.activityStep}
                                            touched={touched.activityStep}
                                            onChange={(value) =>
                                                handleChange({
                                                    target: { name: 'activityStep', value: value }
                                                })
                                            }
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'activityStep', value: value }
                                                })
                                            }
                                        />

                                        <CommonMultiSelect
                                            value={values.tags}
                                            options={tagsForAdmin.map((item) => ({
                                                value: item.name,
                                                id: item.id,
                                                color: item.color
                                            }))}
                                            label="Tags"
                                            name="tags"
                                            error={errors.tags}
                                            touched={touched.tags}
                                            onChange={(value) =>
                                                handleChange({
                                                    target: { name: 'tags', value: value }
                                                })
                                            }
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'tags', value: value }
                                                })
                                            }
                                            renderTags={(value, getTagProps) =>
                                                value.map((option, index) => (
                                                    <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                                ))
                                            }
                                        />

                                        <CommonMultiSelect
                                            value={values.domains}
                                            options={(allTopicDomains || []).map((item) => ({
                                                value: item.title,
                                                id: item.id
                                            }))}
                                            label="Domains"
                                            name="domains"
                                            error={errors.domains}
                                            touched={touched.domains}
                                            onChange={(value) =>
                                                handleChange({
                                                    target: { name: 'domains', value: value }
                                                })
                                            }
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'domains', value: value }
                                                })
                                            }
                                        />

                                        <CommonMultiSelect
                                            value={values.subjects}
                                            options={allSubjects.map((subject) => ({
                                                key: subject?.id,
                                                value: subject?.name
                                            }))}
                                            label="Subjects"
                                            name="Subjects"
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
                                        />

                                        <CommonMultiSelect
                                            value={values.yearGroup}
                                            options={yearGroups.map((yearGroup) => ({
                                                value: yearGroup.year,
                                                key: yearGroup.year
                                            }))}
                                            label="Year group"
                                            name="yearGroup"
                                            error={errors.yearGroup}
                                            touched={touched.yearGroup}
                                            onChange={(value) =>
                                                handleChange({
                                                    target: { name: 'yearGroup', value: value }
                                                })
                                            }
                                            onBlur={(value) =>
                                                handleBlur({
                                                    target: { name: 'yearGroup', value: value }
                                                })
                                            }
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
                                        // loading={primaryBtnloading}
                                    />
                                    <LWPButton
                                        size={'large'}
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSubmit}
                                        btnText={'Apply'}
                                        // loading={primaryBtnloading}
                                    />
                                </CardActions>
                            </CommonCard>
                        );
                    }}
                </Formik>
            </Collapse>
            <CommonDraggableTable rows={activities} columns={head} customClass="row-height" />
            <CommonPagination page={currentPage} count={totalPages} onChange={handlePageChange} />
        </div>
    );
};

Activities.propTypes = { topics: PropTypes.array };

export default Activities;
