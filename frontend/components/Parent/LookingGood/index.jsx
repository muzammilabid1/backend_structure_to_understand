import { makeStyles } from '@mui/styles';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonStatus from '../../Shared/CommonStatus';

const useStyles = makeStyles({
    container: {
        width: '50%',
        margin: 'auto'
    }
});

const LookingGood = () => {
    const queryParams = useParams();
    const router = useRouter();
    const classes = useStyles();

    return (
        <>
            <br />
            <br />
            <CommonStatus
                className={classes.container}
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`}
                image1={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Koala.png`}
                imageAlt="page not found"
                heading="Looking good!"
                subHeading="Your new Mathscot is ready to learn with you. Complete activities to earn rewards for your Mathscot."
                buttonText="Go to Learning with Parents"
                onClick={() => router?.push(`/child/${queryParams?.child_id}`)}
            />
        </>
    );
};

export default LookingGood;
