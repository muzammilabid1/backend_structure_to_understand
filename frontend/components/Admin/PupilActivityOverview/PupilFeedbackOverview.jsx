import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteFeedback } from '../../../graphQl/mutations';
import { getPupilFeedbacksOfPupilActivity } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';

const PupilFeedbackOverview = ({ pupilactivity_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [openDeletePupilActivity, setOpenDeletePupilActivity] = useState(false);
    const [pupilActivityToBeDeletedId, setPupilActivityToBeDeletedId] = useState(null);

    const [pupilActivitiesQuery, { loading, error, data: pupilFeedbacksData }] = useLazyQuery(getPupilFeedbacksOfPupilActivity, {
        fetchPolicy: 'network-only'
    });

    const [deletePupilFeedbackMutation, { loading: deletePupilFeedbackLoading }] = useMutation(deleteFeedback, {
        refetchQueries: [
            {
                query: getPupilFeedbacksOfPupilActivity,
                variables: { pupilActivityId: pupilactivity_id }
            }
        ],
        awaitRefetchQueries: true
    });

    const _onClick = (id) => {
        setOpenDeletePupilActivity(true);
        setPupilActivityToBeDeletedId(id);
    };

    useEffect(() => {
        pupilactivity_id &&
            pupilActivitiesQuery({
                variables: { pupilActivityId: pupilactivity_id }
            });
    }, []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const head = [
        { accessor: 'col1', Header: 'Parent Comment' },
        { accessor: 'col2', Header: 'Child Comment' },
        {
            accessor: 'col3',
            Header: ''
        }
    ];

    const row = (pupilFeedbacksData?.getPupilFeedbacksOfPupilActivity || []).map((pupilFeedback) => {
        return {
            id: pupilFeedback.id,
            col1: pupilFeedback?.parentComment ?? '-',
            col2: pupilFeedback?.pupilComment ?? '-',
            col3: <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(pupilFeedback.id)} icon={'delete'} />
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
                    loading={deletePupilFeedbackLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deletePupilFeedbackMutation({
                            variables: {
                                id: pupilActivityToBeDeletedId
                            }
                        })
                            .then(() => {
                                callSnackbar('Pupil topic deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                            })
                            .finally(() => setPupilActivityToBeDeletedId(null));
                    }}>
                    <Paragraph text="This will permanently delete the pupil topic." />
                </ConfirmationModal>
            )}
            <CommonDraggableTable rows={row} columns={head} />
        </div>
    );
};

PupilFeedbackOverview.propTypes = {
    pupilactivity_id: PropTypes.number
};

export default PupilFeedbackOverview;
