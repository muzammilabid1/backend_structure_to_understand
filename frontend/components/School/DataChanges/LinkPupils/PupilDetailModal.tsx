import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { PupilSourceType } from 'lwp-shared';
import { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { PupilDetails } from '../../../../types/IDataChange';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonLoading from '../../../Shared/CommonLoading';
import DialogWrapper from '../../../Shared/DialogWrapper';
import PupilDetail from '../../../Shared/PupilDetail/PupilDetail';

interface IPupilDetailModalProps {
    open: boolean;
    handleClose: () => void;
    pupilId: string;
    pupilName: string;
    sourceType: PupilSourceType;
}

const getPupilData = gql`
    query getPupilData($pupilId: String!, $sourceType: PupilSourceType!) {
        getPupilData(pupilId: $pupilId, sourceType: $sourceType) {
            id
            firstname
            lastname
            schoolClassName
            UPN
            gender
            dateOfBirth
            yearGroup
            parents {
                firstname
                lastname
                email
                phoneNumber
            }
        }
    }
`;

const PupilDetailModal = ({ open, handleClose, pupilId, pupilName, sourceType }: IPupilDetailModalProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { data, loading, error } = useQuery(getPupilData, {
        variables: {
            pupilId,
            sourceType
        },
        skip: !(pupilId && sourceType)
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const importedPupilDetails: PupilDetails = data?.getPupilData;

    return (
        <DialogWrapper contentWidth="826px" heading={`${pupilName}'s details`} open={open} setOpen={handleClose} onClose={handleClose}>
            {loading ? (
                <CommonLoading />
            ) : (
                <Grid container justifyContent="center" rowGap={'32px'}>
                    <Grid item xs={12}>
                        <PupilDetail pupilDetails={importedPupilDetails} />
                    </Grid>
                    <Grid item>
                        <LWPButton
                            btnText="Close"
                            dataTest="pupil-details-modal-close-button"
                            color="inherit"
                            sx={{ width: '123px' }}
                            onClick={handleClose}
                        />
                    </Grid>
                </Grid>
            )}
        </DialogWrapper>
    );
};

export default PupilDetailModal;
