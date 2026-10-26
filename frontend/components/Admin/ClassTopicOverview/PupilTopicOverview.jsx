import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deletePupilTopic } from '../../../graphQl/mutations';
import { getPupilTopicsForPupilTopicsOverview } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';

const PupilTopicOverview = ({ classtopic_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [openDeletePupilTopic, setOpenDeletePupilTopic] = useState(false);
    const [pupilTopicToBeDeletedId, setPupilTopicToBeDeletedId] = useState(null);

    const [getClassTopicsQuery, { loading, error, data: pupilTopicsData }] = useLazyQuery(getPupilTopicsForPupilTopicsOverview, {
        fetchPolicy: 'network-only'
    });

    const [deletePupilTopicMutation, { loading: deletePupilTopicLoading }] = useMutation(deletePupilTopic, {
        refetchQueries: [
            {
                query: getPupilTopicsForPupilTopicsOverview,
                variables: { id: classtopic_id }
            }
        ],
        awaitRefetchQueries: true
    });

    const _onClick = (id) => {
        setOpenDeletePupilTopic(true);
        setPupilTopicToBeDeletedId(id);
    };

    useEffect(() => {
        classtopic_id &&
            getClassTopicsQuery({
                variables: { id: classtopic_id }
            });
    }, []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const head = [
        {
            accessor: 'col1',
            Header: 'Release Date',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/pupiltopic/${params?.row?.original?.id}`}>
                    <Paragraph
                        customClass="arrow_cursor"
                        text={params?.row?.original?.col1 ? showDate({ date: params?.row?.original?.col1 }) : '-'}
                    />
                </Link>
            ),
            sortType: (a, b) => sortingDate(a.original?.col1, b.original?.col1)
        },
        { accessor: 'col2', Header: 'Gold star' },
        { accessor: 'col3', Header: 'Silver Stars' },
        { accessor: 'col4', Header: 'Watched Video?' },
        {
            accessor: 'col5',
            Header: ''
        }
    ];

    const row = (pupilTopicsData?.getPupilTopicsForPupilTopicsOverview || []).map((pupil) => {
        return {
            id: pupil.id,
            col1: pupil?.releaseDate,
            col2: pupil?.earnedGoldStar ? 'Yes' : 'No',
            col3: pupil?.silverStars ?? '0',
            col4: pupil?.watchedVideo ? 'Watched' : 'Not Watched',
            col5: <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(pupil.id)} icon={'delete'} />
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
            {openDeletePupilTopic && (
                <ConfirmationModal
                    open={openDeletePupilTopic}
                    onCancel={() => setOpenDeletePupilTopic(!openDeletePupilTopic)}
                    loading={deletePupilTopicLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deletePupilTopicMutation({
                            variables: {
                                id: pupilTopicToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeletePupilTopic(!openDeletePupilTopic);
                                setPupilTopicToBeDeletedId(null);
                                callSnackbar('Pupil topic deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeletePupilTopic(!openDeletePupilTopic);
                                setPupilTopicToBeDeletedId(null);
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

PupilTopicOverview.propTypes = {
    classtopic_id: PropTypes.number,
    setClassName: PropTypes.func
};

export default PupilTopicOverview;
