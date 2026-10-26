import { useRouter } from 'next/compat/router';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import CommonStatus from '../Shared/CommonStatus';

const Page404 = () => {
    const router = useRouter();

    return (
        <div>
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
                imageAlt="Mathscot with hands over eyes"
                heading="Oops! Page not found"
                subHeading="Have you found a broken link? Please let us know using the chat button."
                buttonText="Back to the homepage"
                onClick={() => router?.push('/')}
            />
        </div>
    );
};

export default Page404;
