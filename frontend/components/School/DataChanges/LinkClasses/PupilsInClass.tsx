import { Grid } from '@mui/material';
import { PupilSourceType } from 'lwp-shared';
import { useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { IPupilSummary } from '../../../../types/IDataChange';
import CommonStatus from '../../../Shared/CommonStatus';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import PupilDetailModal from '../LinkPupils/PupilDetailModal';

interface IPupilsInClassProps {
    pupils: IPupilSummary[];
    title: string;
}

interface IPupilDetailModalState {
    open: boolean;
    pupilId: string | null;
    pupilName: string;
    pupilSourceType: PupilSourceType | null;
}

const initialPupilDetailModalState = {
    open: false,
    pupilId: null,
    pupilName: '',
    pupilSourceType: null
};

const PupilsInClass = ({ pupils, title }: IPupilsInClassProps) => {
    const [pupilDetailModal, setPupilDetailModal] = useState<IPupilDetailModalState>(initialPupilDetailModalState);

    return (
        <>
            <Grid container className="pupils-in-class-container">
                <Grid item xs={12} display="flex" flexDirection="column" gap={2}>
                    <Heading3 text={title} />
                    {pupils.length > 0 ? (
                        <Grid container spacing={2}>
                            {pupils.map((pupil: IPupilSummary) => (
                                <Grid item key={pupil?.id}>
                                    <Paragraph
                                        text={`${pupil?.firstname} ${pupil?.lastname}`}
                                        dataTest={`pupils-in-class-${pupil?.firstname}-${pupil?.lastname}`}
                                        customClass="pupil-name-chip"
                                        onClick={() =>
                                            setPupilDetailModal({
                                                open: true,
                                                pupilId: pupil?.id,
                                                pupilName: `${pupil?.firstname} ${pupil?.lastname}`,
                                                pupilSourceType: pupil?.sourceType
                                            })
                                        }
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <CommonStatus
                            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                            imageAlt={'No pupils found'}
                            heading="No pupils found"
                            className="my20"
                        />
                    )}
                </Grid>
            </Grid>
            {pupilDetailModal.open && (
                <PupilDetailModal
                    open={pupilDetailModal.open}
                    handleClose={() => setPupilDetailModal(initialPupilDetailModalState)}
                    pupilId={pupilDetailModal.pupilId}
                    pupilName={pupilDetailModal.pupilName}
                    sourceType={pupilDetailModal.pupilSourceType}
                />
            )}
        </>
    );
};

export default PupilsInClass;
