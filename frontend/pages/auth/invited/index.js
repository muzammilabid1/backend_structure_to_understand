import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonOptionsForAccountless from '../../../components/Shared/CommonOptionsForAccountless';
import CommonStatus from '../../../components/Shared/CommonStatus';
import Paragraph from '../../../components/Shared/Typography/Paragraph';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { PageType } from '../../../types/enums/PageType';

const AccountlessEmail = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isInvited, setIsInvited] = useState(false);
    const [isEmail, setIsEmail] = useState(null);
    const [text, setText] = useState(false);

    return (
        <div className="accountless-email-container">
            <div className="accountless-email-back-btn">
                <LWPButton
                    btnText="Back to log in"
                    startIcon="navigate_before"
                    color="inherit"
                    variant="text"
                    size="medium"
                    onClick={() => router?.push('/')}
                />
            </div>
            <>
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${
                        !isEmail ? 'mathscot-thinking.png' : 'child-mathscot.png'
                    }`}
                    imageAlt="Account not found"
                    heading={`${
                        !isEmail
                            ? `This ${searchParams.get('source_type')} looks familiar`
                            : `Check your ${isEmail === 'email' ? 'email' : 'SMS'} inbox`
                    }`}
                    subHeading={
                        !isEmail ? (
                            <>
                                You have been sent an invitation at
                                <strong> {searchParams.get('source')} </strong>
                                to access Learning with Parents. Please continue using one of the options below.
                            </>
                        ) : (
                            'You should have an invitation from Learning with Parents in your inbox. Please click on the link to continue.'
                        )
                    }
                />
                {isInvited && (
                    <div className={`${text ? 'accountless-bottom-text-without-gap' : 'accountless-bottom-text'}`}>
                        <Paragraph text={`Didn’t receive the ${isEmail === 'email' ? 'email' : 'sms'}? `} />
                        <Paragraph
                            onClick={() => {
                                setText(true);
                            }}
                            text={`${text ? `Try the following:` : 'Try a different way'}`}
                            customClass={!text && 'link-text'}
                        />
                    </div>
                )}
                {(text || !isEmail) && (
                    <CommonOptionsForAccountless
                        google={false}
                        microsoft={false}
                        sms={(isEmail === 'email' || isEmail === null) && searchParams.get('hasPhone') === 'true'}
                        email={(isEmail === 'sms' || isEmail === null) && searchParams.get('hasEmail') === 'true'}
                        magicLinkToken={searchParams.get('magicLinkToken')}
                        setIsInvited={setIsInvited}
                        setIsEmail={setIsEmail}
                        setText={setText}
                    />
                )}
            </>
        </div>
    );
};

AccountlessEmail.pageType = PageType.GENERAL;
AccountlessEmail.pageTitle = 'Invitation';

export default AccountlessEmail;
