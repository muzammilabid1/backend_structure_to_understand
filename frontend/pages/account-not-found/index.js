import { useRouter } from 'next/compat/router';

import CommonStatus from '../../components/Shared/CommonStatus';
import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { PageType } from '../../types/enums/PageType';

const AccountNotFound = () => {
    const router = useRouter();

    return (
        <div className="account-not-found">
            <CommonStatus
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                imageAlt="Account Not Found"
                heading={`We don’t recognise this ${router?.query?.source_type === 'number' ? 'phone number' : 'email address'}`}
                subHeading={
                    router?.query?.login === 'true'
                        ? 'You will need an invitation from your school or setting to continue.'
                        : `You might need an invitation from your school or setting to continue. If you already have an account with a different email address please log in using that account. You can link this account later from the “Account details” page after you are logged in`
                }
                buttonText="Back to the login page"
                onClick={() => router?.push('/')}
            />
        </div>
    );
};

AccountNotFound.pageType = PageType.GENERAL;
AccountNotFound.pageTitle = 'Account not found';

export default AccountNotFound;
