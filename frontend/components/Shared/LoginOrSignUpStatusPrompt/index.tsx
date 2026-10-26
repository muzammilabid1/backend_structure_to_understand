import { useApolloClient, useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useContext } from 'react';

import { logout, reInviteParent } from '../../../graphQl/mutations';
import { clearCookiesOnly, getCookie } from '../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, REFRESH_TOKEN_COOKIE } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonStatus from '../CommonStatus';

interface LoginOrSignUpStatusPromptProps {
    redirectPath: string;
    className?: string;
}

const LoginOrSignUpStatusPrompt = ({ redirectPath, className }: LoginOrSignUpStatusPromptProps) => {
    const { callSnackbar, token, setToken } = useContext(ThemeContext);
    const client = useApolloClient();
    const router = useRouter();

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        client.clearStore();
        router?.replace(redirectPath);
    };

    const handleInvitedUser = () => {
        reInviteParentMutation({ variables: { parentId: token?.sub } });
        router?.replace({
            pathname: '/check-your-email-or-phone/invited-user',
            query: {
                source: token?.email || token?.phoneNumber,
                source_type: token?.email ? 'email' : 'number'
            }
        });
    };

    const handleClick = () => {
        if (token?.status === 'ACTIVE') {
            handleActiveUser();
        } else {
            handleInvitedUser();
        }
    };

    const actionLabel = token?.status === 'ACTIVE' ? 'Log in' : 'Sign up';

    return (
        <CommonStatus
            image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot.png`}
            imageAlt="Adult Mathscot"
            heading={`${actionLabel} to view full history`}
            subHeading={`Please ${token?.status === 'ACTIVE' ? 'log in to your account' : 'set up a user account'} to view the full history below.`}
            buttonText={actionLabel}
            onClick={handleClick}
            className={className}
        />
    );
};

export default LoginOrSignUpStatusPrompt;
