import { gql, useMutation, useQuery } from '@apollo/client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { getTopicActivitiesForAdmin } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Paragraph from '../../Shared/Typography/Paragraph';
import AddActivityModal from './../../Shared/Modals/AddActivity';

const deleteActivity = gql`
    mutation deleteActivity($id: String!) {
        deleteActivity(id: $id) {
            status
            msg
        }
    }
`;

const Activities = ({ open, setOpen, setClassName, topic_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const searchParams = useSearchParams();

    const IsOpen = searchParams.get('IsOpen');

    const [isOpen, setIsOpen] = useState(false);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState({ open: false, id: null });

    const { loading, error: error, data: topicActivities } = useQuery(getTopicActivitiesForAdmin, { variables: { id: topic_id } });

    const [deleteActivityMutation, { loading: deleteActivityLoading }] = useMutation(deleteActivity, {
        refetchQueries: [
            {
                query: getTopicActivitiesForAdmin,
                variables: {
                    id: topic_id
                }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (IsOpen) {
            setIsOpen(IsOpen === 'true');
        }
    }, [searchParams]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        topicActivities && setClassName({ name: topicActivities?.getTopicWithActivitiesForAdmin.teacherTopicName });
    }, [topicActivities]);

    const _onClick = (id) => {
        setOpenDeleteItemConfirmationModal({ open: true, id: id });
    };

    const _onClose = () => {
        setOpenDeleteItemConfirmationModal({ open: false, id: null });
    };

    const head = [
        {
            accessor: 'col1',
            Header: 'Name',
            Cell: (params) => (
                <Link passHref href={`/admin/activity/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                </Link>
            )
        },
        { accessor: 'col2', Header: 'Type' },
        { accessor: 'col3', Header: 'Order' },
        { accessor: 'col4', Header: 'Hidden Status' },
        { accessor: 'col5', Header: '' }
    ];

    const row = (topicActivities?.getTopicWithActivitiesForAdmin?.activities || []).map((activity) => {
        return {
            id: activity.id,
            col1: activity?.name,
            col2: activity?.activityType,
            col3: activity?.order ?? '-',
            col4: activity?.isHidden ? 'Hidden' : 'Not Hidden',
            col5: <CommonIconButton onClick={() => _onClick(activity.id)} toolTipTitle={'Delete'} icon={'delete'} />
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="classes_overview">
            <div className="class-filter-button">
                <LWPButton
                    color="inherit"
                    btnText="Filter"
                    onClick={() => setIsOpen(!isOpen)}
                    endIcon={isOpen ? 'expand_less' : 'expand_more'}
                />
            </div>
            <CommonDraggableTable rows={row} columns={head} customClass="row-height" />
            {open && <AddActivityModal open={open} setOpen={setOpen} primaryText={'Add activity'} topic_id={topic_id} />}

            <ConfirmationModal
                open={openDeleteItemConfirmationModal?.open}
                onCancel={_onClose}
                onConfirm={() => {
                    deleteActivityMutation({
                        variables: { id: openDeleteItemConfirmationModal?.id }
                    })
                        .then(() => {
                            callSnackbar('Activity deleted successfully!', 'success');
                            _onClose();
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                            _onClose();
                        });
                }}
                loading={deleteActivityLoading}
                heading={'Delete Activity'}
                btnText={'Delete'}>
                Are you sure you want to delete this activity?
            </ConfirmationModal>
        </div>
    );
};

Activities.propTypes = { setOpen: PropTypes.func, open: PropTypes.bool, setClassName: PropTypes.func, topic_id: PropTypes.string };

export default Activities;
