import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useContext, useEffect, useMemo, useState } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpProgram } from '../../../types/entities/IStaticLwpProgram';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonTag from '../../Shared/CommonTag';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import ShowSchoolsBySchoolTagId from '../../Shared/ShowSchoolsBySchoolTagId';
import Heading1 from '../../Shared/Typography/Heading1';
import CreateProgram from './CreateProgram';

interface IActionListItems {
    text: string;
    icon: string;
    onClick: (staticProgram: IStaticLwpProgram) => void;
}

interface IOpen {
    isVisibleCreatePartnershipModal: boolean;
    program: IStaticLwpProgram;
    showConfirmationModal: boolean;
}

const initialValues: IOpen = {
    isVisibleCreatePartnershipModal: false,
    program: null,
    showConfirmationModal: false
};

export const getProgramsForAdmin = gql`
    query getProgramsForAdmin {
        getProgramsForAdmin {
            id
            name
            logoUrl
            characterUrl
            schoolTag {
                id
                name
                color
            }
        }
    }
`;

const removeProgram = gql`
    mutation removeProgram($id: String!) {
        removeProgram(id: $id) {
            status
            msg
        }
    }
`;

const AdminPartnerships = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [open, setOpen] = useState<IOpen>(initialValues);

    const { callSnackbar } = useContext(ThemeContext);
    const isOpen: boolean = searchParams.get('isOpen') === 'true';

    const [getProgramsForAdminQuery, { loading, data }] = useLazyQuery(getProgramsForAdmin, {
        notifyOnNetworkStatusChange: true
    });

    useEffect(() => {
        if (router.isReady) {
            getProgramsForAdminQuery();
        }
    }, [router.isReady]);

    const [removeProgramMutation, { loading: removeProgramLoading }] = useMutation(removeProgram);

    const header = [
        {
            Header: 'Program name',
            accessor: 'col1'
        },
        {
            Header: 'School tag',
            accessor: 'col2'
        },
        {
            Header: '',
            accessor: 'col3'
        }
    ];

    const partnersActionList: Array<IActionListItems> = [
        {
            text: 'Edit',
            icon: 'edit',
            onClick: (staticProgram: IStaticLwpProgram): void => {
                setOpen((prev: IOpen) => ({
                    ...prev,
                    program: staticProgram,
                    isVisibleCreatePartnershipModal: true
                }));
            }
        },
        {
            text: 'Delete',
            icon: 'delete',
            onClick: (staticProgram: IStaticLwpProgram): void => {
                setOpen((prev: IOpen) => ({
                    ...prev,
                    program: staticProgram,
                    showConfirmationModal: true
                }));
            }
        }
    ];

    const rows = useMemo(() => {
        const partners: Array<IStaticLwpProgram> = data?.getProgramsForAdmin ?? [];

        return partners.map((partner) => ({
            id: partner?.id,
            col1: partner?.name,
            col2: partner?.schoolTag ? (
                <Grid container>
                    <CommonPopOver element={<CommonTag name={partner?.schoolTag?.name} bgColor={partner?.schoolTag?.color} />} hover>
                        <ShowSchoolsBySchoolTagId tagId={partner?.schoolTag?.id} />
                    </CommonPopOver>
                </Grid>
            ) : (
                '--'
            ),

            col3: (
                <div style={{ display: 'flex', justifyContent: 'end' }}>
                    <CommonPopOver bold icon="more_horiz">
                        {partnersActionList?.map((item: IActionListItems) => (
                            <div className="schedule-table-actions-container" key={item.text} onClick={() => item.onClick(partner)}>
                                <span className="material-icons">{item.icon}</span>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </CommonPopOver>
                </div>
            )
        }));
    }, [data?.getProgramsForAdmin, partnersActionList]);

    const handleClose = (): void => {
        setOpen(initialValues);
    };

    const handleConfirm = async (): Promise<void> => {
        const performAction = removeProgramMutation;

        try {
            const res = await performAction({
                variables: { id: open?.program?.id },
                refetchQueries: [
                    {
                        query: getProgramsForAdmin
                    }
                ]
            });

            if (res?.errors?.length) throw Error(res?.errors?.[0]?.message);

            callSnackbar('Program deleted successfully!', 'success');
        } catch (e) {
            callSnackbar(e, 'error');
        } finally {
            handleClose();
        }
    };

    return (
        <div data-test={'partnerships-page'}>
            <Grid container alignItems={'center'} justifyContent={'space-between'}>
                <Heading1 text="Partnerships" />
                <Grid>
                    <LWPButton
                        btnText="Add partner"
                        onClick={() =>
                            setOpen((pre: IOpen) => ({
                                ...pre,
                                isVisibleCreatePartnershipModal: true
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
                        onClick={() => router.push({ query: { ...router.query, isOpen: !isOpen } })}
                        endIcon={isOpen ? 'expand_less' : 'expand_more'}
                    />
                </Grid>
            </Grid>

            {loading ? <CommonLoading /> : <CommonDraggableTable columns={header} rows={rows} customClass="domain_table" />}

            {open.isVisibleCreatePartnershipModal && (
                <CreateProgram
                    isOpen={open.isVisibleCreatePartnershipModal}
                    handleClose={() => setOpen(initialValues)}
                    program={open.program}
                />
            )}

            <ConfirmationModal
                open={open?.showConfirmationModal}
                onCancel={handleClose}
                onConfirm={handleConfirm}
                loading={removeProgramLoading}
                heading={'Delete program'}
                btnText={'Delete'}>
                Are you sure you want to delete this program?
            </ConfirmationModal>
        </div>
    );
};

export default AdminPartnerships;
