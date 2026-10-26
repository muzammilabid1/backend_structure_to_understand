import { gql, useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';

import { deleteModal } from '../../../graphQl/mutations';
import { getModals } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import DialogWrapper from '../../Shared/DialogWrapper';
import InputField from '../../Shared/InputField/InputField';
import AddStaticModal from '../../Shared/Modals/AddModal';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import DialogBox from '../../Shared/StaticActivityViews/dialog';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';
import CommonModalPreview from './../../Shared/CommonModalPreview';

// Mutations

const duplicateModal = gql`
    mutation duplicateModal($modalId: String!, $nameForContentDev: String) {
        duplicateModal(modalId: $modalId, nameForContentDev: $nameForContentDev) {
            id
        }
    }
`;

const ModalsOverviewAdmin = () => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [openPreview, setOpenPreview] = useState(false);
    const [openDuplicate, setOpenDuplicate] = useState(false);
    const [updateValues, setUpdateValues] = useState(null);
    const [willDeleteItemId, setwillDeleteItemId] = useState(null);
    const [nameForContentDev, setNameForContentDev] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);

    const { loading, error, data: allModals } = useQuery(getModals);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteModalMutation, { loading: deleteModalLoading }] = useMutation(deleteModal, {
        refetchQueries: [{ query: getModals }],
        awaitRefetchQueries: true
    });

    const [duplicateModalMutation, { loading: duplicateModalLoading }] = useMutation(duplicateModal, {
        refetchQueries: [{ query: getModals }],
        awaitRefetchQueries: true
    });

    const _onPreview = (modalId) => {
        setUpdateValues(allModals?.getModals.find((modal) => modal.id === modalId));
        setOpenPreview(!openPreview);
    };

    const _onDuplicate = (modalId) => {
        setUpdateValues(allModals?.getModals.find((modal) => modal.id === modalId));
        setOpenDuplicate(!openDuplicate);
    };

    const _onDelete = (modalId) => {
        if (!deleteModalLoading) {
            const modal = allModals?.getModals.find((modal) => modal.id === modalId);

            setwillDeleteItemId(modal?.id);
            setOpenDeleteItemConfirmationModal(true);
        }
    };

    const addModalListItem = [
        {
            text: 'Add a Modal',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => {
                setUpdateValues(null);
                setOpen(!open);
            }
        }
    ];

    const head = [
        {
            accessor: 'col1',
            Header: 'Name',
            Cell: (params) => (
                <Link passHref href={`/admin/activity-modals/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                </Link>
            )
        },
        {
            accessor: 'col2',
            Header: 'Created At',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col2, b.original?.col2)
        },
        { accessor: 'col3', Header: '', width: '200' }
    ];

    const row = (allModals?.getModals || []).map((modal) => {
        return {
            id: modal?.id,
            col1: modal?.nameForContentDev ?? modal?.name,
            col2: modal?.logCreatedAt,
            col3: (
                <>
                    <CommonIconButton toolTipTitle={'Edit'} onClick={() => router?.push(`activity-modals/${modal?.id}`)} icon="create" />
                    <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onDelete(modal?.id)} icon="delete" />
                    <CommonIconButton toolTipTitle={'Preview'} onClick={() => _onPreview(modal?.id)} icon="remove_red_eye" />
                    <CommonIconButton toolTipTitle={'Duplicate'} onClick={() => _onDuplicate(modal?.id)} icon="content_copy" />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'activity-tabs-page'}>
            <div className="header">
                <Heading2 text="Modals" />
                <CommonListWithIcon list={addModalListItem} />
            </div>
            <CommonDraggableTable rows={row} columns={head} />
            {open && <AddStaticModal open={open} setOpen={() => setOpen(false)} updateValues={updateValues} />}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    loading={deleteModalLoading}
                    onConfirm={() => {
                        deleteModalMutation({ variables: { id: willDeleteItemId } })
                            .then(() => {
                                callSnackbar('Modal removed', 'success');
                                setOpenDeleteItemConfirmationModal(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDeleteItemConfirmationModal(false);
                            });
                    }}
                />
            )}
            {openPreview && (
                <DialogBox
                    className="clap_clap_modal"
                    open={openPreview}
                    setOpen={() => {
                        setOpenPreview(!openPreview);
                        setUpdateValues(null);
                    }}
                    heading={updateValues?.name}>
                    <CommonModalPreview modal={updateValues} />
                </DialogBox>
            )}
            {openDuplicate && (
                <DialogWrapper
                    primaryBtnHandler={() => {
                        duplicateModalMutation({ variables: { modalId: updateValues?.id, nameForContentDev } })
                            .then((res) => {
                                callSnackbar('Modal duplicated', 'success');
                                setOpenDuplicate(!openDuplicate);
                                setUpdateValues(null);
                                setNameForContentDev(null);
                                if (res?.data?.duplicateModal?.id) router?.push(`/admin/activity-modals/${res?.data?.duplicateModal?.id}`);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDuplicate(!openDuplicate);
                                setUpdateValues(null);
                                setNameForContentDev(null);
                            });
                    }}
                    primaryBtnText={'Duplicate'}
                    primaryBtnloading={duplicateModalLoading}
                    dialogFooter
                    setOpen={() => {
                        setOpenDuplicate(!openDuplicate);
                        setUpdateValues(null);
                        setNameForContentDev(null);
                    }}
                    cancelBtnText={'Cancel'}
                    open={openDuplicate}
                    cancelBtn={() => {
                        setOpenDuplicate(!openDuplicate);
                        setUpdateValues(null);
                        setNameForContentDev(null);
                    }}
                    className={`confirmation-modal`}
                    heading={`Duplicate ${updateValues?.name}`}>
                    <InputField
                        name="name"
                        value={nameForContentDev}
                        onChange={(e) => setNameForContentDev(e.target.value)}
                        touched={true}
                        label="Name for content developers"
                        type="text"
                        md={12}
                        lg={12}
                    />
                </DialogWrapper>
            )}
        </div>
    );
};

export default ModalsOverviewAdmin;
