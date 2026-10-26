import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { SubjectProgrammeType } from 'lwp-shared';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpSubject } from '../../../types/entities/IStaticLwpSubject';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading1 from '../../Shared/Typography/Heading1';
import AddSubject from './AddSubject';

const getSubjectsForAdmin = gql`
    query getSubjectsForAdmin {
        getSubjectsForAdmin {
            id
            name
            programmeType
        }
    }
`;

const removeSubject = gql`
    mutation removeSubject($id: String!) {
        removeSubject(id: $id) {
            status
            msg
        }
    }
`;

export const renderSubjectProgrammeType = (type: SubjectProgrammeType) => {
    if (type === SubjectProgrammeType.READY_TEDDY) return 'Ready teddy';
    if (type === SubjectProgrammeType.MONEY_SKILLS) return 'Money skills';

    return 'Full programme';
};

const AdminSubjects = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const searchParams = useSearchParams();

    const [open, setOpen] = useState(null);

    const IsOpen = searchParams.get('IsOpen');

    const [getAllSubjectsQuery, { loading: getSubjectLoading, error: getSubjectError, data: getAllSubjectsData }] =
        useLazyQuery(getSubjectsForAdmin);

    const [deleteSubjectMutation, { loading: deleteSubjectLoading }] = useMutation(removeSubject, {
        refetchQueries: [
            {
                query: getSubjectsForAdmin
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        getAllSubjectsQuery({ fetchPolicy: 'network-only' });
    }, [searchParams]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, getSubjectError);
    }, [getSubjectError]);

    useEffect(() => {
        if (IsOpen) {
            setOpen({ isFilterOpen: IsOpen === 'true' });
        }
    }, [searchParams]);

    const _onClose = () => {
        setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen }));
    };

    const subjectListActions = [
        {
            text: 'Edit',
            icon: 'edit',
            onClick: (item) => {
                setOpen((pre) => ({
                    isFilterOpen: pre?.isFilterOpen,
                    isEdit: true,
                    item
                }));
            }
        },
        {
            text: 'Delete',
            icon: 'delete',
            onClick: (item) => {
                setOpen((pre) => ({ isFilterOpen: pre?.isFilterOpen, isDeleted: true, id: item?.id }));
            }
        }
    ];

    const header = [
        {
            Header: 'Subject name',
            accessor: 'col1'
        },
        {
            Header: 'Programme Type',
            accessor: 'col2'
        },
        {
            Header: '',
            accessor: 'col3'
        }
    ];

    const getSubjects = (getAllSubjectsData?.getSubjectsForAdmin || []).map((subject: IStaticLwpSubject) => {
        return {
            id: subject?.id,
            col1: subject?.name,
            col2: renderSubjectProgrammeType(subject?.programmeType),
            col3: (
                <div style={{ display: 'flex', justifyContent: 'end' }}>
                    <CommonPopOver bold icon="more_horiz">
                        {subjectListActions?.map((item) => (
                            <div className="schedule-table-actions-container" key={item.text} onClick={() => item.onClick(subject)}>
                                <span className="material-icons">{item.icon}</span>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </CommonPopOver>
                </div>
            )
        };
    });

    if (getSubjectLoading) return <CommonLoading />;

    return (
        <div data-test={'subjects-page'}>
            <Grid container alignItems={'center'} justifyContent={'space-between'}>
                <Heading1 text="Subjects" />
                <Grid>
                    <LWPButton
                        btnText="Add subject"
                        onClick={() =>
                            setOpen((pre) => ({
                                isFilterOpen: pre?.isFilterOpen,
                                isAddSubject: true
                            }))
                        }
                        color="inherit"
                        variant="text"
                        endIcon={'add'}
                    />
                    <LWPButton
                        color="inherit"
                        variant="text"
                        btnText="Filter"
                        onClick={() =>
                            setOpen(() => ({
                                isFilterOpen: !open?.isFilterOpen
                            }))
                        }
                        endIcon={open?.isFilterOpen ? 'expand_less' : 'expand_more'}
                    />
                </Grid>
            </Grid>

            <CommonDraggableTable columns={header} rows={getSubjects} customClass="domain_table" />

            <AddSubject open={open} setOpen={setOpen} getAllSubjects={getSubjectsForAdmin} />

            <ConfirmationModal
                open={open?.isDeleted}
                onCancel={_onClose}
                onConfirm={() => {
                    deleteSubjectMutation({
                        variables: { id: open?.id }
                    })
                        .then(() => {
                            callSnackbar('subject deleted successfully!', 'success');
                            _onClose();
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                            _onClose();
                        });
                }}
                loading={deleteSubjectLoading}
                heading={'Delete subject'}
                btnText={'Delete'}>
                Are you sure you want to delete this subject?
            </ConfirmationModal>
        </div>
    );
};

export default AdminSubjects;
