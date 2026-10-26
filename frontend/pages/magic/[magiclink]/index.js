import { useLazyQuery, useMutation } from '@apollo/client';
import gql from 'graphql-tag';
import { PupilParentStatus } from 'lwp-shared';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import LinkExpiredPage from '../../../components/LinkExpiredPage';
import LinkInvalidPage from '../../../components/LinkInvalidPage';
import CommonLoading from '../../../components/Shared/CommonLoading';
import { clearCookiesOnly, getCookie, getJwtDecoded, isTokenExpired, setCookies } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, MAGIC_LINK_TYPES, STATUS_CODES, TEACHER } from '../../../shared/Constant';
import {
    gotoRouteBasedOnMagicLink,
    isPwa,
    routeToPupilAward,
    routeToReadingTopic,
    routeToTopic,
    ThemeContext
} from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const getPupilInvitation = gql`
    query getPupilInvitation($parentId: String!, $pupilId: String!) {
        getPupilInvitation(parentId: $parentId, pupilId: $pupilId) {
            id
            status
            showInterstitial
        }
    }
`;

const loginWithMagicLink = gql`
    mutation redeemMagicLink($token: String!) {
        redeemMagicLink(token: $token) {
            type
            tokens {
                accessToken
                refreshToken
            }
            pupilId
            pupilTopicId
        }
    }
`;

