import { Grid } from '@mui/material';
import { useRouter } from 'next/router';

import { useDataChangesReview } from '../../../../../context/DataChangesReviewContext';
import { MINIO_PUBLIC_PATHS } from '../../../../../shared/Constant';
import LWPButton from '../../../../Shared/Button/LWPButton';
import CommonStatus from '../../../../Shared/CommonStatus';

const ClassChanges = () => {
    const { schoolId } = useDataChangesReview();
    const router = useRouter();

    return (
        <div>
            <Grid container justifyContent="center" alignItems="center" flexDirection="column" gap={2} my={6}>
                <Grid item>
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={'No changes to review'}
                        heading="No changes to review"
                    />
                </Grid>
                <Grid item>
                    <LWPButton btnText="Return to school overview" onClick={() => router.push(`/school/${schoolId}`)} />
                </Grid>
            </Grid>
        </div>
    );
};

export default ClassChanges;
