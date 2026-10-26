import { gql, useMutation, useQuery } from '@apollo/client';
import { Stack } from '@mui/system';
import React, { useContext, useEffect, useState } from 'react';

import { deleteInterstitialForm, releaseInterstitialForm, resetInterstitialForm } from '../../../graphQl/mutations';
import { handleErrorSnackbar, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import { InterstitialForm } from '../../../types/entities/IStaticLwpInterstitial';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonTag from '../../Shared/CommonTag';
import AddInterstitialForm from '../../Shared/Modals/AddInterstitialForm';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

export const getAllInterstitialFormForSiteForm = gql`
    query getAllInterstitialForm {
        getAllInterstitialForm {
            id
            type
            heading
            text
            name
            averageTime
            typeformId
            userOptions
            lastActionAt
            lastAction
            showQuestion
            subject {
                id
                name
            }
            schoolTags {
                id
                name
                color
            }
        }
    }
`;

interface InterstitialFormData {
    getAllInterstitialForm: InterstitialForm[];
}

const SiteForms: React.FC = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const [open, setOpen] = useState<boolean>(false);
    const [willUpdateValues, setWillUpdateValues] = useState<InterstitialForm | null>(null);
    const [willDeleteItemId, setWillDeleteItemId] = useState<string | null>(null);
    const [resetInterstitialFormItemId, setResetInterstitialFormItemId] = useState<string | null>(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState<boolean>(false);
    const [resetInterstitialFormModal, setResetInterstitialFormModal] = useState<boolean>(false);

    const {
        loading: getInterstitialFormDataIsLoading,
        error,
        data: allInterstitialFormData
    } = useQuery<InterstitialFormData>(getAllInterstitialFormForSiteForm);

    const [deleteInterstitialFormMutation, { loading: deleteInterstitialFormIsLoading, error: deleteInterstitialFormError }] = useMutation(
        deleteInterstitialForm,
        {
            refetchQueries: [{ query: getAllInterstitialFormForSiteForm }],
            awaitRefetchQueries: true
        }
    );

    const [releaseInterstitialFormMutation, { loading: releaseInterstitialFormIsLoading, error: releaseInterstitialFormError }] =
        useMutation(releaseInterstitialForm, {
            refetchQueries: [{ query: getAllInterstitialFormForSiteForm }],
            awaitRefetchQueries: true
        });

    const [resetInterstitialFormMutation, { loading: resetInterstitialFormIsLoading, error: resetInterstitialFormError }] = useMutation(
        resetInterstitialForm,
        {
            refetchQueries: [{ query: getAllInterstitialFormForSiteForm }],
            awaitRefetchQueries: true
        }
    );

    const _onEdit = (interstitialFormId: string) => {
        const found = allInterstitialFormData?.getAllInterstitialForm.find((form) => form.id === interstitialFormId);

        if (found) {
            setWillUpdateValues(found);
            setOpen(true);
        }
    };

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
        handleErrorSnackbar(callSnackbar, deleteInterstitialFormError);
        handleErrorSnackbar(callSnackbar, releaseInterstitialFormError);
        handleErrorSnackbar(callSnackbar, resetInterstitialFormError);
    }, [error, deleteInterstitialFormError, releaseInterstitialFormError, resetInterstitialFormError]);

    const getId = (interstitialFormId: string): string | undefined => {
        return allInterstitialFormData?.getAllInterstitialForm.find((form) => form.id === interstitialFormId)?.id;
    };

    const _onDelete = (interstitialFormId: string) => {
        if (!deleteInterstitialFormIsLoading) {
            const id = getId(interstitialFormId);

            if (id) {
                setWillDeleteItemId(id);
                setOpenDeleteItemConfirmationModal(true);
            }
        }
    };

    const _releaseInterstitialForm = (interstitialFormId: string) => {
        const id = getId(interstitialFormId);

        if (!id) return;

        releaseInterstitialFormMutation({ variables: { id } })
            .then(() => callSnackbar('Released successfully!', 'success'))
            .catch((err) => callSnackbar(err, 'error'));
    };

    const _resetInterstitialForm = (interstitialFormId: string) => {
        if (!releaseInterstitialFormIsLoading) {
            const id = getId(interstitialFormId);

            if (id) {
                setResetInterstitialFormItemId(id);
                setResetInterstitialFormModal(true);
            }
        }
    };

    const addNewsListItem = [
        {
            text: 'Add a Form',
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
        { accessor: 'col1', Header: 'Heading' },
        { accessor: 'col2', Header: 'Text' },
        { accessor: 'col3', Header: 'Typeform id' },
        { accessor: 'col4', Header: 'User options' },
        { accessor: 'col5', Header: 'Last action' },
        { accessor: 'col6', Header: 'Subject' },
        {
            accessor: 'col7',
            Header: 'Date',
            Cell: ({ value }: { value: string }) => (value ? showDate({ date: value, time: true }) : '-'),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sortType: (a: any, b: any) => sortingDate(a.original?.col6, b.original?.col6)
        },
        { accessor: 'col8', Header: '', width: '250' }
    ];

    const rows =
        allInterstitialFormData?.getAllInterstitialForm.map((form) => ({
            id: form.id,
            col1: form.heading,
            col2: form.text ?? '-',
            col3: form.typeformId,
            col4: form.userOptions?.toString()?.split(',').join(', '),
            col5: form.lastAction,
            col6: form.subject?.name ?? '-',
            col7: form.lastActionAt,
            col8: (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CommonPopOver icon={'tag'} hover>
                        <Stack direction="row" flexWrap="wrap" gap={1} maxWidth={300}>
                            {!form?.schoolTags?.length && 'No tags'}
                            {form?.schoolTags?.map((tag) => <CommonTag name={tag?.name} bgColor={tag?.color} />)}
                        </Stack>
                    </CommonPopOver>
                    <CommonIconButton
                        onClick={() => _onEdit(form.id)}
                        icon="create"
                        toolTipTitle="Edit"
                        dataTest="edit-interstitial-form"
                    />
                    <CommonIconButton
                        onClick={() => _onDelete(form.id)}
                        icon="delete"
                        toolTipTitle="Delete"
                        dataTest="delete-interstitial-form"
                    />
                    <CommonIconButton
                        onClick={() => _releaseInterstitialForm(form.id)}
                        disabled={form.lastAction === 'RELEASED'}
                        icon="publish"
                        toolTipTitle={form.lastAction === 'RELEASED' ? 'Already Released' : 'Release'}
                        dataTest="release-interstitial-form"
                    />
                    <CommonIconButton
                        onClick={() => _resetInterstitialForm(form.id)}
                        icon="restart_alt"
                        toolTipTitle="Clear"
                        dataTest="clear-interstitial-form"
                    />
                </Stack>
            )
        })) ?? [];

    if (getInterstitialFormDataIsLoading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test="site-forms-page">
            <div className="header">
                <Heading2 text="Site Forms" />
                <CommonListWithIcon list={addNewsListItem} />
            </div>
            <CommonDraggableTable rows={rows} columns={head} />
            {open && <AddInterstitialForm open={open} setOpen={() => setOpen(false)} defaultValues={willUpdateValues} />}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    loading={deleteInterstitialFormIsLoading}
                    onConfirm={() => {
                        if (!willDeleteItemId) return;
                        deleteInterstitialFormMutation({ variables: { id: willDeleteItemId } })
                            .then(() => {
                                callSnackbar('Form item removed', 'success');
                            })
                            .catch((err) => {
                                callSnackbar(err, 'error');
                            })
                            .finally(() => {
                                setOpenDeleteItemConfirmationModal(false);
                            });
                    }}
                />
            )}
            {resetInterstitialFormModal && (
                <ConfirmationModal
                    open={resetInterstitialFormModal}
                    onCancel={() => setResetInterstitialFormModal(false)}
                    loading={resetInterstitialFormIsLoading}
                    heading="Reset form"
                    btnText="Reset"
                    onConfirm={() => {
                        if (!resetInterstitialFormItemId) return;
                        resetInterstitialFormMutation({ variables: { id: resetInterstitialFormItemId } })
                            .then(() => {
                                callSnackbar('Reset successfully!', 'success');
                            })
                            .catch((err) => {
                                callSnackbar(err, 'error');
                            })
                            .finally(() => {
                                setResetInterstitialFormModal(false);
                            });
                    }}>
                    <Paragraph text="Are you sure you want to reset this form" />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default SiteForms;
