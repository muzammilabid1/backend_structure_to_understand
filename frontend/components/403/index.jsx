import { useRouter } from 'next/compat/router';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import CommonStatus from '../Shared/CommonStatus';

const Page403 = () => {
    const router = useRouter();

    return (
        <CommonStatus
            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
            imageAlt="Mathscot with hands over eyes"
            heading="Oops! Access denied"
            subHeading="Sorry but you don't have permission to view this page."
            buttonText="Back to the homepage"
            onClick={() => router?.push('/')}
        />
    );
};

export default Page403;
