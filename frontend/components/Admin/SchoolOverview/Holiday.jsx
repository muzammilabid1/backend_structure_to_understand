import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteSchoolHoliday } from '../../../graphQl/mutations';
import { allSchoolHolidaysOfSchoolForAdmin } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import AddHolidayModal from '../../Shared/Modals/AddHoliday';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Paragraph from '../../Shared/Typography/Paragraph';

const Holiday = ({ schoolHolidayPeriod }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const [open, setOpen] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);
    const [willUpdateValues, setWillUpdateValues] = useState(null);
    const [openDeleteHoliday, setOpenDeleteHoliday] = useState(false);
    const [holidayToBeDeletedId, setHolidayToBeDeletedId] = useState(null);

    const [getHolidaysQuery, { loading: holidayLoading, error, data: holidayData }] = useLazyQuery(allSchoolHolidaysOfSchoolForAdmin, {
        fetchPolicy: 'network-only',
        notifyOnNetworkStatusChange: true
    });

    const [deleteHolidayMutation, { loading: deleteHolidayLoading }] = useMutation(deleteSchoolHoliday, {
        refetchQueries: [
            {
                query: allSchoolHolidaysOfSchoolForAdmin,
                variables: {
                    schoolId: queryParams?.school_id
                }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        getHolidaysQuery({
            variables: {
                schoolId: queryParams?.school_id
            }
        });
    }, []);

    const _onEdit = (id) => {
        setWillUpdateValues(holidayData?.allSchoolHolidaysOfSchoolForAdmin.find((holiday) => holiday.id === id));
        setOpen(true);
    };

    const _onClick = (id) => {
        setOpenDeleteHoliday(true);
        setHolidayToBeDeletedId(id);
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

    const columns = [
        {
            accessor: 'col1',
            Header: 'Holiday name'
        },
        {
            accessor: 'col2',
            Header: 'Start date',
            Cell: ({ value }) => showDate({ date: value, time: true }),
            sortType: (a, b) => sortingDate(a.original?.col2, b.original?.col2)
        },
        {
            accessor: 'col3',
            Header: 'End date',
            Cell: ({ value }) => showDate({ date: value, time: true }),
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

    const Row = (holidayData?.allSchoolHolidaysOfSchoolForAdmin || []).map((holiday) => {
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
                </>
            )
        };
    });

    if (holidayLoading) return <CommonLoading />;

    return (
        <div className="terms_holiday_overview">
            <div className="btn_group">
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
            </div>

            <CommonDraggableTable rows={Row} columns={columns} />
            {open && (
                <AddHolidayModal
                    open={open}
                    setOpen={() => setOpen(false)}
                    updateValues={willUpdateValues}
                    isAdminSchool
                    currentPeriod={schoolHolidayPeriod}
                />
            )}
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
        </div>
    );
};

Holiday.propTypes = {
    schoolHolidayPeriod: PropTypes.number
};

export default Holiday;
