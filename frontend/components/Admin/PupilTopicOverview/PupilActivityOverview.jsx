import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deletePupilActivity } from '../../../graphQl/mutations';
import { getPupilActivitiesOfPupilTopic } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';

const PupilActivityOverview = ({ pupiltopic_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [openDeletePupilActivity, setOpenDeletePupilActivity] = useState(false);
    const [pupilActivityToBeDeletedId, setPupilActivityToBeDeletedId] = useState(null);

    const [pupilActivitiesQuery, { loading, error, data: pupilActivitiesData }] = useLazyQuery(getPupilActivitiesOfPupilTopic, {
        fetchPolicy: 'network-only'
    });

    const [deletePupilActivityMutation, { loading: deletePupilActivityLoading }] = useMutation(deletePupilActivity, {
        refetchQueries: [
            {
                query: getPupilActivitiesOfPupilTopic,
                variables: { pupilTopicId: pupiltopic_id }
            }
        ],
        awaitRefetchQueries: true
    });

    const _onClick = (id) => {
        setOpenDeletePupilActivity(true);
        setPupilActivityToBeDeletedId(id);
    };

    useEffect(() => {
        pupiltopic_id &&
            pupilActivitiesQuery({
                variables: { pupilTopicId: pupiltopic_id }
            });
    }, []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const head = [
        {
            accessor: 'col1',
            Header: 'Star Earned?',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/pupilactivity/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            )
        },
        { accessor: 'col2', Header: 'Rating' },
        {
            accessor: 'col3',
            Header: ''
        }
    ];

    const row = (pupilActivitiesData?.getPupilActivitiesOfPupilTopic || []).map((pupilActivity) => {
        return {
            id: pupilActivity.id,
            col1: pupilActivity?.earnedStar ? 'Earned' : 'Not Earned Yet',
            col2: pupilActivity?.rating ?? '-',
            col3: <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(pupilActivity.id)} icon={'delete'} />
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="class-topic-overview">
            <div className="class-topic-filter-button">
                <Button className="filter-button" onClick={() => setIsOpen(!isOpen)}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>
            {openDeletePupilActivity && (
                <ConfirmationModal
                    open={openDeletePupilActivity}
                    onCancel={() => setOpenDeletePupilActivity(!openDeletePupilActivity)}
                    loading={deletePupilActivityLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deletePupilActivityMutation({
                            variables: {
                                id: pupilActivityToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeletePupilActivity(!openDeletePupilActivity);
                                setPupilActivityToBeDeletedId(null);
                                callSnackbar('Pupil topic deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeletePupilActivity(!openDeletePupilActivity);
                                setPupilActivityToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the pupil topic." />
                </ConfirmationModal>
            )}
            <CommonDraggableTable rows={row} columns={head} />
        </div>
    );
};

PupilActivityOverview.propTypes = {
    pupiltopic_id: PropTypes.number,
    setClassName: PropTypes.func
};

export default PupilActivityOverview;
