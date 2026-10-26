import { useRouter } from 'next/router';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import CommonStatus from '../Shared/CommonStatus';

const Unauthorized = () => {
    const router = useRouter();

    return (
        <div>
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
                imageAlt="You do not have access to this page"
                heading="You do not have access to this page"
                subHeading="Please contact the administrator if you believe this is an error."
                buttonText="Back to the homepage"
                onClick={() => router?.push('/')}
                className="py20"
            />
        </div>
    );
};

export default Unauthorized;
