/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/display-name */
import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid, Stack } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { getAllTopicDomains, getAllYearGroups, getTopicTagsForAdmin } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { capitalizeFirstLetter, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonSelectField from '../../Shared/CommonSelectField';
import CommonTag from '../../Shared/CommonTag';
import InputField from '../../Shared/InputField/InputField';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Paragraph from '../../Shared/Typography/Paragraph';
import ShowSchoolTags from './ShowSchoolTags';

const getAllSubjectsForTopics = gql`
    query getAllSubjects {
        getAllSubjects {
            id
            name
        }
    }
`;

const deleteTopic = gql`
    mutation deleteTopic($id: String!) {
        deleteTopic(id: $id) {
            status
            msg
        }
    }
`;

const Topics = ({ topics, topicQuery }) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState({ open: false, id: null });

    const { data: allTags } = useQuery(getTopicTagsForAdmin);

    const searchTopic = searchParams.get('searchTopic');
    const subjects = searchParams.get('subjects') ? JSON.parse(searchParams.get('subjects')) : null;
    const yearGroup = searchParams.get('yearGroup') ? JSON.parse(searchParams.get('yearGroup')) : null;
    const topicDomain = searchParams.get('topicDomain');
    const hideHiddenTopics = searchParams.get('hideHiddenTopics');
    const tags = searchParams.get('tags') ? JSON.parse(searchParams.get('tags')) : null;
    const topicStatus = searchParams.get('topicStatus') ? JSON.parse(searchParams.get('topicStatus')) : ['Limited release', 'Available'];

    const [deleteTopicMutation, { loading: deleteTopicLoading }] = useMutation(deleteTopic, {
        refetchQueries: [
            {
                query: topicQuery
            }
        ],
        awaitRefetchQueries: true
    });

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);
    const { error: topicDomainError, data: topicDomains } = useQuery(getAllTopicDomains);
    const { error: allSubjectsError, data: allSubjects } = useQuery(getAllSubjectsForTopics);

    useEffect(() => {
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
        topicDomainError?.message && callSnackbar(topicDomainError, 'error');
        allSubjectsError?.message && callSnackbar(allSubjectsError, 'error');
    }, [topicDomainError, yearGroupError]);

    const tagsForAdmin =
        allTags?.getTopicTagsForAdmin?.length > 0
            ? [
                  { name: '(no tag)', id: `noTag`, color: '#F5F5F5' },
                  { name: '(any tag)', id: `anyTag`, color: '#F5F5F5' },
                  ...allTags.getTopicTagsForAdmin
              ]
            : [
                  { name: '(no tag)', id: `noTag`, color: '#F5F5F5' },
                  { name: '(any tag)', id: `anyTag`, color: '#F5F5F5' }
              ];

    const _getSubject = (subject) => {
        if (allSubjects) {
            if (typeof subject === 'string') {
                return (allSubjects?.getAllSubjects || [])
                    ?.filter((i) => i?.id === subject)
                    ?.map((i) => ({ value: `${i?.name}`, key: i?.id }));
            }

            return subject.map((num) => {
                return (allSubjects?.getAllSubjects || [])
                    ?.filter((i) => i?.id === num)
                    ?.map((i) => ({ value: `${i?.name}`, key: i?.id }))[0];
            });
        }
    };

    const _getYearGroup = (year) => {
        if (typeof year === 'string') {
            return (yearGroups?.allYearGroup || [])
                ?.filter((i) => i?.year === year)
                .map((year) => ({
                    value: year.year,
                    key: year.year
                }));
        }

        return year
            ?.map((year) => {
                return (yearGroups?.allYearGroup || [])?.find((i) => i?.year === year);
            })
            .map((t) => ({
                value: t?.year,
                key: t?.year
            }));
    };

    const _onReset = (resetForm) => {
        resetForm({
            values: {
                subjects: [],
                searchByName: null,
                tags: [],
                yearGroup: [],
                topicDomain: null,
                topicStatus: [],
                hideHiddenTopics: false
            }
        });

        router?.push({
            query: {
                subjects: [],
                search: null,
                tags: [],
                yearGroup: [],
                topicDomain: null,
                topicStatus: [],
                hideHiddenTopics: false
            }
        });
    };

    const _onClick = (id) => {
        setOpenDeleteItemConfirmationModal({ open: true, id: id });
    };

    const _onClose = () => {
        setOpenDeleteItemConfirmationModal({ open: false, id: null });
    };

    const _getTags = (tags) => {
        if (typeof tags === 'string') {
            return (tagsForAdmin?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.filter((i) => i?.value === tags);
        }

        return tags?.map((tags) => (tagsForAdmin?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.find((i) => i?.value === tags));
    };

    const topicStatusOptions = [
        { key: 'draft', value: 'Draft' },
        { key: 'hidden', value: 'Hidden' },
        { key: 'limitedRelease', value: 'Limited release' },
        { key: 'available', value: 'Available' }
    ];

    const _getStatus = (topicStatus) => {
        return topicStatus?.map((item) =>
            (topicStatusOptions?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.find((i) => i?.value === item)
        );
    };

    let allTopic = topics ?? [];

    if (yearGroup) {
        if (typeof yearGroup === 'string') {
            allTopic = allTopic?.filter((topic) => {
                return topic.yearGroups.some((i) => i.year === yearGroup);
            });
        } else if (yearGroup?.length > 0) {
            allTopic = allTopic?.filter((topic) => topic.yearGroups.some((i) => yearGroup.includes(i.year)));
        }
    }

    if (topicDomain) {
        if (typeof topicDomain === 'string') {
            allTopic = allTopic?.filter((topic) => {
                return topic.domains.some((d) => d?.id === topicDomain);
            });
        } else {
            allTopic = allTopic?.filter((topic) => topic.domains.some((d) => d?.id === topicDomain));
        }
    }

    if (subjects) {
        if (typeof subjects === 'string') {
            allTopic = allTopic.filter((topic) => {
                return topic?.domains?.some((domain) => domain?.subject?.id === subjects);
            });
        } else if (subjects?.length > 0) {
            allTopic = allTopic.filter((topic) => {
                return topic.domains.some((domain) => subjects.map((subject) => subject).includes(domain.subject.id));
            });
        }
    }

    if (tags) {
        if (typeof tags === 'string') {
            allTopic = allTopic.filter((item) => {
                let filter = item.tags.some(({ name }) => name === tags);

                return filter;
            });
        } else if (tags?.length > 0) {
            const noTag = tags?.includes('(no tag)');
            const anyTag = tags?.includes('(any tag)');
            let filterNoTag = false;
            let filterAnyTag = false;

            allTopic = allTopic.filter((item) => {
                let filterTags = item.tags.some(({ name }) => (tags || []).indexOf(name) !== -1);

                if (noTag) {
                    filterNoTag = !item.tags?.length;
                }

                if (anyTag) {
                    filterAnyTag = !!item.tags?.length;
                }

                return filterTags || filterAnyTag || filterNoTag;
            });
        }
    }

    if (searchTopic) {
        allTopic = allTopic?.filter((topic) => topic?.teacherTopicName?.toLowerCase()?.includes(searchTopic.toLowerCase()));
    }

    if (topicStatus?.length > 0) {
        allTopic = allTopic?.filter((topic) => {
            return (
                (topicStatus.includes('Hidden') && topic?.isHidden === true) ||
                (topicStatus.includes('Limited release') && topic?.schoolTags?.length > 0 && !topic?.isHidden) ||
                (topicStatus.includes('Draft') && !topic?.isPublished && !topic?.isHidden) ||
                (topicStatus.includes('Available') && topic?.isPublished && !topic?.isHidden)
            );
        });
    }

    if (hideHiddenTopics === 'true') {
        allTopic = allTopic?.filter((topic) => topic?.isHidden === false);
    }

    const heading = ['Topic name', 'Parent topic', 'Topic status', 'Year group', 'Subjects', 'Topic domain', ''];

    const head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Topic name') {
            rowHead.Cell = (params) => {
                return (
                    <Link passHref href={`/admin/topic/${params?.row?.original?.id}`}>
                        <Paragraph customClass="arrow_cursor ul">{params?.row?.original?.col1}</Paragraph>
                    </Link>
                );
            };
        } else if (head === 'Topic status') {
            rowHead.accessor = `col3`;
            rowHead.Cell = (params) => {
                return (
                    <>
                        {params.row.original.col3?.isHidden ? (
                            <Paragraph text={'Hidden'} />
                        ) : params.row.original.col3?.schoolTags?.length > 0 ? (
                            <CommonPopOver text="Limited release" style={{ textDecoration: 'underline' }} hover>
                                <ShowSchoolTags tagId={params.row.original.col3?.id} />
                            </CommonPopOver>
                        ) : (
                            <Paragraph text={capitalizeFirstLetter(params.row.original.col3?.isPublished ? 'Available' : 'Draft')} />
                        )}
                    </>
                );
            };
        }

        return rowHead;
    });

    const Row = (allTopic || []).map((topic) => {
        return {
            id: topic?.id,
            col1: topic?.teacherTopicName,
            col2: topic?.parentTopicName?.length > 0 ? topic?.parentTopicName : '-',
            col3: topic,
            col4: topic?.yearGroups?.length > 0 ? topic?.yearGroups?.map((y) => y?.shortName).join(', ') : '-',
            col5: topic.domains
                .filter((domain) => !!domain.subject)
                .map((domain) => domain.subject.name)
                .join(', '),
            col6: topic?.domains?.map((d) => d?.title).join(', '),
            col7: (
                <Grid container alignItems={'center'}>
                    <Grid item xs={3} sm={3} md={3} lg={3}>
                        {topic?.video && (
                            <CopyToClipboard
                                text={topic?.video}
                                onCopy={() => {
                                    callSnackbar('Link copied!', 'success');
                                }}>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/video_link_icon.png`}
                                    alt="sampler"
                                />
                            </CopyToClipboard>
                        )}
                    </Grid>
                    <Grid item xs={2} sm={2} md={2} lg={2}>
                        <CommonPopOver icon={'tag'} hover>
                            <Stack direction="row" spacing={1}>
                                {!topic?.tags?.length && 'No tags'}
                                {topic?.tags?.map((tag) => (
                                    <CommonTag name={tag?.name} bgColor={tag?.color} />
                                ))}
                            </Stack>
                        </CommonPopOver>
                    </Grid>
                    <Grid item xs={2} sm={2} md={2} lg={2}>
                        <CommonIconButton onClick={() => _onClick(topic.id)} toolTipTitle={'Delete'} icon={'delete'} />
                    </Grid>
                </Grid>
            )
        };
    });

    return (
        <div className="schools_overview">
            <Formik
                enableReinitialize
                initialValues={{
                    subjects: subjects ? _getSubject(subjects) : [],
                    searchByName: searchTopic ?? null,
                    yearGroup: yearGroup ? _getYearGroup(yearGroup) : [],
                    topicDomain: topicDomain ? topicDomain : null,
                    hideHiddenTopics: hideHiddenTopics === 'true' ? true : false,
                    tags: tags ? _getTags(tags) : [],
                    topicStatus: topicStatus ? _getStatus(topicStatus) : []
                }}
                onSubmit={(values) => {
                    const { subjects, searchByName, yearGroup, topicDomain, hideHiddenTopics, tags, topicStatus } = values;

                    const subjectKey = subjects.map((t) => t.key);
                    const yearGroupKey = yearGroup.map((t) => t.key);
                    const topicTags = tags.map((t) => t.value);
                    const status = topicStatus.map((t) => t.value);

                    router?.push({
                        query: {
                            subjects: JSON.stringify(subjectKey),
                            yearGroup: JSON.stringify(yearGroupKey),
                            searchTopic: searchByName,
                            tags: JSON.stringify(topicTags),
                            topicStatus: JSON.stringify(status),
                            topicDomain,
                            hideHiddenTopics
                        }
                    });
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, resetForm }) => {
                    return (
                        <Grid spacing={3} container>
                            <InputField
                                name="searchByName"
                                value={values.searchByName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.searchByName}
                                touched={touched.searchByName}
                                label="Search topic"
                                type="text"
                                md={3}
                                lg={3}
                            />
                            <CommonMultiSelect
                                value={values.subjects}
                                options={(allSubjects?.getAllSubjects || []).map((subject) => ({ key: subject?.id, value: subject?.name }))}
                                label="Subjects"
                                name="subjects"
                                error={errors.subjects}
                                touched={touched.subjects}
                                md={3}
                                lg={3}
                                onChange={(value) =>
                                    handleChange({
                                        target: { name: 'subjects', value: value }
                                    })
                                }
                                onBlur={(value) =>
                                    handleBlur({
                                        target: { name: 'subjects', value: value }
                                    })
                                }
                            />
                            <CommonMultiSelect
                                value={values.yearGroup}
                                options={(yearGroups?.allYearGroup || []).map((yearGroup) => ({
                                    value: yearGroup.year,
                                    key: yearGroup.year
                                }))}
                                label="Year group"
                                name="yearGroup"
                                error={errors.yearGroup}
                                touched={touched.yearGroup}
                                md={3}
                                lg={3}
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
                            <CommonSelectField
                                value={values.topicDomain}
                                options={(topicDomains?.allTopicDomains || []).map((topicDomain) => ({
                                    value: topicDomain.title,
                                    key: topicDomain.id
                                }))}
                                label="Topic domain"
                                name="topicDomain"
                                error={errors.topicDomain}
                                touched={touched.topicDomain}
                                md={3}
                                lg={3}
                                onChange={handleChange}
                                onBlur={handleBlur}
                            />
                            <CommonMultiSelect
                                label="Availability"
                                options={topicStatusOptions}
                                value={values.topicStatus}
                                error={errors.topicStatus}
                                touched={touched.topicStatus}
                                name="topicStatus"
                                md={3}
                                lg={3}
                                onChange={(value) =>
                                    handleChange({
                                        target: { name: 'topicStatus', value: value }
                                    })
                                }
                                onBlur={(value) =>
                                    handleBlur({
                                        target: { name: 'topicStatus', value: value }
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
                                md={3}
                                lg={3}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                    ))
                                }
                            />
                            <Grid item>
                                <LWPButton
                                    size={'large'}
                                    variant="contained"
                                    color="inherit"
                                    onClick={() => _onReset(resetForm)}
                                    btnText={'Reset'}
                                />
                            </Grid>

                            <Grid item>
                                <LWPButton size={'large'} variant="contained" color="primary" onClick={handleSubmit} btnText={'Apply'} />
                            </Grid>
                        </Grid>
                    );
                }}
            </Formik>
            <CommonDraggableTable rows={Row} columns={head} />

            <ConfirmationModal
                open={openDeleteItemConfirmationModal?.open}
                onCancel={_onClose}
                onConfirm={() => {
                    deleteTopicMutation({
                        variables: { id: openDeleteItemConfirmationModal?.id }
                    })
                        .then(() => {
                            callSnackbar('Topic deleted successfully!', 'success');
                            _onClose();
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                            _onClose();
                        });
                }}
                loading={deleteTopicLoading}
                heading={'Delete Topic'}
                btnText={'Delete'}>
                Are you sure you want to delete this topic?
            </ConfirmationModal>
        </div>
    );
};

Topics.propTypes = {
    topics: PropTypes.array,
    topicQuery: PropTypes.func
};

export default Topics;
