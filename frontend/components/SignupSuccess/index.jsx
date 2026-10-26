import React from 'react';

import LWPButton from '../../components/Shared/Button/LWPButton';
import CommonStatus from '../../components/Shared/CommonStatus';
import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';

const SignupSuccess = () => {
    return (
        <div className="signup-page-container">
            <CommonStatus
                heading={'Account created'}
                subHeading={'Your account has been registered. Please hand the device back to the teacher.'}
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`}
                className="mb5 mt5"
                subHeadingClass="reject-invitation-p"
            />

            <LWPButton
                btnText={'Close window'}
                size="large"
                type="submit"
                customClass="login-btn"
                onClick={() => {
                    window.close();
                }}
            />
        </div>
    );
};

export default SignupSuccess;
