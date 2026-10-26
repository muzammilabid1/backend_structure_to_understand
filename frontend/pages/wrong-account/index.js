import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import React from 'react';

import LWPButton from '../../components/Shared/Button/LWPButton';
import CommonStatus from '../../components/Shared/CommonStatus';
import { MINIO_PUBLIC_PATHS, SocialLoginType } from '../../shared/Constant';
import { PageType } from '../../types/enums/PageType';

const WrongSocialAccount = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    return (
        <div className="cannot-link-account-container">
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
                imageAlt="Mathscot covering eyes"
                heading={`Wrong ${searchParams.get('social') === SocialLoginType.microsoft ? 'Microsoft' : 'Google'} account`}
                subHeading={`This ${
                    searchParams.get('social') === SocialLoginType.microsoft ? 'Microsoft' : 'Google'
                } account is not linked to the Learning with Parents account.`}>
                <div className="cannot-link-account-button-container">
                    <LWPButton
                        color="inherit"
                        onClick={() => {
                            router?.push(`/`);
                        }}
                        btnText={'Back to login'}
                        size="large"
                    />
                </div>
            </CommonStatus>
        </div>
    );
};

WrongSocialAccount.pageType = PageType.GENERAL;
WrongSocialAccount.pageTitle = 'Wrong account';

export default WrongSocialAccount;
