/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { useApolloClient, useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext } from 'react';

import { logout, reInviteParent } from '../../../../graphQl/mutations';
import { clearCookiesOnly, getCookie } from '../../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, REFRESH_TOKEN_COOKIE } from '../../../../shared/Constant';
import { ThemeContext } from '../../../../shared/Services/handler';
import LWPButton from '../../Button/LWPButton';
import Paragraph from '../../Typography/Paragraph';
import FeedbackTickedAndReplies from './FeedbackTickedAndReplies';

interface ShowOnlyRepliesProps {
    feedback: Record<string, any>;
    viewActivity: any;
}

const ShowOnlyReplies = ({ feedback }: ShowOnlyRepliesProps) => {
    const { token, setToken, callSnackbar } = useContext(ThemeContext);
    const client = useApolloClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    const queryParams = useParams();

    const pupilId = queryParams?.child_id || queryParams?.pupil_id;
    const topicId = searchParams.get('topicId');

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        client.clearStore();
        router?.replace(`/child/${pupilId}/reading?topicId=${topicId}`);
    };

    const handleInvitedUser = (userId, source_type, source) => {
        reInviteParentMutation({ variables: { parentId: userId } });
        router?.replace({
            pathname: '/check-your-email-or-phone/invited-user',
            query: {
                source,
                source_type
            }
        });
    };

    return (
        <div>
            <div className="show_only_replies_container">
                <div className="lock_only_replies_container">
                    <div className="lock_only_replies">
                        <div className="lock_only_replies_image">
                            <img
                                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-lock.svg`}
                                alt="grey_star"
                                width={49}
                                height={49}
                            />
                        </div>
                        <br />
                        <Paragraph customClass="lock_only_replies_text" centerText>
                            {token?.status === 'ACTIVE'
                                ? 'Log in to view comments and media'
                                : 'Set up a user account to view comments and media'}
                        </Paragraph>
                        <LWPButton
                            btnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                            onClick={() =>
                                token?.status === 'ACTIVE'
                                    ? handleActiveUser()
                                    : handleInvitedUser(token?.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber)
                            }
                        />
                    </div>
                </div>
            </div>
            <FeedbackTickedAndReplies feedback={feedback} />
        </div>
    );
};

export default ShowOnlyReplies;
