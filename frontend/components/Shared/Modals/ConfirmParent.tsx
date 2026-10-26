import { gql, InternalRefetchQueriesInclude, useMutation } from '@apollo/client';
import { Alert, DialogActions } from '@mui/material';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import React, { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import DialogWrapper from '../DialogWrapper';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

const confirmParentDetailsForParentAndCarersTable = gql`
    mutation confirmParentDetails($input: ConfirmParentDetailsInput!, $schoolId: String!) {
        confirmParentDetails(input: $input, schoolId: $schoolId)
    }
`;

type ConfirmParentInput = {
    id: string;
    firstname: string;
    lastname: string;
    email?: string;
    phoneNumber?: string;
    userStatus?: UserStatus;
    pupilParentId: string;
    pupilParentStatus: PupilParentStatus;
    schoolId: string;
    numSchoolsWithPupils: number;
};

interface ConfirmParentModalProps {
    open: boolean;
    setOpen: () => void;
    onConfirm: () => void;
    onEdit: (input: ConfirmParentInput) => void;
    input: ConfirmParentInput;
    refetch: InternalRefetchQueriesInclude;
}

const ConfirmParentModal = ({ open, setOpen, input, refetch, onConfirm, onEdit }: ConfirmParentModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [confirmParentDetailsMutation, { loading: confirmParentDetailsLoading, error: confirmParentDetailsError }] = useMutation(
        confirmParentDetailsForParentAndCarersTable,
        {
            refetchQueries: refetch,
            awaitRefetchQueries: true
        }
    );

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, confirmParentDetailsError);
    }, [confirmParentDetailsError]);

    return (
        <DialogWrapper
            open={open}
            setOpen={() => setOpen()}
            customFooter={
                <DialogActions>
                    <LWPButton
                        size={'large'}
                        variant="text"
                        onClick={setOpen}
                        btnText={'Cancel'}
                        color="inherit"
                        dataTest="dialog-cancel-btn"
                    />
                    <LWPButton
                        size={'large'}
                        variant="contained"
                        btnText={'Edit'}
                        onClick={() => onEdit(input)}
                        color="inherit"
                        dataTest="dialog-secondary-btn"
                    />
                    <LWPButton
                        size={'large'}
                        variant="contained"
                        onClick={() => {
                            confirmParentDetailsMutation({
                                variables: {
                                    input: {
                                        parentId: input?.id,
                                        pupilParentId: input?.pupilParentId,
                                        email: input?.email?.length > 0 ? input?.email : null,
                                        phoneNumber: input?.phoneNumber?.length > 0 ? input?.phoneNumber : null
                                    },
                                    schoolId: input.schoolId
                                }
                            })
                                .then(() => {
                                    callSnackbar('Parent details confirmed.', 'success');
                                    onConfirm();
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                        }}
                        btnText={input?.pupilParentStatus === PupilParentStatus.REJECTED ? 'Reconfirm' : 'Confirm'}
                        loading={false}
                        dataTest="dialog-primary-btn"
                    />
                </DialogActions>
            }
            primaryBtnloading={confirmParentDetailsLoading}
            primaryBtnText="Confirm"
            heading={input?.pupilParentStatus === PupilParentStatus.REJECTED ? 'Reconfirm details' : 'Confirm details'}
            contentWidth="550px">
            <Paragraph customClass="pt2 pb5">
                Once these details are confirmed, this parent will start receiving notifications about work that is set for their child.
            </Paragraph>
            {input?.pupilParentStatus === PupilParentStatus.REJECTED && (
                <div className="missing-parent-alert" style={{ marginBottom: '15px' }}>
                    <Alert severity="error">
                        This parent rejected a previous invitation. Please make sure the contact details are correct before you proceed.
                    </Alert>
                </div>
            )}

            <Heading3 text={`${input?.firstname} ${input?.lastname}`} />
            {input.email ? <Paragraph style={{ marginTop: '15px' }} text={input.email} /> : null}
            {input.phoneNumber ? <Paragraph style={{ marginTop: '15px' }} text={input.phoneNumber} /> : null}
        </DialogWrapper>
    );
};

export default ConfirmParentModal;
