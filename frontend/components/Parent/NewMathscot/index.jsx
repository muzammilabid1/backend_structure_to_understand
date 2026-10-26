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

const NewMathscot = () => {
    const queryParams = useParams();
    const router = useRouter();
    const classes = useStyles();

    return (
        <>
            <br />
            <br />
            <CommonStatus
                className={classes.container}
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`}
                imageAlt="Mathscot with red shirt"
                heading="It’s time for a new Mathscot!"
                subHeading="Click the button to choose your Mathscot for this year. Each time you complete an activity you earn an item for it. (If you created a mathscot last year, it's not gone forever - it will appear it in the “Achievements” area on your homepage.)"
                buttonText="Continue to the site"
                onClick={() => router?.push(`/child/${queryParams?.child_id}/select-mathscot`)}
            />
        </>
    );
};

export default NewMathscot;
