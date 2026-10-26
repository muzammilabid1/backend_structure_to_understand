import { useRouter } from 'next/compat/router';
import React, { useEffect, useState } from 'react';

import LWPButton from '../../components/Shared/Button/LWPButton';
import CommonStatus from '../../components/Shared/CommonStatus';
import { getCookie, removeCookie } from '../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { PageType } from '../../types/enums/PageType';

const CannotLinkAccount = () => {
    const [signUpLink, setSignUpLink] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const signUpLinkCookie = getCookie('signUpLink');

        if (signUpLinkCookie) setSignUpLink(signUpLinkCookie);
    }, []);

    return (
        <div className="cannot-link-account-container">
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-oops.png`}
                imageAlt="Mathscot with hands over eyes"
                heading={'Cannot link this account'}
                subHeading={'This email address is already linked to an existing account. Please log in with your existing account.'}>
                <div className="cannot-link-account-button-container">
                    {signUpLink ? (
                        <LWPButton
                            color="inherit"
                            onClick={() => {
                                removeCookie('signUpLink');
                                router?.push(`/signup/${signUpLink}`);
                            }}
                            btnText={`Back to signup`}
                            size="large"
                        />
                    ) : null}
                    <LWPButton
                        onClick={() => {
                            removeCookie('signUpLink');
                            router?.push('/');
                        }}
                        btnText={`Log in`}
                        size="large"
                    />
                </div>
            </CommonStatus>
        </div>
    );
};

CannotLinkAccount.pageType = PageType.GENERAL;
CannotLinkAccount.pageTitle = 'Cannot link account';

export default CannotLinkAccount;
