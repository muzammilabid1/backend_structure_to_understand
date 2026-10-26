import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useState } from 'react';

import { deleteStaticTrophy } from '../../../graphQl/mutations';
import { getStaticTrophies } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';

const TrophyCertificateOverview = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const [willDeleteItemId, setwillDeleteItemId] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);

    const { loading: staticTrophiesDataIsLoading, error: error, data: staticTrophiesData } = useQuery(getStaticTrophies);

    const [deleteStaticTrophyMutation, { loading: deleteStaticTrophyIsLoading, error: deleteStaticTrophyError }] = useMutation(
        deleteStaticTrophy,
        {
            refetchQueries: [{ query: getStaticTrophies }],
            awaitRefetchQueries: true
        }
    );

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        deleteStaticTrophyError?.message && callSnackbar(deleteStaticTrophyError, 'error');
    }, [deleteStaticTrophyError]);

    const getId = (staticTrophyId) => {
        const id = staticTrophiesData?.getStaticTrophies.find((staticTrophy) => staticTrophy.id === staticTrophyId)?.id;

        return id;
    };

    const _onDelete = (staticTrophyId) => {
        if (!deleteStaticTrophyIsLoading) {
            const id = getId(staticTrophyId);

            setwillDeleteItemId(id);
            setOpenDeleteItemConfirmationModal(true);
        }
    };

    const addNewsListItem = [
        {
            text: 'Add a Trophy Certificate',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => router?.push('/admin/add-trophy-certificate')
        }
    ];

    const heading = ['Title', 'Order', ''];

    const head = heading.map((head, index) => {
        return { accessor: `col${index + 1}`, Header: head };
    });

    const Row = (staticTrophiesData?.['getStaticTrophies'] || []).map((staticTrophy) => {
        return {
            id: staticTrophy?.id,
            col1: staticTrophy?.title,
            col2: staticTrophy?.order,
            col3: (
                <>
                    <CommonIconButton
                        onClick={() => router?.push(`/admin/edit-trophy-certificate/${staticTrophy.id}`)}
                        icon="create"
                        toolTipTitle="Edit"
                    />
                    <CommonIconButton onClick={() => _onDelete(staticTrophy.id)} icon="delete" toolTipTitle="Delete" />
                </>
            )
        };
    });

    if (staticTrophiesDataIsLoading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'trophy-certificates-page'}>
            <div className="header">
                <Heading2 text="Trophy Certificate" />

                <CommonListWithIcon list={addNewsListItem} />
            </div>
            <CommonDraggableTable rows={Row} columns={head} />
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    loading={deleteStaticTrophyIsLoading}
                    onConfirm={() => {
                        deleteStaticTrophyMutation({ variables: { id: willDeleteItemId } })
                            .then(() => {
                                callSnackbar('Trophy certificate removed', 'success');
                                setOpenDeleteItemConfirmationModal(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDeleteItemConfirmationModal(false);
                            });
                    }}
                />
            )}
        </div>
    );
};

export default TrophyCertificateOverview;
