import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Button, CardActions, CardContent, Collapse, Grid, Stack, Typography } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { deleteSchool } from '../../../graphQl/mutations';
import { getSchools, getSchoolsAwaitingWelcome, getSchoolTagsForAdmin, getUninvitedStaff } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonTag from '../../Shared/CommonTag';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonMultiSelect from './../../Shared/CommonMultiSelect';
import CommonTabs from './../../Shared/CommonTabs';
import AddSchoolModal from './../../Shared/Modals/AddSchool';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import SendInvitesModal from './../../Shared/Modals/SendInvites';
import SendWelcomeEmailsModal from './../../Shared/Modals/SendWelcomeEmailsModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';
import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';

const SchoolsAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);
    const [openDeleteSchool, setOpenDeleteSchool] = useState(false);
    const [schoolToBeDeletedId, setSchoolToBeDeletedId] = useState(null);
    const [openSendInvites, setOpenSendInvites] = useState(false);
    const [openSendWelcomeEmails, setOpenSendWelcomeEmails] = useState(false);
    const { setClaims } = useDelegatedClaims();

    const searchParams = useSearchParams();
    const router = useRouter();

    const tags = searchParams.get('tags') ? JSON.parse(searchParams.get('tags')) : null;

    const tabRoutes = ['active', 'inactive', 'test'];
    const tebs = ['Active', 'Inactive', 'Test'];

    const [active, setActive] = useState(tabRoutes.indexOf(router?.query?.type));

    useEffect(() => {
        setActive(tabRoutes.indexOf(router?.query?.type));
    }, [router?.query?.type]);

    const [getSchoolsQuery, { loading, error, data: allSchools }] = useLazyQuery(getSchools, { fetchPolicy: 'network-only' });

    const [getUninvitedStaffQuery, { data: uninvitedStaffData, loading: uninvitedStaffLoading }] = useLazyQuery(getUninvitedStaff, {
        fetchPolicy: 'network-only'
    });

    const [getSchoolsAwaitingWelcomeQuery, { data: schoolsAwaitingWelcomeData, loading: schoolsAwaitingWelcomeLoading }] = useLazyQuery(
        getSchoolsAwaitingWelcome,
        { fetchPolicy: 'network-only' }
    );

    const { data: allTags } = useQuery(getSchoolTagsForAdmin, {
        variables: { filter: 'ITEMS' }
    });

    const [deleteSchoolMutation, { loading: deleteSchoolLoading }] = useMutation(deleteSchool, {
        refetchQueries: [
            {
                query: getSchools,
                variables: {
                    filter: {
                        inactive: active === 1 ? true : false,
                        isTestSchool: active === 2 ? true : false,
                        needImpactReportGenerating: searchParams.get('needImpactReportGenerating') === 'true'
                    }
                }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (searchParams.get('tab') === '1') setActive(1);
        if (searchParams.get('tab') === '2') setActive(2);
        if (searchParams.get('IsOpen')) {
            setOpenFilter(true);
        }
    }, [searchParams]);

    useEffect(() => {
        getSchoolsQuery({
            variables: {
                filter: {
                    inactive: active === 1 ? true : false,
                    isTestSchool: active === 2 ? true : false,
                    needImpactReportGenerating: searchParams.get('needImpactReportGenerating') === 'true'
                }
            }
        });
    }, [active, searchParams.get('filter'), searchParams.get('needImpactReportGenerating')]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const addSchoolListItem = [
        {
            text: 'Add a school',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpen(!open),
            dataTest: 'add-school-button'
        }
    ];

    const tagsForAdmin =
        allTags?.getSchoolTagsForAdmin?.length > 0
            ? [
                  { name: '(no tag)', id: `noTag`, color: '#F5F5F5' },
                  { name: '(any tag)', id: `anyTag`, color: '#F5F5F5' },
                  ...allTags.getSchoolTagsForAdmin
              ]
            : [
                  { name: '(no tag)', id: `noTag`, color: '#F5F5F5' },
                  { name: '(any tag)', id: `anyTag`, color: '#F5F5F5' }
              ];

    const _onClick = (id) => {
        setOpenDeleteSchool(true);
        setSchoolToBeDeletedId(id);
    };

    const _getTags = (tags) => {
        if (typeof tags === 'string') {
            return (tagsForAdmin?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.filter((i) => i?.value === tags);
        }

        return tags?.map((tags) => (tagsForAdmin?.map((t) => ({ key: t.id, value: t.name, ...t })) || [])?.find((i) => i?.value === tags));
    };

    const header = React.useMemo(
        () => [
            {
                Header: 'School Name',
                accessor: '',
                Cell: (params) => {
                    return (
                        <Link passHref href={`/admin/school/${params?.row?.original?.id}`}>
                            <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                        </Link>
                    );
                }
            },

            {
                Header: '# of Comments & Photos',
                accessor: 'col2'
            },

            {
                Header: 'URN',
                accessor: 'col3'
            },
            {
                Header: 'Academic Year',
                accessor: 'col4'
            },
            {
                Header: '',
                accessor: 'col5'
            }
        ],
        []
    );

    // Tag-filtered source list, kept separate from the mapped rows so the Send-invites scope below can be
    // derived from exactly what the admin sees (not the full unfiltered tab).
    let filteredSchools = allSchools?.getSchoolsForSchoolOverview || [];

    if (tags) {
        if (typeof tags === 'string') {
            filteredSchools = filteredSchools.filter((item) => {
                let filter = item.tags.some(({ name }) => name === tags);

                return filter;
            });
        } else if (tags?.length > 0) {
            const noTag = tags?.includes('(no tag)');
            const anyTag = tags?.includes('(any tag)');
            let filterNoTag = false;
            let filterAnyTag = false;

            filteredSchools = filteredSchools.filter((item) => {
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

    const schoolRow = (filteredSchools || []).map((school) => {
        return {
            id: school?.id,
            col1: (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    <a
                        data-testid="school-details-link"
                        href={`/admin/school/${school.id}`}
                        onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                window.open(`/admin/school/${school.id}`, '_blank');
                            }
                        }}>
                        {school?.schoolName}
                    </a>
                    {school?.hasUninvitedStaff && (
                        <CommonTooltipIcon
                            icon="error_outline"
                            customIconClass="uninvited-staff-icon"
                            text="This school has staff who haven't been invited yet."
                            dataTest={`school-uninvited-icon-${school?.id}`}
                        />
                    )}
                </span>
            ),
            col2: school?.commentsAndPhotos,
            col3: school?.urn ? school?.urn : '-',
            col4: school?.curentPeriod?.longName ?? '-',
            col5: (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    <CommonPopOver icon={'tag'} hover>
                        <Stack direction="row" spacing={1}>
                            {!school?.tags?.length && 'No tags'}
                            {school?.tags?.map((tag) => (
                                <CommonTag name={tag?.name} bgColor={tag?.color} />
                            ))}
                        </Stack>
                    </CommonPopOver>
                    <CommonIconButton
                        toolTipTitle="Teacher view"
                        onClick={() => {
                            setClaims({
                                schoolId: school?.id
                            });
                            router?.push(`/school/${school?.id}`);
                        }}
                        icon="visibility"
                    />
                    <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(school.id)} icon={'delete'} />
                </span>
            )
        };
    });

    // Schools currently displayed (tab + any active tag filter) that have uninvited staff; their ids scope the
    // Send-invites query so it only touches the schools the admin can actually see.
    const uninvitedSchoolIds = filteredSchools.filter((school) => school?.hasUninvitedStaff).map((school) => school?.id);

    // Same scoping for the welcome emails: the visible schools that still have an active school leader who has
    // never been sent one.
    const awaitingWelcomeSchoolIds = filteredSchools
        .filter((school) => school?.hasSchoolLeadersAwaitingWelcome)
        .map((school) => school?.id);

    // Both sends are offered on the Active (0) and Test (2) tabs, not Inactive (1).
    const isSendTab = active === 0 || active === 2;
    const canSendInvites = isSendTab && uninvitedSchoolIds.length > 0;
    const canSendWelcomeEmails = isSendTab && awaitingWelcomeSchoolIds.length > 0;

    const onSendInvitesClick = () => {
        getUninvitedStaffQuery({ variables: { schoolIds: uninvitedSchoolIds } });
        setOpenSendInvites(true);
    };

    const onSendWelcomeEmailsClick = () => {
        getSchoolsAwaitingWelcomeQuery({ variables: { schoolIds: awaitingWelcomeSchoolIds } });
        setOpenSendWelcomeEmails(true);
    };

    const refetchSchools = () => {
        getSchoolsQuery({
            variables: {
                filter: {
                    inactive: active === 1,
                    isTestSchool: active === 2,
                    needImpactReportGenerating: searchParams.get('needImpactReportGenerating') === 'true'
                }
            }
        });
    };

    return (
        <div className="schools_overview" data-test={'schools-page'}>
            <div className="header">
                <Heading2 text="Schools" />
                <CommonListWithIcon list={addSchoolListItem} />
            </div>

            <CommonTabs
                tebs={tebs}
                value={active}
                onChange={(e) => {
                    const newUrl = `/admin/schools/${tabRoutes[e]}`;

                    router.push(newUrl, undefined, { scroll: false });
                }}>
                <div className="school-filter-button">
                    {canSendInvites && (
                        <LWPButton
                            btnText="Send invites"
                            endIcon="mail"
                            onClick={onSendInvitesClick}
                            dataTest="schools-send-invites-button"
                        />
                    )}
                    {canSendWelcomeEmails && (
                        <LWPButton
                            btnText="Send welcome emails"
                            endIcon="mail"
                            onClick={onSendWelcomeEmailsClick}
                            dataTest="schools-send-welcome-emails-button"
                        />
                    )}
                    <Button className="filter-button" onClick={() => setOpenFilter(!openFilter)}>
                        Filter
                        <Typography>
                            <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                                {openFilter ? 'expand_less' : 'expand_more'}
                            </span>
                        </Typography>
                    </Button>
                </div>
                <Collapse className="school-collapse" in={openFilter}>
                    <Formik
                        enableReinitialize
                        initialValues={{
                            tags: tags ? _getTags(tags) : [],
                            needImpactReportGenerating: searchParams.get('needImpactReportGenerating') === 'true'
                        }}
                        onSubmit={(values) => {
                            const { tags, needImpactReportGenerating } = values;

                            const topicTags = tags.map((t) => t.value);

                            router?.push({
                                query: {
                                    tab: active,
                                    IsOpen: true,
                                    needImpactReportGenerating,
                                    type: router?.query?.type,
                                    tags: JSON.stringify(topicTags)
                                }
                            });
                        }}>
                        {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                            return (
                                <CommonCard className={`feeds-filter-container`}>
                                    <CardContent>
                                        <Grid container>
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
                                                md={12}
                                                lg={12}
                                                renderTags={(value, getTagProps) =>
                                                    value.map((option, index) => (
                                                        <CommonTag
                                                            name={option?.value}
                                                            bgColor={option?.color}
                                                            {...getTagProps({ index })}
                                                        />
                                                    ))
                                                }
                                            />

                                            <CommonCheckBox
                                                name="needImpactReportGenerating"
                                                checked={values.needImpactReportGenerating}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                label="Needs impact report for current term"
                                                error={errors.needImpactReportGenerating}
                                                touched={touched.needImpactReportGenerating}
                                            />
                                        </Grid>
                                        <CardActions>
                                            <LWPButton
                                                size={'large'}
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSubmit}
                                                btnText={'Apply'}
                                            />
                                        </CardActions>
                                    </CardContent>
                                </CommonCard>
                            );
                        }}
                    </Formik>
                </Collapse>
                <CommonDraggableTable columns={header} rows={schoolRow} loading={loading} dataTest={'schools-table'} />
            </CommonTabs>
            {open ? <AddSchoolModal open={open} setOpen={setOpen} /> : null}
            {openSendInvites && (
                <SendInvitesModal
                    open={openSendInvites}
                    setOpen={setOpenSendInvites}
                    invitees={uninvitedStaffData?.getUninvitedStaff || []}
                    loading={uninvitedStaffLoading}
                    showSchool
                    subtitle="Everyone ticked below will be sent an invite for their school. Anyone marked as do not invite starts unticked."
                    onSent={refetchSchools}
                />
            )}

            {openSendWelcomeEmails && (
                <SendWelcomeEmailsModal
                    open={openSendWelcomeEmails}
                    setOpen={setOpenSendWelcomeEmails}
                    schools={schoolsAwaitingWelcomeData?.getSchoolsAwaitingWelcome || []}
                    loading={schoolsAwaitingWelcomeLoading}
                    onSent={refetchSchools}
                />
            )}
            {openDeleteSchool && (
                <ConfirmationModal
                    open={openDeleteSchool}
                    onCancel={() => setOpenDeleteSchool(!openDeleteSchool)}
                    loading={deleteSchoolLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteSchoolMutation({
                            variables: {
                                id: schoolToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteSchool(!openDeleteSchool);
                                setSchoolToBeDeletedId(null);
                                callSnackbar('School deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteSchool(!openDeleteSchool);
                                setSchoolToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the school." />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default SchoolsAdmin;
