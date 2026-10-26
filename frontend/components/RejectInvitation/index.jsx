import { gql, useMutation, useQuery } from '@apollo/client';
import { UserStatus } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { setCookies } from '../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { isPwa, ThemeContext } from '../../shared/Services/handler';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import Paragraph from './../Shared/Typography/Paragraph';

// Queries

const getRejectMagicLinkForRejectInvitation = gql`
    query getRejectMagicLink($token: String!) {
        getRejectMagicLink(token: $token) {
            pupilName
        }
    }
`;

// Mutations

const rejectInviteConfirmationForRejectInvitation = gql`
    mutation rejectInviteConfirmation($token: String!) {
        rejectInviteConfirmation(token: $token)
    }
`;

const undoRejectInviteConfirmationForRejectInvitation = gql`
    mutation undoRejectInviteConfirmation($token: String!) {
        undoRejectInviteConfirmation(token: $token) {
            pupilParentId
            userStatus
        }
    }
`;

const loginWithMagicLinkForRejectInvitation = gql`
    mutation redeemMagicLink($token: String!) {
        redeemMagicLink(token: $token) {
            type
            tokens {
                accessToken
                refreshToken
            }
        }
    }
`;

const RejectInvitation = () => {
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [rejectInviteConfirmationMutation, { loading }] = useMutation(rejectInviteConfirmationForRejectInvitation);
    const [undoRejectInviteConfirmationForRejectInvitationMutation] = useMutation(undoRejectInviteConfirmationForRejectInvitation);
    const [loginWithMagicLinkForRejectInvitationMutation] = useMutation(loginWithMagicLinkForRejectInvitation);
    const {
        loading: rejectMagicLinkDataLoading,
        error,
        data: rejectMagicLinkData
    } = useQuery(getRejectMagicLinkForRejectInvitation, {
        variables: { token: queryParams?.token }
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        if (queryParams?.token) {
            rejectInviteConfirmationMutation({
                variables: {
                    token: queryParams?.token
                }
            }).catch(({ ...err }) => callSnackbar(err, 'error'));
        }
    }, [queryParams]);

    const registerWithChildHandler = async () => {
        try {
            const undoRejectInviteResponse = await undoRejectInviteConfirmationForRejectInvitationMutation({
                variables: {
                    token: queryParams?.token
                }
            });

            const undoRejectInviteData = undoRejectInviteResponse?.data?.undoRejectInviteConfirmation;

            if (!undoRejectInviteData?.pupilParentId) {
                callSnackbar(
                    {
                        message: 'Pupil parent relation not found.',
                        networkError: { statusCode: 535 }
                    },
                    'error'
                );
                router?.push('/');
            }

            if (undoRejectInviteData?.userStatus === UserStatus.ACTIVE || undoRejectInviteData?.userStatus === UserStatus.INVITED) {
                const loginWithMagicLinkResponse = await loginWithMagicLinkForRejectInvitationMutation({
                    variables: {
                        token: queryParams?.token,
                        isPwa: isPwa()
                    }
                });

                const loginWithMagicLinkData = loginWithMagicLinkResponse?.data?.redeemMagicLink;

                setCookies(loginWithMagicLinkData?.tokens?.accessToken, loginWithMagicLinkData?.tokens?.refreshToken);
                router?.push(`/welcome/${undoRejectInviteData?.pupilParentId}`);
            } else {
                router?.push(`/signup/${queryParams?.token}`);
            }
        } catch ({ ...err }) {
            callSnackbar(err, 'error');
        }
    };

    if (loading || rejectMagicLinkDataLoading) return <CommonLoading />;

    return (
        <div className="reject-invitation-container">
            <CommonStatus
                heading={'Thanks for letting us know!'}
                subHeading={'You will not be contacted for this child and the school will be notified to update their records.'}
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pupil_with_tablet_bg.png`}
                subHeadingClass="reject-invitation-p"
            />
            {rejectMagicLinkData?.getRejectMagicLink?.pupilName && (
                <div className="reject-invitation-subheading">
                    <Paragraph>
                        If you have reached this page by mistake, please{' '}
                        <span className="link-text" onClick={registerWithChildHandler}>
                            click here to continue with Learning with Parents with {rejectMagicLinkData?.getRejectMagicLink?.pupilName}
                        </span>
                    </Paragraph>
                </div>
            )}
        </div>
    );
};

export default RejectInvitation;
