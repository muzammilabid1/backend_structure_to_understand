import { gql, useQuery } from '@apollo/client';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Divider, Drawer, Grid } from '@mui/material';
import { useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { PupilDetails } from '../../../../types/IDataChange';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonTag from '../../../Shared/CommonTag';
import PupilDetail from '../../../Shared/PupilDetail/PupilDetail';
import Heading2 from '../../../Shared/Typography/Heading2';
import Heading3 from '../../../Shared/Typography/Heading3';

interface IComparePupilDetailsDrawerProps {
    open: boolean;
    handleClose: () => void;
    importedPupilId: string;
    platformPupilId?: string;
}

const getPupilDataForComparisonQuery = gql`
    query getPupilDataForComparison($importedStudentId: String!, $platformPupilId: String) {
        getPupilDataForComparison(importedStudentId: $importedStudentId, platformPupilId: $platformPupilId) {
            importedStudent {
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
            platformPupil {
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
                    status
                }
                feedbackCount
                lastActivity
                pupilStatus
                isPreviouslyLinked
            }
        }
    }
`;

const ComparePupilDetailsDrawer = ({ open, handleClose, importedPupilId, platformPupilId }: IComparePupilDetailsDrawerProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { data, loading, error } = useQuery(getPupilDataForComparisonQuery, {
        variables: {
            importedStudentId: importedPupilId,
            platformPupilId: platformPupilId
        }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const importedPupilDetails: PupilDetails = data?.getPupilDataForComparison?.importedStudent;
    const platformPupil: PupilDetails = data?.getPupilDataForComparison?.platformPupil;

    return (
        <Drawer
            className="compare-details-drawer"
            anchor={'right'}
            open={open}
            onClose={handleClose}
            PaperProps={{ sx: { maxWidth: `813px !important`, width: '100%' } }}>
            <Grid container sx={{ width: '100%', boxSizing: 'border-box' }} p={4} rowGap={3}>
                <Grid xs={12} display="flex" justifyContent="space-between" alignItems="center" item>
                    <Heading2 text="Comparing pupils details" />
                    <CommonIconButton icon="close" dataTest="compare-pupil-details-drawer-close-button" onClick={handleClose} />
                </Grid>

                <Grid item xs={12}>
                    <Divider />
                </Grid>

                {loading ? (
                    <Grid item xs={12}>
                        <CommonLoading />
                    </Grid>
                ) : (
                    <Grid item xs={12}>
                        <Grid container rowGap={3}>
                            <Grid item xs={12} display="flex" flexDirection="column" gap={2}>
                                <Heading3
                                    text={`${importedPupilDetails?.firstname} ${importedPupilDetails?.lastname}'s details (external)`}
                                />
                                <PupilDetail pupilDetails={importedPupilDetails} />
                            </Grid>
                            <Grid item xs={12} display="flex" justifyContent="center">
                                <CompareArrowsIcon className="detail-comparison-icon" />
                            </Grid>
                            <Grid item xs={12} display="flex" flexDirection="column" gap={2}>
                                <Grid container alignItems="center" gap={2}>
                                    <Heading3 text={`${platformPupil?.firstname} ${platformPupil?.lastname}'s details (LWP data)`} />
                                    {platformPupil?.isPreviouslyLinked ? (
                                        <CommonTag
                                            name="Previously linked to this external pupil"
                                            dataTest="previously-linked-tag"
                                            bgColor="#FFF4E5"
                                            textColor="#663C00"
                                            contrast={false}
                                        />
                                    ) : null}
                                </Grid>
                                <PupilDetail pupilDetails={platformPupil} />
                            </Grid>
                        </Grid>
                    </Grid>
                )}
            </Grid>
        </Drawer>
    );
};

export default ComparePupilDetailsDrawer;
