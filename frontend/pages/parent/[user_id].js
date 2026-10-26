import { gql } from '@apollo/client';
import { PupilParentStatus } from 'lwp-shared';

import Child from '../../components/Parent/index/index';
import { getPupilInvitationsForChild } from '../../graphQl/queries';
import { getApolloClient } from '../../lib/apolloClientConfig';
import { setCookieShimFromContext } from '../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE } from '../../shared/Constant';
import { getForbiddenRedirect } from '../../shared/Services/handler';
import { PageType } from '../../types/enums/PageType';

const getPupils = gql`
    query getPupils($parentId: String!) {
        getPupils(parentId: $parentId) {
            id
            parents {
                id
                parentId
                status
                showInterstitial
            }
        }
    }
`;

export const getServerSideProps = async (context) => {
    setCookieShimFromContext(context);

    const accessToken = context.req.cookies[ACCESS_TOKEN_COOKIE];
    const { user_id } = context.query;

    if (!accessToken) {
        return {
            props: {}
        };
    }

    const client = getApolloClient();

    try {
        const { data } = await client.query({
            query: getPupils,
            variables: { parentId: user_id }
        });

        const { data: pupilInvitationData } = await client.query({
            query: getPupilInvitationsForChild,
            variables: { id: user_id }
        });

        if (pupilInvitationData?.getPupilInvitations?.length === 0 && data?.getPupils?.length === 1) {
            const pupil = data?.getPupils[0];
            const pupilParent = (pupil?.parents || []).find((pupilParent) => pupilParent.parentId === user_id);

            if (pupilParent?.id && (pupilParent?.showInterstitial || pupilParent?.status === PupilParentStatus.INVITED)) {
                return {
                    redirect: {
                        destination: `/welcome/${pupilParent.id}`,
                        permanent: false
                    }
                };
            }

            return {
                redirect: {
                    destination: `/child/${pupil?.id}`, // Specify the destination route
                    permanent: false // If true, the redirect will be cached by the browser
                }
            };
        }
    } catch (error) {
        console.error('Error fetching pupils:', error);

        const forbiddenRedirect = getForbiddenRedirect(error, context?.resolvedUrl);

        if (forbiddenRedirect?.redirect) return forbiddenRedirect;
    }

    return {
        props: {} // will be passed to the page component as props
    };
};

Child.pageType = PageType.PARENT;
Child.pageTitle = 'Parent: Children';

export default Child;
