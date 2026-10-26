/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from '@apollo/client';
import gql from 'graphql-tag';
import { useContext } from 'react';

import { getAllPupils } from '../../../../graphQl/queries';
import { ThemeContext } from '../../../../shared/Services/handler';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Paragraph from '../../../Shared/Typography/Paragraph';

const adminRejectPupilParentInvite = gql`
    mutation adminRejectPupilParentInvite($pupilParentId: String!) {
        adminRejectPupilParentInvite(pupilParentId: $pupilParentId)
    }
`;

export default function RejectInviteConfirmationModal({ toggle, pupilParent }: Props) {
    const { callSnackbar } = useContext(ThemeContext);

    const [adminRejectPupilParentInviteMutation, { loading: rejectInviteConfirmationLoading }] = useMutation(adminRejectPupilParentInvite, {
        refetchQueries: [{ query: getAllPupils, variables: { parentId: pupilParent.parent.id } }],
        awaitRefetchQueries: true
    });

    return (
        <ConfirmationModal
            open={true}
            onCancel={() => toggle()}
            loading={rejectInviteConfirmationLoading}
            heading="Are you sure?"
            btnText="Confirm"
            onConfirm={() => {
                adminRejectPupilParentInviteMutation({ variables: { pupilParentId: pupilParent.id } })
                    .then(() => {
                        toggle();
                        callSnackbar(`Invitation to ${pupilParent.parent.firstname} rejected`, 'success');
                    })
                    .catch(({ ...err }) => {
                        toggle();
                        callSnackbar(err, 'error');
                    });
            }}>
            <Paragraph text={`This will reject the invitation to ${pupilParent.parent.firstname} ${pupilParent.parent.lastname}.`} />
        </ConfirmationModal>
    );
}

interface Props {
    toggle: () => void;
    pupilParent: any;
}