const MagicView = () => {
    const { callSnackbar, token } = useContext(ThemeContext);
    const { query, push, replace } = useRouter();
    const [showLinkInvalidPage, setShowLinkInvalidPage] = useState(false);
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState(false);
    const [magicLinkType, setMagicLinkType] = useState(null);
    const [impactReportSchoolId, setImpactReportSchoolId] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [loginWithMagicLinkMutation] = useMutation(loginWithMagicLink);
    const [getPupilInvitationQuery, { data }] = useLazyQuery(getPupilInvitation, { fetchPolicy: 'network-only' });

    const callPupilInvitationQuery = (parentId, pupilId, pupilTopicId, magicLinkType, accessToken) => {
        setRouteData({
            parentId: parentId ? parentId : null,
            pupilId: pupilId ? pupilId : null,
            pupilTopicId: pupilTopicId ? pupilTopicId : null,
            magicLinkType
        });

        getPupilInvitationQuery({
            variables: {
                parentId: parentId,
                pupilId: pupilId
            },
            context: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            },
            fetchPolicy: 'network-only' // please don't try and cache new invite details
        });
    };

    const fetchDataFromMagicLinkAndRedirect = async () => {
        if (query?.magiclink) {
            const { magiclink } = query;

            try {
                const result = await loginWithMagicLinkMutation({
                    variables: {
                        token: magiclink,
                        isPwa: isPwa()
                    },
                    fetchPolicy: 'no-cache' // please don't try and cache login details
                });

                if (!result?.data?.redeemMagicLink) return;

                const { type, tokens, pupilId, pupilTopicId } = result.data.redeemMagicLink;

                switch (type) {
                    case MAGIC_LINK_TYPES.INVITATION:
                        clearCookiesOnly();
                        push(query?.v ? `/signup/${magiclink}?v=${query?.v}` : `/signup/${magiclink}`);
                        break;

                    case MAGIC_LINK_TYPES.REJECT_INVITATION:
                        clearCookiesOnly();
                        push(`/reject-invitation/${magiclink}`);
                        break;

                    case MAGIC_LINK_TYPES.RESETPASSWORD:
                        clearCookiesOnly();
                        push(`/reset-password/${magiclink}`);
                        break;

                    case MAGIC_LINK_TYPES.TOPICACCESS:
                        accessProcedure(
                            tokens?.accessToken,
                            tokens?.refreshToken,
                            MAGIC_LINK_TYPES.TOPICACCESS,
                            () => routeToTopic(pupilTopicId, push),
                            pupilId,
                            pupilTopicId
                        );
                        break;

                    case MAGIC_LINK_TYPES.TROPHY:
                        accessProcedure(
                            tokens?.accessToken,
                            tokens?.refreshToken,
                            MAGIC_LINK_TYPES.TROPHY,
                            () => routeToPupilAward(pupilId, push),
                            pupilId,
                            pupilTopicId
                        );
                        break;

                    case MAGIC_LINK_TYPES.SCHOOL_IMPACT_REPORT:
                        push(`/impact-report/${magiclink}`);
                        break;

                    case MAGIC_LINK_TYPES.READING:
                        accessProcedure(
                            tokens?.accessToken,
                            tokens?.refreshToken,
                            MAGIC_LINK_TYPES.READING,
                            () => routeToReadingTopic(pupilId, push),
                            pupilId,
                            pupilTopicId
                        );
                        break;
                }
            } catch (error) {
                const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                if (statusCode === STATUS_CODES.EXPIRED_MAGIC_LINK) {
                    setMagicLinkType(error?.graphQLErrors?.[0]?.extensions?.exception?.response?.magicLinkType);
                    setImpactReportSchoolId(error?.graphQLErrors?.[0]?.extensions?.exception?.response?.schoolId);
                    setShowLinkExpiredPage(true);
                } else if (statusCode === STATUS_CODES.INVALID_MAGIC_LINK) {
                    setShowLinkInvalidPage(true);
                } else {
                    callSnackbar(error, 'error');
                    push('/');
                }
            }
        }
    };

    useEffect(() => {
        fetchDataFromMagicLinkAndRedirect();
    }, [query]);

    useEffect(() => {
        if (data && routeData) {
            if (data?.getPupilInvitation?.status === PupilParentStatus.REJECTED) {
                clearCookiesOnly();
                replace({
                    pathname: '/child-rejected'
                });
            } else if (data?.getPupilInvitation?.status === PupilParentStatus.INVITED || data?.getPupilInvitation?.showInterstitial) {
                // TOPIC ACCESS CODE ADDITION
                replace({
                    pathname: `/welcome/${data?.getPupilInvitation?.id}`,
                    query: {
                        magicLink: query?.magiclink
                    }
                });
            } else {
                gotoRouteBasedOnMagicLink(push, routeData?.magicLinkType, routeData?.pupilTopicId, routeData?.pupilId);
            }
        }
    }, [data, routeData]);

    const handleConditionTwo = (access_token, refresh_token) => {
        console.log('CONDITION 2');
        // CONDITION 2: If the user is logged in and doesn't have access to the topic ID related to the magic link, the logout mutation is executed (and the page is reloaded if necessary to execute step 3)
        clearCookiesOnly(); // logout
        setCookies(access_token, refresh_token); // login
    };

    const accessProcedure = (access_token, refresh_token, magicLinkType, routeTo, pupilId, pupilTopicId) => {
        let decodedToken = getJwtDecoded(access_token);
        const oldJwt = getCookie(ACCESS_TOKEN_COOKIE);

        if (oldJwt) {
            let decodedOldToken = getJwtDecoded(oldJwt);

            if (isTokenExpired(decodedOldToken.exp)) {
                clearCookiesOnly();
                routeTo(decodedOldToken, push);
            } else {
                // Re-log-in if the user is different.
                // Re-log-in the same user iff the new userTrustLevel is greater than or the same as the old one.
                if (decodedToken.sub !== decodedOldToken.sub || decodedOldToken.userTrustLevel <= decodedToken.userTrustLevel) {
                    handleConditionTwo(access_token, refresh_token);
                }
            }
        } else {
            console.log('CONDITION 3');
            // CONDITION 3: If the user is not logged in (or has been logged out in step 2) then execute a login mutation that logs them in with a JWT that has their user ID, user type "TOPICACCESS", and the topic ID as an additional parameter; and then redirect them to /topic/[topicid]
            setCookies(access_token, refresh_token);
        }

        callPupilInvitationQuery(decodedToken?.sub, pupilId, pupilTopicId, magicLinkType, access_token);
    };

    if (showLinkExpiredPage)
        return (
            <LinkExpiredPage
                token={query?.magiclink}
                magicLinkType={magicLinkType}
                isUserLoggedIn={token?.userType === TEACHER && token?.isSchoolLeader && token?.schoolId ? token?.schoolId : null}
                schoolId={impactReportSchoolId}
            />
        );
    if (showLinkInvalidPage) return <LinkInvalidPage />;

    return <CommonLoading />;
};

MagicView.pageType = PageType.GENERAL;
MagicView.pageTitle = 'Magic link sign-in';

export default MagicView;
