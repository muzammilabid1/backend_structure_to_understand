/* eslint-disable @next/next/no-img-element */
import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Chip, Typography } from '@mui/material';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteSchoolClass } from '../../../graphQl/mutations';
import { getSchoolClassesForClassOverview } from '../../../graphQl/queries';
import { adminPath, SchoolClassStatus } from '../../../shared/Constant';
import { renderClassIcon, ThemeContext } from '../../../shared/Services/handler';
import CommonPopOver from '../../Shared/CommonPopOver';
import Heading3 from '../../Shared/Typography/Heading3';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import AddClassModal from './../../Shared/Modals/AddClass';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import SubjectTags from './../../Shared/SubjectTags';
import Paragraph from './../../Shared/Typography/Paragraph';

const ClassesOverview = ({ schoolId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const [openFilter, setOpenFilter] = useState(false);
    const [openDeleteSchoolClass, setOpenDeleteSchoolClass] = useState(false);
    const [schoolClassToBeDeletedId, setSchoolClassToBeDeletedId] = useState(null);

    const [getSchoolClassesQuery, { loading, error, data: allSchoolClasses }] = useLazyQuery(getSchoolClassesForClassOverview, {
        fetchPolicy: 'network-only'
    });

    const [getClassesGroupsQuery, { loading: allClassesGroupsLoading, error: allClassesGroupsError, data: allClassesGroups }] =
        useLazyQuery(getSchoolClassesForClassOverview, {
            fetchPolicy: 'network-only'
        });

    const [deleteSchoolClassMutation, { loading: deleteSchoolClassLoading }] = useMutation(deleteSchoolClass, {
        refetchQueries: [
            {
                query: getSchoolClassesForClassOverview,
                variables: { schoolId }
            },
            {
                query: getSchoolClassesForClassOverview,
                variables: { schoolId }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (schoolId) {
            getSchoolClassesQuery({
                variables: { schoolId }
            });

            getClassesGroupsQuery({
                variables: { schoolId, getGroups: true }
            });
        }
    }, [schoolId]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);
    useEffect(() => {
        allClassesGroupsError?.message && callSnackbar(allClassesGroupsError, 'error');
    }, [allClassesGroupsError]);

    const _onClick = (id) => {
        setOpenDeleteSchoolClass(true);
        setSchoolClassToBeDeletedId(id);
    };

    const addNewsListItem = [
        {
            text: 'Create a class',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => router?.push({ pathname: `/admin/school/${schoolId}/add-class`, query: { adminView: true } }),
            dataTest: 'create-class-button'
        }
    ];

    const head = [
        {
            Header: 'Class name',
            accessor: 'col1',
            Cell: (params) => {
                return (
                    <Link passHref href={`${adminPath}/class/${params?.row?.original?.id}`}>
                        <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                    </Link>
                );
            },
            width: '300'
        },
        {
            Header: 'Year group',
            accessor: 'col3'
        },
        {
            Header: 'Status',
            accessor: 'col4'
        },
        {
            Header: 'Main teacher',
            accessor: 'col5'
        },
        {
            Header: 'Period',
            accessor: 'col6'
        },
        {
            Header: '',
            accessor: 'col7'
        }
    ];

    const row = (allSchoolClasses?.getSchoolClassesForClassOverview || []).map((_class) => {
        const classesOverviewActions = [
            {
                name: 'Activity grid',
                icon: 'list_alt',
                onClick: () => {
                    router?.push(`/class/${_class.id}/activity-grid`);
                }
            },
            {
                name: 'Schedule',
                icon: 'date_range',
                onClick: () => {
                    router?.push(`/class/${_class.id}/schedule`);
                }
            },
            ...(_class?.isFullProgramme && !_class?.IsReadingLogsEnabled
                ? [
                      {
                          name: 'Pupils',
                          icon: 'child_care',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/pupils`);
                          }
                      }
                  ]
                : []),
            ...(!_class?.isFullProgramme && _class?.IsReadingLogsEnabled
                ? [
                      {
                          name: 'Reading',
                          icon: 'book',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/reading`);
                          }
                      }
                  ]
                : []),
            ...(_class?.isFullProgramme && _class?.IsReadingLogsEnabled
                ? [
                      {
                          name: 'Pupils',
                          icon: 'child_care',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/pupils`);
                          }
                      },
                      {
                          name: 'Reading',
                          icon: 'book',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/reading`);
                          }
                      }
                  ]
                : []),
            {
                name: 'Delete',
                icon: 'delete',
                onClick: () => {
                    _onClick(_class.id);
                }
            }
        ];
        const { classIcon, isFullProgramOrOnlyReadyTeddy } = renderClassIcon(_class);

        return {
            id: _class.id,
            col1: (
                <>
                    {_class?.status === SchoolClassStatus.ACTIVE ? (
                        <div className="programme-info-alert-container">
                            <div
                                className={
                                    isFullProgramOrOnlyReadyTeddy ? 'programme-info-image-fullProgramme' : 'programme-info-image-reading'
                                }>
                                <img src={classIcon} alt="logo" />
                            </div>
                            <Paragraph text={_class?.schoolClassName} isTruncate />
                        </div>
                    ) : (
                        <Paragraph text={_class?.schoolClassName} isTruncate />
                    )}
                </>
            ),
            col3: _class?.yearGroup?.year,
            col4: _class?.status,
            col5:
                _class?.mainTeacher?.firstname && _class?.mainTeacher?.lastname
                    ? `${_class?.mainTeacher?.firstname} ${_class?.mainTeacher?.lastname}`
                    : '-',
            col6: _class?.period?.longName ?? '-',
            col7: (
                <CommonPopOver bold icon="more_horiz">
                    {classesOverviewActions.map((item) => (
                        <div className="schedule-table-actions-container" key={item.name} onClick={item.onClick}>
                            <span className="material-icons">{item.icon}</span>
                            <span>{item.name}</span>
                        </div>
                    ))}
                </CommonPopOver>
            )
        };
    });

    const head2 = [
        {
            Header: 'Group name',
            accessor: 'col1',
            Cell: (params) => {
                return (
                    <Link passHref href={`${adminPath}/class/${params?.row?.original?.id}`}>
                        <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                    </Link>
                );
            },
            width: '300'
        },
        {
            Header: 'Main class',
            accessor: 'col2'
        },
        {
            Header: 'Main teacher',
            accessor: 'col3'
        },
        {
            Header: 'Group type',
            accessor: 'col4'
        },
        {
            Header: '',
            accessor: 'col5'
        }
    ];

    const row2 = (allClassesGroups?.getSchoolClassesForClassOverview || []).map((_class) => {
        const classesOverviewActions = [
            {
                name: 'Activity grid',
                icon: 'list_alt',
                onClick: () => {
                    router?.push(`/class/${_class.id}/activity-grid`);
                }
            },
            {
                name: 'Schedule',
                icon: 'date_range',
                onClick: () => {
                    router?.push(`/class/${_class.id}/schedule`);
                }
            },
            ...(_class?.isFullProgramme && !_class?.IsReadingLogsEnabled
                ? [
                      {
                          name: 'Pupils',
                          icon: 'child_care',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/pupils`);
                          }
                      }
                  ]
                : []),
            ...(!_class?.isFullProgramme && _class?.IsReadingLogsEnabled
                ? [
                      {
                          name: 'Reading',
                          icon: 'book',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/reading`);
                          }
                      }
                  ]
                : []),
            ...(_class?.isFullProgramme && _class?.IsReadingLogsEnabled
                ? [
                      {
                          name: 'Pupils',
                          icon: 'child_care',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/pupils`);
                          }
                      },
                      {
                          name: 'Reading',
                          icon: 'book',
                          onClick: () => {
                              router?.push(`/class/${_class.id}/reading`);
                          }
                      }
                  ]
                : []),
            {
                name: 'Delete',
                icon: 'delete',
                onClick: () => {
                    _onClick(_class.id);
                }
            }
        ];

        const { classIcon, isFullProgramOrOnlyReadyTeddy } = renderClassIcon(_class);

        return {
            id: _class.id,
            col1: (
                <>
                    {_class?.status === SchoolClassStatus.ACTIVE && _class?.isRegistrationClass ? (
                        <div className="programme-info-alert-container">
                            <div
                                className={
                                    isFullProgramOrOnlyReadyTeddy ? 'programme-info-image-fullProgramme' : 'programme-info-image-reading'
                                }>
                                <img src={classIcon} alt="logo" />
                            </div>
                            <Paragraph text={_class?.schoolClassName} isTruncate />
                        </div>
                    ) : (
                        <Paragraph text={_class?.schoolClassName} isTruncate />
                    )}
                </>
            ),
            col2: _class?.parentClass?.schoolClassName ?? '-',
            col3:
                _class?.mainTeacher?.firstname && _class?.mainTeacher?.lastname
                    ? `${_class?.mainTeacher?.firstname} ${_class?.mainTeacher?.lastname}`
                    : '-',
            col4: <SubjectTags type={_class?.subjects} isReadingClass={_class?.IsReadingLogsEnabled} />,

            col5: (
                <CommonPopOver bold icon="more_horiz">
                    {classesOverviewActions.map((item) => (
                        <div className="schedule-table-actions-container" key={item.name} onClick={item.onClick}>
                            <span className="material-icons">{item.icon}</span>
                            <span>{item.name}</span>
                        </div>
                    ))}
                </CommonPopOver>
            )
        };
    });

    if (loading || allClassesGroupsLoading) return <CommonLoading />;

    return (
        <div className="classes_overview">
            <div className="classes_overview_heading">
                <Heading3 text={'Classes'} />
                <Chip label={allSchoolClasses?.getSchoolClassesForClassOverview?.length} size="small" className="Chip_Chip" />
            </div>
            <div className="btn_group">
                <CommonListWithIcon list={addNewsListItem} />
                <div className="school-class-filter-button no_margin">
                    <Button className="filter-button" onClick={() => setOpenFilter(!openFilter)}>
                        Filter
                        <Typography>
                            <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                                {openFilter ? 'expand_less' : 'expand_more'}
                            </span>
                        </Typography>
                    </Button>
                </div>
            </div>

            <CommonDraggableTable rows={row} columns={head} dataTest={'school-class-table'} />

            <div className="classes_overview_heading">
                <Heading3 text={'Class groups'} />
                <Chip label={allClassesGroups?.getSchoolClassesForClassOverview?.length} size="small" className="Chip_Chip" />
            </div>

            <CommonDraggableTable rows={row2} columns={head2} dataTest={'classes-overview-table'} />

            {open && <AddClassModal open={open} setOpen={() => setOpen(!open)} schoolId={schoolId} />}
            {openDeleteSchoolClass && (
                <ConfirmationModal
                    open={openDeleteSchoolClass}
                    onCancel={() => setOpenDeleteSchoolClass(!openDeleteSchoolClass)}
                    loading={deleteSchoolClassLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteSchoolClassMutation({
                            variables: {
                                id: schoolClassToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteSchoolClass(!openDeleteSchoolClass);
                                setSchoolClassToBeDeletedId(null);
                                callSnackbar('Class deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteSchoolClass(!openDeleteSchoolClass);
                                setSchoolClassToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the school class." />
                </ConfirmationModal>
            )}
        </div>
    );
};

ClassesOverview.propTypes = { schoolId: PropTypes.string };

export default ClassesOverview;
