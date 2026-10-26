import { gql, useQuery } from '@apollo/client';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Divider, Drawer, Grid } from '@mui/material';
import { useContext, useEffect, useMemo } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { IClassSummary, IPupilSummary } from '../../../../types/IDataChange';
import CommonIconButton from '../../../Shared/Button/CommonIconButton';
import CommonLoading from '../../../Shared/CommonLoading';
import Heading2 from '../../../Shared/Typography/Heading2';
import PupilsInClass from './PupilsInClass';

interface ICompareClassesDrawer {
    open: boolean;
    handleClose: () => void;
    importedSchoolClass: IClassSummary;
    platformSchoolClass: IClassSummary;
}

const getClassDataForComparison = gql`
    query getClassDataForComparison($importedSchoolClassId: String!, $platformSchoolClassId: String) {
        getClassDataForComparison(importedSchoolClassId: $importedSchoolClassId, platformSchoolClassId: $platformSchoolClassId) {
            importedSchoolClassPupilData {
                id
                firstname
                lastname
                sourceType
            }
            platformSchoolClassPupilData {
                id
                firstname
                lastname
                sourceType
            }
        }
    }
`;

const CompareClassesDrawer = ({ open, handleClose, platformSchoolClass, importedSchoolClass }: ICompareClassesDrawer) => {
    const { callSnackbar } = useContext(ThemeContext);

    const { data, loading, error } = useQuery(getClassDataForComparison, {
        variables: {
            importedSchoolClassId: importedSchoolClass?.id,
            platformSchoolClassId: platformSchoolClass?.id || null
        }
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const { importedPupilDetails, platformPupil }: { importedPupilDetails: IPupilSummary[]; platformPupil: IPupilSummary[] } =
        useMemo(() => {
            const pupilsList = data?.getClassDataForComparison;

            if (!pupilsList) {
                return { importedPupilDetails: [], platformPupil: [] };
            }

            const importedPupilDetails = pupilsList?.importedSchoolClassPupilData || [];
            const platformPupil = pupilsList?.platformSchoolClassPupilData || [];

            return { importedPupilDetails, platformPupil };
        }, [data?.getClassDataForComparison]);

    const isComparisonAvailable = importedSchoolClass && platformSchoolClass;

    return (
        <Drawer
            className="compare-details-drawer"
            anchor={'right'}
            open={open}
            onClose={handleClose}
            PaperProps={{ sx: { maxWidth: `813px !important`, width: '100%' } }}>
            <Grid container sx={{ width: '100%', boxSizing: 'border-box' }} p={4} rowGap={3}>
                <Grid xs={12} display="flex" justifyContent="space-between" alignItems="center" item>
                    <Heading2 text={isComparisonAvailable ? `Comparing classes` : `${importedSchoolClass.name}'s (external)`} />
                    <CommonIconButton icon="close" dataTest="compare-details-drawer-close-button" onClick={handleClose} />
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
                            <PupilsInClass
                                pupils={importedPupilDetails}
                                title={isComparisonAvailable ? `${importedSchoolClass.name}’s pupils (external)` : 'Pupils in this class'}
                            />
                            {isComparisonAvailable ? (
                                <>
                                    <Grid item xs={12} display="flex" justifyContent="center">
                                        <CompareArrowsIcon className="detail-comparison-icon" />
                                    </Grid>
                                    <PupilsInClass pupils={platformPupil} title={`${platformSchoolClass.name}’s pupils (LWP data)`} />
                                </>
                            ) : null}
                        </Grid>
                    </Grid>
                )}
            </Grid>
        </Drawer>
    );
};

export default CompareClassesDrawer;
