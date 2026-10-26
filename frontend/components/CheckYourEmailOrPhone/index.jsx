import { useSearchParams } from 'next/navigation';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import CommonStatus from './../../components/Shared/CommonStatus';

const CheckYourEmailOrPhone = () => {
    const searchParams = useSearchParams();

    return (
        <CommonStatus
            className="check_your_email_or_phone_container"
            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
            imageAlt=""
            heading={searchParams.get('source_type') === 'number' ? 'Check your SMS inbox' : 'Check your email inbox'}
            subHeading={
                'You should have an invitation from Learning with Parents in your inbox. Please click on the link in the message to sign up.'
            }
            dataTest={'check-your-email-or-phone'}></CommonStatus>
    );
};

export default CheckYourEmailOrPhone;
