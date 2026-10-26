import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { deleteSchoolHoliday, releaseHolidayToAllSchools } from '../../../graphQl/mutations';
import { getHolidaysForAdmin } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import AddHolidayModal from '../../Shared/Modals/AddHoliday';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Paragraph from '../../Shared/Typography/Paragraph';

const HolidayOverviewAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);
    const [willUpdateValues, setWillUpdateValues] = useState(null);
    const [openDeleteHoliday, setOpenDeleteHoliday] = useState(false);
    const [openReleaseHoliday, setOpenReleaseHoliday] = useState(false);
    const [holidayToBeDeletedId, setHolidayToBeDeletedId] = useState(null);
    const [holidayToBeReleasedId, setHolidayToBeReleasedId] = useState(null);

    const [getHolidaysQuery, { loading: holidayLoading, error, data: holidayData }] = useLazyQuery(getHolidaysForAdmin, {
        fetchPolicy: 'network-only'
    });

    const [deleteHolidayMutation, { loading: deleteHolidayLoading }] = useMutation(deleteSchoolHoliday, {
        refetchQueries: [
            {
                query: getHolidaysForAdmin
            }
        ],
        awaitRefetchQueries: true
    });

    const [releaseHolidayMutation, { loading: releaseHolidayLoading }] = useMutation(releaseHolidayToAllSchools, {
        refetchQueries: [{ query: getHolidaysForAdmin }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        getHolidaysQuery();
        if (searchParams.get('IsOpen')) {
            setOpenFilter(true);
        }
    }, [searchParams]);

    const _onEdit = (id) => {
        setWillUpdateValues(holidayData?.getHolidaysForAdmin.find((holiday) => holiday.id === id));
        setOpen(true);
    };

    const _onClick = (id) => {
        setOpenDeleteHoliday(true);
        setHolidayToBeDeletedId(id);
    };

    const _onHolidayRelease = (id) => {
        setHolidayToBeReleasedId(holidayData?.getHolidaysForAdmin.find((holiday) => holiday.id === id));
        setOpenReleaseHoliday(true);
    };

    const addNewsListItem = [
        {
            text: 'Add a Holiday',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => {
                setWillUpdateValues(null);
                setOpen(!open);
            }
        }
    ];

    const head = [
        {
            accessor: 'col1',
            Header: 'Holiday name'
        },
        {
            accessor: 'col2',
            Header: 'Start date',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col2, b.original?.col2)
        },
        {
            accessor: 'col3',
            Header: 'End date',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        },
        {
            accessor: 'col4',
            Header: 'Academic year'
        },
        {
            accessor: 'col5',
            Header: 'Released'
        },
        {
            accessor: 'col6',
            Header: ''
        }
    ];

    const Row = (holidayData?.getHolidaysForAdmin || []).map((holiday) => {
        return {
            id: holiday?.id,
            col1: holiday?.holidayName,
            col2: holiday?.startDate,
            col3: holiday?.endDate,
            col4: holiday?.period?.shortName,
            col5: holiday?.released ? 'True' : 'False',
            col6: (
                <>
                    <CommonIconButton onClick={() => _onEdit(holiday.id)} icon="create" toolTipTitle="Update" />
                    <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(holiday?.id)} icon={'delete'} />
                    {!holiday?.released && (
                        <CommonIconButton onClick={() => _onHolidayRelease(holiday.id)} icon="upload" toolTipTitle="Release" />
                    )}
                </>
            )
        };
    });

    if (holidayLoading) return <CommonLoading />;

    return (
        <div className="terms_holiday_overview">
            <div className="header">
                <CommonListWithIcon list={addNewsListItem} />
            </div>
            <div className="terms_holiday_filter_button">
                <Button className="filter-button" onClick={() => setOpenFilter(!openFilter)}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {openFilter ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>
            <CommonDraggableTable rows={Row} columns={head} />
            {open && <AddHolidayModal open={open} setOpen={() => setOpen(false)} updateValues={willUpdateValues} isAdmin />}
            {openDeleteHoliday && (
                <ConfirmationModal
                    open={openDeleteHoliday}
                    onCancel={() => setOpenDeleteHoliday(!openDeleteHoliday)}
                    loading={deleteHolidayLoading}
                    heading="Are you sure?"
                    btnText="Delete"
                    onConfirm={() => {
                        deleteHolidayMutation({
                            variables: {
                                id: holidayToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteHoliday(!openDeleteHoliday);
                                setHolidayToBeDeletedId(null);
                                callSnackbar('Holiday deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteHoliday(!openDeleteHoliday);
                                setHolidayToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the holiday." />
                </ConfirmationModal>
            )}
            {openReleaseHoliday && (
                <ConfirmationModal
                    open={openReleaseHoliday}
                    onCancel={() => setOpenReleaseHoliday(!openReleaseHoliday)}
                    loading={releaseHolidayLoading}
                    heading="Are you sure?"
                    btnText="Release"
                    onConfirm={() => {
                        releaseHolidayMutation({
                            variables: {
                                id: holidayToBeReleasedId?.id
                            }
                        })
                            .then(() => {
                                setOpenReleaseHoliday(!openReleaseHoliday);
                                setHolidayToBeReleasedId(null);
                                callSnackbar('Holiday released!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenReleaseHoliday(!openReleaseHoliday);
                                setHolidayToBeReleasedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="Are you sure? This will release this holiday to all the schools." />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default HolidayOverviewAdmin;
