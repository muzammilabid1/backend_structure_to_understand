import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteClassTopic } from '../../../graphQl/mutations';
import { getClassTopicsForAdmin } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { sortingDate, ThemeContext, truncate } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import CommonSelectField from './../../Shared/CommonSelectField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';

const ClassTopicOverview = ({ class_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState(sharedJson?.deletedClassTopicFilter?.[0]?.key);
    const [openDeleteClassTopic, setOpenDeleteClassTopic] = useState(false);
    const [classTopicToBeDeletedId, setClassTopicToBeDeletedId] = useState(null);

    const [getClassTopicsQuery, { loading, error, data: classTopicsData }] = useLazyQuery(getClassTopicsForAdmin, {
        fetchPolicy: 'network-only'
    });
    const [deleteClassTopicMutation, { loading: deleteClassTopicLoading }] = useMutation(deleteClassTopic, {
        refetchQueries: [{ query: getClassTopicsForAdmin, variables: { classId: class_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        class_id &&
            getClassTopicsQuery({
                variables: { classId: class_id }
            });
    }, []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _onClick = (id) => {
        setOpenDeleteClassTopic(true);
        setClassTopicToBeDeletedId(id);
    };

    const head = [
        {
            Header: 'Display Date',
            accessor: '',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/classtopic/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            ),
            sortType: (a, b) => sortingDate(a.original?.date, b.original?.date)
        },
        {
            Header: 'Is Released?',
            accessor: 'col2'
        },
        {
            Header: 'Teacher Message',
            accessor: 'col3'
        },
        {
            Header: '',
            accessor: 'col4'
        }
    ];

    const row = (classTopicsData?.getClassTopicsForAdmin || []).map((pupil) => {
        return {
            id: pupil.id,
            date: pupil.releaseDate,
            col1: pupil?.displayDate,
            col2: pupil?.released ? 'Released' : 'Not Released',
            col3: pupil?.teacherMessage ? truncate(pupil?.teacherMessage, 300) : '-',
            col4: <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(pupil.id)} icon={'delete'} />
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
            {openDeleteClassTopic && (
                <ConfirmationModal
                    open={openDeleteClassTopic}
                    onCancel={() => setOpenDeleteClassTopic(!openDeleteClassTopic)}
                    loading={deleteClassTopicLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteClassTopicMutation({
                            variables: {
                                id: classTopicToBeDeletedId,
                                option: value
                            }
                        })
                            .then(() => {
                                setOpenDeleteClassTopic(!openDeleteClassTopic);
                                setClassTopicToBeDeletedId(null);
                                callSnackbar('Class topic deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteClassTopic(!openDeleteClassTopic);
                                setClassTopicToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <div className="delete-class-topic-modal-confirmation">
                        <CommonSelectField
                            label={'Options'}
                            options={sharedJson?.deletedClassTopicFilter}
                            value={value}
                            error={value == null && 'Required *'}
                            touched={true}
                            onChange={(e) => setValue(e.target.value)}
                            style={{ marginTop: '1rem' }}
                        />
                        <Paragraph text="This will permanently delete the class topic." />
                    </div>
                </ConfirmationModal>
            )}
            <CommonDraggableTable rows={row} columns={head} />
        </div>
    );
};

ClassTopicOverview.propTypes = {
    class_id: PropTypes.number
};

export default ClassTopicOverview;
